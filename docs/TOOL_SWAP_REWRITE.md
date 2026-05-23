# Tool-Swap Rewrite Plan (Minecraft 26.1)

The Madagascar tool swap mechanism (`app/swapper_tools.js` → `data/madagascar/function/tool_swap/*.mcfunction`) was written for the pre-1.20.5 item NBT model and **silently no-ops on 26.1**. Three independent layers of rot:

1. **Item NBT format** — every `data` path, every `execute if data` predicate, and every storage shape uses the pre-1.20.5 `tag.BlockEntityTag.Items` / `Enchantments:[{id,lvl}]` / `Count:Nb` model that 1.20.5 replaced with item components.
2. **The custom shulker loot table** at `pack/data/minecraft/loot_tables/blocks/shulker_box.json` (the one that made the original "place a shulker, mine it to drop contents" trick work) sits at the wrong folder name for 26.1 — Java Edition 1.21 renamed `loot_tables` → `loot_table` (and several other plurals to singulars). Minecraft never loads the file, so vanilla's "drop the shulker box as an item" loot table runs instead.
3. **The function bodies use `loot mine … minecraft:air`** assuming that override is in effect. Without it, that line drops a shulker_box into the player's hand instead of the tool inside.

The rewrite drops the entire scratch-block + loot-override scheme. Modern `data modify` can move item compounds directly between `EnderItems[{Slot:0b}].components."minecraft:container"` and the player's `Inventory`, so we just *move* the items — no scratch space, no loot table, no `loot mine` trick. Item identity, durability, custom name, repair cost, and every other component are preserved verbatim because we're copying NBT compounds wholesale.

---

## 1. Constraints

- **No item spawning.** The point of the system is to swap a tool the player crafted with whatever's in their hand. `/item replace … with …` is rejected — it conjures a fresh max-durability copy.
- **No duplication.** Each swap is a true move: silk pickaxe leaves the gear shulker, hand item enters it; hand item leaves the player, silk pickaxe enters their hand.
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

Java Edition 1.21 renamed several plural datapack folders to singular. The Madagascar pack has these offenders under `pack/`:

| Current path | Required path |
| --- | --- |
| `pack/data/minecraft/loot_tables/blocks/shulker_box.json` | **delete** (no longer needed — see §3) |
| `pack/data/madagascar/loot_tables/get_*.json` (3 files) | `pack/data/madagascar/loot_table/get_*.json` |
| `pack/data/madagascar/advancements/temp.json_` | `pack/data/madagascar/advancement/temp.json_` (disabled — kept for posterity) |
| `pack/data/madagascar/item_modifiers/get_hardcore_stats.json` | `pack/data/madagascar/item_modifier/get_hardcore_stats.json` |

(`tags/function/` is already singular. `dimension/` and `dimension_type/` were always singular.)

### 2.3 Lines in the current output that are dead

Pasting `silk_pickaxe.mcfunction` for reference:

```
data modify block ~ 250 ~ Items prepend from entity @s EnderItems[{Slot:0b}]
data modify storage minecraft:madagascar inbound set from block ~ 250 ~ Items[{Slot:0b}].tag.BlockEntityTag.Items[{id:"minecraft:netherite_pickaxe", tag:{Enchantments:[{id:"minecraft:silk_touch", lvl:1s}]}}]
...
loot replace entity @s hotbar.2 1 mine ~ 251 ~ minecraft:air
```

`.tag.BlockEntityTag` and `tag:{Enchantments:…}` are non-existent paths in 26.1; predicates fail; the gate file's `execute if data … tag.BlockEntityTag.Items[{…}]` never fires. Even if it did, `loot mine … minecraft:air` would drop a shulker_box (with the items still inside as a container component) rather than the silk pickaxe.

---

## 3. Spike — silk_pickaxe end-to-end (Option D, direct move)

No scratch blocks. No loot-table override. No `loot mine` trick. Just `data modify` moves between live entity paths.

The gear shulker is identified by an invisible `minecraft:custom_data` marker — it can live in **any** ender chest slot, the slot is resolved at runtime via function macros. The player marks their gear shulker once with a one-time setup command (see §3.5).

### 3.1 Files emitted per tool

Each enchanted tool needs two files; the macro swap body is generated **once** and shared across all tools.

- `data/madagascar/function/gate/tool_swap_silk_pickaxe.mcfunction` — predicate-gated entry point. One line.
- `data/madagascar/function/tool_swap/silk_pickaxe.mcfunction` — resolves the runtime args (which ender slot, which container slot) and calls the shared macro.

Shared, emitted once:

- `data/madagascar/function/tool_swap/_swap.mcfunction` — the macro body that does the actual move.

### 3.2 Gate predicate

`gate/tool_swap_silk_pickaxe.mcfunction`:

```mcfunction
execute as @s if data entity @s EnderItems[{components:{"minecraft:custom_data":{gear:1b},"minecraft:container":[{item:{id:"minecraft:netherite_pickaxe",components:{"minecraft:enchantments":{levels:{"minecraft:silk_touch":1}}}}}]}}] run function madagascar:tool_swap/silk_pickaxe
```

(One line in the actual `.mcfunction` file. Predicate requires both the `custom_data:{gear:1b}` marker AND a silk-touch netherite pickaxe to be present in the same container — so the button no-ops cleanly if the gear shulker isn't marked, isn't in the ender chest, or doesn't contain the target.)

### 3.3 Per-tool resolver

`tool_swap/silk_pickaxe.mcfunction`:

```mcfunction
data remove storage minecraft:madagascar args

# Extract the gear shulker's Slot from EnderItems (byte). Required for the macro substitution.
data modify storage minecraft:madagascar args.shulker_slot set from entity @s EnderItems[{components:{"minecraft:custom_data":{gear:1b},"minecraft:container":[{item:{id:"minecraft:netherite_pickaxe",components:{"minecraft:enchantments":{levels:{"minecraft:silk_touch":1}}}}}]}}].Slot

# Extract the silk pickaxe's slot inside the gear shulker's container (int).
data modify storage minecraft:madagascar args.tool_slot set from entity @s EnderItems[{components:{"minecraft:custom_data":{gear:1b}}}].components."minecraft:container"[{item:{id:"minecraft:netherite_pickaxe",components:{"minecraft:enchantments":{levels:{"minecraft:silk_touch":1}}}}}].slot

# Invoke the shared macro swap body with these two values.
function madagascar:tool_swap/_swap with storage minecraft:madagascar args
```

Three lines of plumbing per tool. The whole resolver exists just to get the two slot values into storage, then hand off to the macro.

### 3.4 Shared macro body

`tool_swap/_swap.mcfunction` (lines starting with `$` are macro substitutions):

```mcfunction
# Snapshot the target item from the gear shulker's container (about to be removed).
$data modify storage minecraft:madagascar inbound set from entity @s EnderItems[{Slot:$(shulker_slot)}].components."minecraft:container"[{slot:$(tool_slot)}]
# inbound = {slot:<int>, item:{id, count, components}}

# Snapshot the player's hand item.
data modify storage minecraft:madagascar outbound set from entity @s Inventory[{Slot:2b}]
# outbound = {Slot:2b, id, count, components}

# Remove both items from live positions (now only storage holds them — no duplication).
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

Macro substitution detail: `$(shulker_slot)` substitutes a stringified SNBT value. Because we extracted `args.shulker_slot` from `EnderItems[…].Slot`, the stored value carries the byte type — its SNBT representation is `0b`, `1b`, etc., so the substitution naturally produces `Slot:0b` without us appending a `b` after `$(…)`. Similarly `args.tool_slot` was extracted from the lowercase int `slot` field of the container component, so it substitutes to a bare integer.

### 3.5 One-time setup the player runs once

Mark the gear shulker with the invisible identifier:

```mcfunction
/data modify entity @s EnderItems[{Slot:<your_slot>b}].components."minecraft:custom_data" set value {gear:1b}
```

After this, the shulker can be moved anywhere in the ender chest and the buttons still find it. No re-marking needed.

### 3.6 Why this satisfies the constraints

| Constraint | How it's met |
| --- | --- |
| No item spawning | Steps `inbound`/`outbound` snapshot existing items; the appends write those snapshots back. No `give` or `item replace … with` anywhere. |
| No duplication | The remove step happens between snapshot reads and appends. At the moment of removal, both items live only in storage; appends then re-place them in their new homes. |
| Component fidelity | `data modify … set from …` copies the full compound. `components` (damage, lore, repair_cost, custom_name, anti-cheat tags, …) rides along untouched. |
| Gear shulker not stuck in slot 0 | Macro substitutes the matched `Slot` at runtime — gear shulker can be anywhere in the ender chest. |
| Won't mismatch a random shulker | Predicate requires `custom_data:{gear:1b}` marker, which the player set once on their gear shulker only. Plain shulkers are ignored. |

### 3.7 Edge cases

| Case | Spike behaviour | Mitigation |
| --- | --- | --- |
| Gear shulker missing (player hasn't set the marker yet) | Gate predicate fails to match; `execute if data` never fires. Button silently does nothing. | Already correct — fail-closed. |
| Multiple marked shulkers in the ender chest | First matching is used (data path predicates always pick the first match). | Acceptable — keep one gear shulker. |
| Gear shulker has the marker but no silk pickaxe | Predicate fails because both conditions are AND'd. | Already correct. |
| Player hand is empty | `outbound` ends up undefined; the gear entry's `item:` would be empty, producing a malformed entry. | Gate the resolver on `execute if data entity @s Inventory[{Slot:2b}]` (or branch into "just take the tool" path). |
| Hand item has its own enchantments / durability / custom name | Full `components` compound is copied, so everything survives. | None. |

### 3.5 Verification status

**Not executed against a live 26.1 server** — there is no Minecraft instance on this machine. The spike is:

1. Syntactically correct against wiki-documented 1.21+ NBT paths.
2. Conceptually a true move: every item lives in storage between removal and re-placement, never in two places at once.
3. Structurally sound — every path is documented to exist; predicate shape matches container-component entries.

Smoke-test in a real 26.1 world before propagating to the other nine entries:

1. Drop the spike's two files into a test datapack.
2. Place a shulker_box in your enderchest slot 0; put a silk-touch netherite pickaxe inside it at some slot.
3. Hold any tool in hotbar slot 3 (Slot:2b).
4. Run `function madagascar:gate/tool_swap_silk_pickaxe`.
5. Expect: hand now holds the (same!) silk pickaxe — same durability, same name, same lore. Gear shulker now contains the previous hand item in the slot the silk pickaxe came from. Neither item changed in any way other than position.

---

## 4. Migration plan

Four phases. Each is small, testable, and committable on its own.

### Phase 0 — Datapack folder renames + retire the shulker loot override

1. `git rm pack/data/minecraft/loot_tables/blocks/shulker_box.json` — the override is no longer used and we'd rather not affect vanilla shulker-box mining behaviour at all.
2. `git rm -r pack/data/minecraft/loot_tables` if it becomes empty.
3. `git mv pack/data/madagascar/loot_tables pack/data/madagascar/loot_table`
4. `git mv pack/data/madagascar/advancements pack/data/madagascar/advancement`
5. `git mv pack/data/madagascar/item_modifiers pack/data/madagascar/item_modifier`
6. Spot-check `app/`, `data/`, `util/`: `grep -r "loot_tables\|advancements\|item_modifiers" .` Update any string references (paths, config keys).
7. Regenerate to `.temp/` and confirm the pack clone landed everything under the new singular names.

### Phase A — `swapper_tools.js` rewrite

1. Rewrite `createItem` / `createItemGate` in `app/swapper_tools.js` to emit the three-file pattern from §3:
   - **Gate** (`gate/tool_swap_<filename>.mcfunction`) — one `execute if data … run function …` line with the marker + tool predicate.
   - **Resolver** (`tool_swap/<filename>.mcfunction`) — three lines that pull `shulker_slot` and `tool_slot` into storage and call `_swap`.
   - **Shared macro body** (`tool_swap/_swap.mcfunction`) — emitted once by the generator, not per-tool.
2. Helpers worth introducing in `app/swapper_tools.js`:
   - `containerItemPredicate(id, enchantment, level)` → SNBT fragment matching `{item:{id, components:{"minecraft:enchantments":{levels:{<id>:<lvl>}}}}}` (or just `{item:{id}}` for unenchanted entries — `shears`, `flint_and_steel`).
   - `gearShulkerPredicate(itemPredicate)` → combines the `custom_data:{gear:1b}` marker with the tool predicate for the gate.
3. Drop the now-dead scratch-block plumbing:
   - `Command.createShulker` and `Command.clearBlock` from `util/command.js` (if nothing else uses them — check first).
   - `coordinate.shulker.gear` and `coordinate.shulker.item` from `data/config.json` (same check).
4. Re-export to `.temp/`, diff one swap against §3.2–3.4 to confirm parity.
5. Smoke-test one entry (`silk_pickaxe`) against a real 26.1 world — passing means the other nine pass too (identical shape, only the item predicate varies). Before the test, mark the gear shulker once with the §3.5 setup command.

### Phase B — Verify swapper_shulker.js and inventory.js

Both modules manipulate the same shulker/inventory NBT primitives and almost certainly have the same rot.

1. Read `app/swapper_shulker.js` and `app/inventory.js`.
2. Generate to `.temp/`, grep the output for `tag:{`, `tag.BlockEntityTag`, `Enchantments:[`, `Count:`, `minecraft:air` near `mine`. Any hit = broken.
3. Rewrite each module using the same predicate/path helpers from Phase A. The conceptual flow likely ports cleanly — all three modules are doing variants of "move item between player storage locations".
4. Smoke-test in a real 26.1 world.

### Phase C — Re-enable the god page in the book

Once the gate predicates fire on 26.1, wire the god page back into `app/book.js:generatePages`. The function already exists at `app/book.js:54` with the right button bindings; it needs the same rewrite the magic page got (use `generateBlock()` string-concat instead of the broken `Page` class). The page data is in `book.json` under `pickaxe` / `axe` / `shovel` / `hoe` / `shears` / `flint` / `inventory`.

---

## 5. Open questions

1. **Phase B scope:** Do shulker / inventory swap rewrites belong in the same series of commits, or should they wait until tool-swap is verified working in a real world?
2. **Hand-empty handling:** Should swapping into an empty hand work (just place the silk pickaxe, leave gear slot empty), or should the gate refuse to fire unless `Inventory[{Slot:2b}]` exists?
3. **Smoke-test access:** Is there a 26.1 test world you can drop the spike into, or do we keep iterating on paper until the broader migration lands?

---

## Appendix A — Rejected alternatives

### A.1 `/item replace` ("just spawn a fresh tool")

One-liner per swap, but conjures a fresh max-durability copy of the tool. **Rejected** — duplicates / spawns items the player didn't craft, which is the opposite of the system's intent (a quality-of-life swap, not a cheat).

### A.2 The original scratch-block + loot-override trick

Place two shulker boxes, write the gear shulker into one of them, manipulate via block-entity NBT, mine with a custom-loot-tabled shulker to drop contents into the player. **Rejected** — Option D achieves the same result with:

- one fewer infrastructure file (no loot-table override),
- two fewer scratch blocks placed and destroyed per swap,
- half as many `.mcfunction` lines,
- no dependency on `loot mine` semantics (which are fragile across MC versions),
- the same component-fidelity guarantees.

The trick was clever in 2018 because in-place modification of player NBT was less reliable. Modern `data modify` makes the scratch space unnecessary.
