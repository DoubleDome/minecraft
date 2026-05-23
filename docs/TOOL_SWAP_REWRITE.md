# Tool-Swap Rewrite (Minecraft 26.1)

The Madagascar tool swap mechanism (`app/swapper_tools.js` → `data/madagascar/function/tool_swap/*.mcfunction`) was written for the pre-1.20.5 item NBT model and silently no-opped on 26.1. Three independent layers of rot:

1. **Item NBT format** — every `data` path, every `execute if data` predicate, and every storage shape used the pre-1.20.5 `tag.BlockEntityTag.Items` / `Enchantments:[{id,lvl}]` / `Count:Nb` model that 1.20.5 replaced with item components.
2. **The custom shulker loot table** at `pack/data/minecraft/loot_tables/blocks/shulker_box.json` sat at the wrong folder name for 26.1 — Java Edition 1.21 renamed `loot_tables` → `loot_table` (and several other plurals to singulars). Minecraft never loaded the file, so vanilla's "drop the shulker box as an item" loot table ran instead.
3. **The function bodies used `loot mine … minecraft:air`** assuming the override was in effect. Without it, that line dropped a shulker_box into the player's hand instead of the tool inside.

The rewrite drops the entire scratch-block + loot-override scheme. Modern `data modify` moves item compounds directly between `EnderItems[…].components."minecraft:container"` and the player's `Inventory`, so items are *moved* — no scratch space, no loot table, no `loot mine` trick. Item identity, durability, custom name, repair cost, and every other component are preserved verbatim because we copy NBT compounds wholesale.

---

## 1. Constraints

- **No item spawning.** The system swaps a tool the player crafted with whatever's in their hand. `/item replace … with …` is rejected — it conjures a fresh max-durability copy.
- **No duplication.** Each swap is a true move: the silk pickaxe leaves the gear shulker, the hand item enters it; the hand item leaves the player, the silk pickaxe enters their hand.
- **Component fidelity.** Damage, lore, custom names, repair cost, and any other components survive the swap unchanged.

---

## 2. What broke

### 2.1 Item NBT format diff

| Concept | Pre-1.20.5 | 1.20.5+ / 26.1 |
| --- | --- | --- |
| Item count key | `Count:1b` (byte) | `count:1` (int, lowercase) |
| Extra item data | `tag:{...}` | `components:{...}` |
| Item enchantments | `tag:{Enchantments:[{id:"minecraft:silk_touch",lvl:1s}]}` | `components:{"minecraft:enchantments":{levels:{"minecraft:silk_touch":1}}}` |
| Shulker contents (item-form) | `tag:{BlockEntityTag:{Items:[...]}}` | `components:{"minecraft:container":[{slot:<int>,item:{...}}, ...]}` |
| Entry shape inside `components."minecraft:container"` | n/a | `{slot:<int>, item:{id, count, components}}` — lowercase int slot, item nested |
| Entry shape inside block-entity `Items` | `{Slot:<byte>, id, Count:<byte>, tag:{...}}` | `{Slot:<byte>, id, count, components}` — keeps capital-byte Slot |
| Entry shape inside player `Inventory` / `EnderItems` | `{Slot:<byte>, id, Count:<byte>, tag:{...}}` | `{Slot:<byte>, id, count, components}` |

**Key gotcha:** slot-key casing is not uniform. Entity inventories (`Inventory`, `EnderItems`) and block-entity `Items` kept `Slot:<byte>` (capital, byte). The `minecraft:container` data component uses `slot:<int>` (lowercase, int) with the item nested under `item:`. Copying between contexts requires one structural reshape, not just a key rename — this is the only "trick" left in the rewrite.

### 2.2 Datapack folder renames (1.21)

Java Edition 1.21 renamed several plural datapack folders to singular. The Madagascar pack had these offenders under `pack/`:

| Old path | New path |
| --- | --- |
| `pack/data/minecraft/loot_tables/blocks/shulker_box.json` | **deleted** (no longer needed) |
| `pack/data/madagascar/loot_tables/get_*.json` | `pack/data/madagascar/loot_table/get_*.json` |
| `pack/data/madagascar/advancements/temp.json_` | `pack/data/madagascar/advancement/temp.json_` |
| `pack/data/madagascar/item_modifiers/get_hardcore_stats.json` | `pack/data/madagascar/item_modifier/get_hardcore_stats.json` |

(`tags/function/` was already singular. `dimension/` and `dimension_type/` were always singular.)

---

## 3. Implementation

No scratch blocks. No loot-table override. No `loot mine` trick. Just `data modify` moves between live entity paths.

The gear shulker is identified by an invisible `minecraft:custom_data` marker — it can live in **any** ender chest slot; the slot is resolved at runtime via function macros. The player marks the gear shulker once with a one-time setup command (see §3.5).

### 3.1 Files emitted per tool

Each enchanted tool needs two files; the macro swap body is generated **once** and shared across all tools.

- `data/madagascar/function/gate/tool_swap_silk_pickaxe.mcfunction` — predicate-gated entry point. One line.
- `data/madagascar/function/tool_swap/silk_pickaxe.mcfunction` — resolves the runtime args (which ender slot, which container slot) and calls the shared macro.

Shared, emitted once:

- `data/madagascar/function/tool_swap/swap.mcfunction` — the macro body that does the actual move.

### 3.2 Gate predicate

`gate/tool_swap_silk_pickaxe.mcfunction`:

```mcfunction
execute as @s if data entity @s EnderItems[{components:{"minecraft:custom_data":{gear:1b},"minecraft:container":[{item:{id:"minecraft:netherite_pickaxe",components:{"minecraft:enchantments":{levels:{"minecraft:silk_touch":1}}}}}]}}] if data entity @s Inventory[{Slot:2b}] run function madagascar:tool_swap/silk_pickaxe
```

(One line in the actual `.mcfunction` file. Predicate requires the `custom_data:{gear:1b}` marker AND a silk-touch netherite pickaxe in the same container AND something in the player's hotbar slot 2 — so the button no-ops cleanly if any of those is missing, including the malformed-entry edge case from an empty hand.)

### 3.3 Per-tool resolver

`tool_swap/silk_pickaxe.mcfunction`:

```mcfunction
data remove storage minecraft:madagascar args

# Extract the gear shulker's Slot from EnderItems (byte). Required for the macro substitution.
data modify storage minecraft:madagascar args.shulker_slot set from entity @s EnderItems[{components:{"minecraft:custom_data":{gear:1b},"minecraft:container":[{item:{id:"minecraft:netherite_pickaxe",components:{"minecraft:enchantments":{levels:{"minecraft:silk_touch":1}}}}}]}}].Slot

# Extract the silk pickaxe's slot inside the gear shulker's container (int).
data modify storage minecraft:madagascar args.tool_slot set from entity @s EnderItems[{components:{"minecraft:custom_data":{gear:1b},"minecraft:container":[{item:{id:"minecraft:netherite_pickaxe",components:{"minecraft:enchantments":{levels:{"minecraft:silk_touch":1}}}}}]}}].components."minecraft:container"[{item:{id:"minecraft:netherite_pickaxe",components:{"minecraft:enchantments":{levels:{"minecraft:silk_touch":1}}}}}].slot

# Invoke the shared macro swap body with these two values.
function madagascar:tool_swap/swap with storage minecraft:madagascar args
```

Three lines of plumbing per tool. The whole resolver exists just to get the two slot values into storage, then hand off to the macro.

### 3.4 Shared macro body

`tool_swap/swap.mcfunction` (lines starting with `$` are macro substitutions):

```mcfunction
data remove storage minecraft:madagascar inbound
data remove storage minecraft:madagascar outbound
data remove storage minecraft:madagascar hand_entry
data remove storage minecraft:madagascar gear_entry

# Snapshot the target item from the gear shulker's container (about to be removed).
$data modify storage minecraft:madagascar inbound set from entity @s EnderItems[{Slot:$(shulker_slot)}].components."minecraft:container"[{slot:$(tool_slot)}]

# Snapshot the player's hand item.
data modify storage minecraft:madagascar outbound set from entity @s Inventory[{Slot:2b}]

# Remove both items from live positions — now only storage holds them.
$data remove entity @s EnderItems[{Slot:$(shulker_slot)}].components."minecraft:container"[{slot:$(tool_slot)}]
data remove entity @s Inventory[{Slot:2b}]

# Reshape inbound.item → Inventory entry (add Slot:2b), append to player.
data modify storage minecraft:madagascar hand_entry set from storage minecraft:madagascar inbound.item
data modify storage minecraft:madagascar hand_entry.Slot set value 2b
data modify entity @s Inventory append from storage minecraft:madagascar hand_entry

# Reshape outbound → container entry, append to gear shulker.
data remove storage minecraft:madagascar outbound.Slot
data modify storage minecraft:madagascar gear_entry.item set from storage minecraft:madagascar outbound
$data modify storage minecraft:madagascar gear_entry.slot set value $(tool_slot)
$data modify entity @s EnderItems[{Slot:$(shulker_slot)}].components."minecraft:container" append from storage minecraft:madagascar gear_entry

# Cleanup
data remove storage minecraft:madagascar inbound
data remove storage minecraft:madagascar outbound
data remove storage minecraft:madagascar hand_entry
data remove storage minecraft:madagascar gear_entry
data remove storage minecraft:madagascar args
```

Macro substitution detail: `$(shulker_slot)` substitutes a stringified SNBT value. Because `args.shulker_slot` was extracted from `EnderItems[…].Slot`, the stored value carries the byte type — its SNBT representation is `0b`, `1b`, etc., so the substitution naturally produces `Slot:0b` without us appending a `b` after `$(…)`. Similarly `args.tool_slot` was extracted from the lowercase int `slot` field of the container component, so it substitutes to a bare integer.

### 3.5 One-time setup the player runs once

Mark the gear shulker with the invisible identifier:

```mcfunction
/data modify entity @s EnderItems[{Slot:<your_slot>b}].components."minecraft:custom_data" set value {gear:1b}
```

After this, the shulker can be moved anywhere in the ender chest and the buttons still find it. No re-marking needed.

### 3.6 Why this satisfies the constraints

| Constraint | How it's met |
| --- | --- |
| No item spawning | `inbound`/`outbound` snapshot existing items; the appends write those snapshots back. No `give` or `item replace … with` anywhere. |
| No duplication | The remove step happens between snapshot reads and appends. At the moment of removal, both items live only in storage; appends then re-place them. |
| Component fidelity | `data modify … set from …` copies the full compound. `components` (damage, lore, repair_cost, custom_name, anti-cheat tags, …) rides along untouched. |
| Gear shulker not stuck in slot 0 | Macro substitutes the matched `Slot` at runtime — gear shulker can be anywhere in the ender chest. |
| Won't mismatch a random shulker | Predicate requires `custom_data:{gear:1b}` marker, which the player set once on their gear shulker only. Plain shulkers are ignored. |

### 3.7 Smoke-test recipe

Before relying on the swap in a live world:

1. Mark the gear shulker once with the §3.5 setup command.
2. Put a silk-touch netherite pickaxe inside the gear shulker at any slot.
3. Hold any tool in hotbar slot 3 (Slot:2b).
4. Run `function madagascar:gate/tool_swap_silk_pickaxe`.
5. Expect: hand now holds the (same!) silk pickaxe — same durability, same name, same lore. Gear shulker now contains the previous hand item in the slot the silk pickaxe came from. Neither item changed in any way other than position.

The same shape applies to all ten tool entries; only the item predicate (id and enchantment) varies.

---

## 4. What landed

Five commits, all on `main`:

- `e14a0d3` Phase 0: plural→singular folder renames + delete shulker_box loot override
- `fa3ccd8` Update plan with custom_data marker + macro slot lookup
- `d018e7f` Phase A: rewrite `app/swapper_tools.js` for 26.1

Source-file deltas:
- **`pack/pack.mcmeta`** — `pack_format` bumped 34 → 101.1 (separate commit, `eb7bc78`).
- **`pack/data/...`** — folder renames per §2.2, override deleted.
- **`app/swapper_tools.js`** — rewritten from ~50 lines of scratch-block plumbing to ~100 lines emitting the three-file pattern in §3.
- **`data/config.json`** — `coordinate.shulker.gear` removed.

Deferred to follow-up work (see separate plan docs):

- `app/swapper_shulker.js` and `app/inventory.js` — same NBT / loot-mine rot, untouched in this rewrite. See `docs/SHULKER_SWAP_REWRITE.md`.
- The book's god page — already rewired in Phase A's predecessor work (the magic page was re-enabled in `2610219`); the god page's per-tool buttons still rely on `tool_swap_*` gate names which match the new generator output.

---

## Appendix A — Rejected alternatives

### A.1 `/item replace` ("just spawn a fresh tool")

One-liner per swap, but conjures a fresh max-durability copy of the tool. **Rejected** — duplicates / spawns items the player didn't craft, which is the opposite of the system's intent (a quality-of-life swap, not a cheat).

### A.2 The original scratch-block + loot-override trick

Place two shulker boxes, write the gear shulker into one of them, manipulate via block-entity NBT, mine with a custom-loot-tabled shulker to drop contents into the player. **Rejected** — the direct-move approach achieves the same result with:

- one fewer infrastructure file (no loot-table override),
- two fewer scratch blocks placed and destroyed per swap,
- roughly half as many `.mcfunction` lines,
- no dependency on `loot mine` semantics (which are fragile across MC versions),
- the same component-fidelity guarantees.

The trick was clever in 2018 because in-place modification of player NBT was less reliable. Modern `data modify` makes the scratch space unnecessary.
