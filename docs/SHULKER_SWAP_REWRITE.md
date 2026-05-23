# Shulker & Inventory Swap Rewrite Plan (Minecraft 26.1)

`app/swapper_shulker.js` and `app/inventory.js` are still on the pre-1.20.5 NBT model. They were left untouched during the tool-swap rewrite — see [`TOOL_SWAP_REWRITE.md`](./TOOL_SWAP_REWRITE.md) for the worked example and the format-diff reference.

**Status update (post-`848d16c`):** `swapper_shulker.js` got a *partial* hand-applied fix for **parse errors only**. The legacy `tag:{display:{Name:…}}` predicate was triggering `Expected whitespace to end one argument` and blocking the pack from loading; the predicates have been migrated to `components:{"minecraft:custom_name":…}` and `clear @s …[custom_name='…']` so the pack now loads. **Runtime behaviour is still broken** — the function still uses `loot replace entity @s enderchest.<slot> 1 mine <scratch> minecraft:air`, which after the shulker_box loot override was deleted drops the *scratch* shulker_box (now with `components.container` populated) into the ender slot, not the labelled shulker the player was holding. So clicking "Export Shulkers" no longer crashes the pack — it just produces the wrong outcome. The redesign in this doc is still needed.

`inventory.js` has not had any fix applied; its broken `loot give @s mine` line is still there.

---

## 1. What broke

### 1.1 `app/swapper_shulker.js`

Purpose: when the player holds a labelled coloured shulker box (e.g. blue `Gear Box`), one click in the magic book moves it to a designated ender-chest slot. `data/shulkers.json` defines 24 labelled kits (gear, emergency, construction, basics, …) each tied to a colour + ender slot.

What's broken on 26.1:

- ~~**Inventory predicate** uses legacy `tag:{display:{Name:'<json text>'}}`~~ — **fixed in `848d16c`**. Now uses `components:{"minecraft:custom_name":"<json>"}`. Caveat: still has the same "match the anvil-normalised text component shape verbatim" fragility.
- ~~**`clear @s minecraft:<color>_shulker_box{display:{Name:…}} 1`** legacy curly-brace component syntax~~ — **fixed in `848d16c`**. Now `clear @s minecraft:<color>_shulker_box[custom_name='<json>'] 1`.
- **Scratch-block + `loot mine … minecraft:air`** path (still broken). Relies on the deleted `pack/data/minecraft/loot_table/blocks/shulker_box.json` override. Vanilla shulker-box loot now drops the box (with `components.container` populated) instead of contents, so a click puts the scratch shulker into the ender slot instead of the labelled one the player was holding.

### 1.2 `app/inventory.js`

Purpose: save / restore the player's survival "kit" when toggling into and out of creative mode. Items in `data/items.json` are captured on export; the snapshot lives in a shulker block at world position `(-17 60 -1)`; import puts the contents back in the player's inventory.

Broken on 26.1:

- **`loot give @s mine ${holder} ${air}`** on import — same deleted-override problem. Drops a shulker_box (with `components.container`) into the player's inventory instead of the individual kit items.

Mostly OK on 26.1:

- The export's `data modify storage … Inventory[{id:"…"}]` predicate-match still works.
- The slot reindex (`storage[N] merge value {Slot:Nb}`) still works.
- `clearInventory`, the gates' block predicates, the `gamemode` calls — all still valid.

So `inventory.js` is one broken line away from working in place, but the world-block design is awkward overhead for what is conceptually a snapshot. A storage-snapshot rewrite is shorter and removes the dependency on a fixed world coordinate.

---

## 2. Design choices

Before implementation, two real calls need answers. Both came up during the deferred Phase B; reproduced here so the next attempt doesn't have to re-derive them.

### 2.1 How `swapper_shulker` identifies the labelled shulker

| Approach | Predicate shape | One-time setup per shulker | Reliability |
| --- | --- | --- | --- |
| **`custom_name` text component** | `{components:{"minecraft:custom_name":'{"text":"<label>","italic":false}'}}` | Anvil-rename to `<label>` | Works as long as anvil normalises consistently; fragile if the name is ever set via `/data` or `/give` with a different shape |
| **`custom_data` marker** | `{components:{"minecraft:custom_data":{kit:"<name>"}}}` | `/data modify entity @s EnderItems[{Slot:Nb}].components."minecraft:custom_data" set value {kit:"<name>"}` once per kit | Exact match, no normalisation. 24 setup commands |
| **Reserved colour** | `{id:"minecraft:<color>_shulker_box"}` | Use a specific colour for each kit | Trivial when ≤16 kits; doesn't scale to 24 |
| **Collapse the 24-kit design entirely** | n/a | n/a | Out of scope — kept for posterity but explicitly *not* the plan. The current design is intentional. |

The current code matches on `id + custom_name`. The closest 1:1 modern translation is the first row above. Risk-managed approach: use the anvil-normalised shape, and document that re-applying labels via anvil is the supported setup path.

### 2.2 `inventory.js` snapshot medium

| Approach | What it costs |
| --- | --- |
| **One-line fix** | Keep the placed shulker at `(-17 60 -1)` as the snapshot medium. Replace the broken `loot give @s mine …` line with `data modify entity @s Inventory set from block ${holder} Items` — both lists have the same `{Slot:Nb, id, count, components}` shape in 26.1, so it's a straight copy. Everything else unchanged. |
| **Storage snapshot** | Move the snapshot to `storage minecraft:madagascar inventory_snapshot`. Drops `coordinate.shulker.holder` from `config.json`, ~10 lines of plumbing per function, and the dependency on a stable overworld coordinate. Storage persists with the world so the snapshot still survives logouts. The `data/items.json` filter is preserved. |
| **Storage snapshot, no filter** | As above but copy the entire `Inventory` instead of iterating known ids. Saves random survival-mode junk too. Player can `/clear` first to be selective. |

The one-line fix is the lowest-risk path if the world-block convention is something the user wants to keep visible / debuggable. The storage snapshot is cleaner code but invisible by default (only inspectable via `/data get storage`).

---

## 3. Sketch of the implementation (when work resumes)

This is what the rewrite *would* look like if the user picks "custom_name match" for §2.1 and "one-line fix" for §2.2.

### 3.1 `swapper_shulker.js` per-shulker pattern

For each kit in `shulkers.json`:

**Gate** (`gate/shulker_export.mcfunction`, all kits' gates accumulate into one file as today):

```mcfunction
execute as @s if data entity @s Inventory[{id:"minecraft:<color>_shulker_box",components:{"minecraft:custom_name":'{"text":"<label>","italic":false}'}}] run function madagascar:shulker/<name>
```

**Body** (`shulker/<name>.mcfunction`):

```mcfunction
data remove storage minecraft:madagascar inbound

# Snapshot the labelled shulker from the player's Inventory
data modify storage minecraft:madagascar inbound set from entity @s Inventory[{id:"minecraft:<color>_shulker_box",components:{"minecraft:custom_name":'{"text":"<label>","italic":false}'}}]

# Remove from Inventory
data remove entity @s Inventory[{id:"minecraft:<color>_shulker_box",components:{"minecraft:custom_name":'{"text":"<label>","italic":false}'}}]

# Re-slot for the ender chest position
data remove storage minecraft:madagascar inbound.Slot
data modify storage minecraft:madagascar inbound.Slot set value <slot>b

# Free the destination slot (overwrites whatever was there, matching original behaviour)
data remove entity @s EnderItems[{Slot:<slot>b}]

# Place the labelled shulker in its designated ender slot
data modify entity @s EnderItems append from storage minecraft:madagascar inbound

# Cleanup
data remove storage minecraft:madagascar inbound
```

About a dozen lines per kit. No scratch block, no loot mine, no `clear @s`. Direct `data modify` move.

### 3.2 `inventory.js` minimal one-line fix

In `app/inventory.js:createImport()`, replace:

```js
command.append(`execute in ${config.dimension.default} run loot give @s mine ${config.coordinate.shulker.holder} ${config.item.air}`);
```

with:

```js
command.append(`execute in ${config.dimension.default} run data modify entity @s Inventory set from block ${config.coordinate.shulker.holder} Items`);
```

Everything else in `inventory.js` stays. The export still places a shulker block at `(-17 60 -1)`, fills it via the items.json filter, wipes the player's inventory, goes creative. Import now reads the block's `Items` list directly into the player's `Inventory` and clears the block.

### 3.3 Smoke-test recipe

When work resumes:

1. Re-export to `.temp/`, diff the regenerated `gate/shulker_export.mcfunction` and `shulker/<name>.mcfunction` against §3.1.
2. In a 26.1 test world: anvil-rename a blue shulker to `Gear Box`, put it in hotbar, run `function madagascar:gate/shulker_export`. Expect it to land in ender chest slot 0.
3. In the same world: with the magic book "Export Inventory" button (or its gate function directly), confirm the player's items are saved to the holder block and the player goes creative. Then "Import Inventory" — confirm items return and the player goes survival.

---

## 4. Out of scope

Nothing currently. Both deferred items from the earlier draft have since landed in main:

- ~~`app/softcore.js` pre-1.20.5 NBT rot~~ — done in `2ccd11f` (see [`SOFTCORE_REWRITE.md`](./SOFTCORE_REWRITE.md)).
- ~~Re-enable the god page in `app/book.js`~~ — done in `0d71643`. The god page now renders the inventory section faithfully, but the four buttons it surfaces (Export Shulkers, Toggle Enderchest, Export Inventory, Import Inventory) depend on the modules covered by this doc. Toggle Enderchest works today (ender.js was audited and is already 26.1-clean); the other three no-op silently until §3's rewrite lands.
