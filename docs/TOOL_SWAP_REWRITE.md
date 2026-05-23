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

### 3.1 Gate predicate

`data/madagascar/function/gate/tool_swap_silk_pickaxe.mcfunction`:

```mcfunction
execute as @s if data entity @s EnderItems[{Slot:0b}].components."minecraft:container"[{item:{id:"minecraft:netherite_pickaxe",components:{"minecraft:enchantments":{levels:{"minecraft:silk_touch":1}}}}}] run function madagascar:tool_swap/silk_pickaxe
```

(One line in the actual `.mcfunction` file.)

Predicate detail: container-component entries are `{slot:<int>, item:{id, count, components}}`. The predicate matches the nested `item:` against id + enchantment component. Partial-match on components is supported — `levels:{"minecraft:silk_touch":1}` requires that key with that value, but other enchantments on the same item don't fail the match.

### 3.2 Function body

`data/madagascar/function/tool_swap/silk_pickaxe.mcfunction`:

```mcfunction
# 0. Clean storage
data remove storage minecraft:madagascar inbound
data remove storage minecraft:madagascar outbound
data remove storage minecraft:madagascar slot
data remove storage minecraft:madagascar hand_entry
data remove storage minecraft:madagascar gear_entry

# 1. Snapshot the existing silk pickaxe entry from the gear shulker (about to be removed — no duplication)
data modify storage minecraft:madagascar inbound set from entity @s EnderItems[{Slot:0b}].components."minecraft:container"[{item:{id:"minecraft:netherite_pickaxe",components:{"minecraft:enchantments":{levels:{"minecraft:silk_touch":1}}}}}]
# inbound = {slot:<int>, item:{id, count, components}}  ← damage/lore/repair_cost preserved
data modify storage minecraft:madagascar slot set from storage minecraft:madagascar inbound.slot

# 2. Snapshot the player's current hand item (about to be removed — no duplication)
data modify storage minecraft:madagascar outbound set from entity @s Inventory[{Slot:2b}]
# outbound = {Slot:2b, id, count, components}

# 3. Remove both items from their live positions — now only storage holds them
data remove entity @s EnderItems[{Slot:0b}].components."minecraft:container"[{item:{id:"minecraft:netherite_pickaxe",components:{"minecraft:enchantments":{levels:{"minecraft:silk_touch":1}}}}}]
data remove entity @s Inventory[{Slot:2b}]

# 4. Reshape inbound.item → Inventory entry (add Slot:2b), append to player
data modify storage minecraft:madagascar hand_entry set from storage minecraft:madagascar inbound.item
data modify storage minecraft:madagascar hand_entry.Slot set value 2b
data modify entity @s Inventory append from storage minecraft:madagascar hand_entry

# 5. Reshape outbound → container entry (drop Slot, nest under item:, attach saved slot), append to gear shulker
data remove storage minecraft:madagascar outbound.Slot
data modify storage minecraft:madagascar gear_entry.item set from storage minecraft:madagascar outbound
data modify storage minecraft:madagascar gear_entry.slot set from storage minecraft:madagascar slot
data modify entity @s EnderItems[{Slot:0b}].components."minecraft:container" append from storage minecraft:madagascar gear_entry

# 6. Cleanup
data remove storage minecraft:madagascar inbound
data remove storage minecraft:madagascar outbound
data remove storage minecraft:madagascar slot
data remove storage minecraft:madagascar hand_entry
data remove storage minecraft:madagascar gear_entry
```

### 3.3 Why this satisfies the constraints

| Constraint | How it's met |
| --- | --- |
| No item spawning | Step 4's `Inventory append` copies the snapshot we took in step 1 (the exact item compound the shulker held). No `give` or `item replace … with` anywhere. |
| No duplication | Steps 3 happens *between* the snapshot reads and the appends. At the instant of removal, both items live only in storage; the appends then re-place them in their new homes. |
| Component fidelity | `data modify … set from …` copies the full source compound. `components` (with damage, lore, repair_cost, custom_name, anti-cheat tags, …) rides along untouched. |

### 3.4 Edge cases

| Case | Spike behaviour | Mitigation |
| --- | --- | --- |
| Player hand is empty (`Inventory[{Slot:2b}]` missing) | Step 2 stores nothing → `outbound` undefined → step 5 appends a malformed gear entry. | Gate the swap body on `execute if data entity @s Inventory[{Slot:2b}]` before running the move, or branch into "just take the silk pickaxe, leave gear slot empty" path. |
| Multiple silk-touch netherite pickaxes in the gear shulker | Predicate matches the first; only that one is moved. | Acceptable — pick first. |
| Enderchest[0] is not a shulker, or no silk pickaxe inside | Gate predicate doesn't resolve; `execute if data` never fires. | Already correct — silent no-op. |
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

1. Rewrite `createItem` / `createItemGate` in `app/swapper_tools.js` to emit Option D shapes. Helpers worth introducing:
   - `containerPredicate(id, enchantment, level)` → SNBT predicate matching `{item:{id, components:{"minecraft:enchantments":{levels:{<id>:<lvl>}}}}}` (or `{item:{id}}` for unenchanted entries like `shears`, `flint_and_steel`).
   - `enderContainerPath()` → `entity @s EnderItems[{Slot:0b}].components."minecraft:container"`.
   - `playerHandPath(slot)` → `entity @s Inventory[{Slot:<slot>b}]`.
2. Drop the now-dead scratch-block plumbing: `Command.createShulker`, `Command.clearBlock` (if nothing else uses them), and the `coordinate.shulker.gear` / `coordinate.shulker.item` entries from `data/config.json` (if nothing else uses them — check first).
3. Re-export to `.temp/`, diff one swap against §3.2 to confirm parity.
4. Smoke-test one entry (`silk_pickaxe`) against a real 26.1 world — passing means the other nine pass too (identical predicate shape; only enchantment id varies).

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
