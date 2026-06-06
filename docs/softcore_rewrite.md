# Softcore Mode Re-enable Plan (Minecraft 26.1)

The Madagascar softcore mode (`app/softcore.js` + `pack/data/madagascar/loot_table/get_player_head.json` + scoreboard objectives in `data/objectives.json`) is mostly intact on 26.1 — the loot tables and most of the wrapper are valid. Three specific spots in `app/softcore.js` still reference pre-1.20.5 item NBT and the deleted shulker-box loot override; once those are patched the whole mode lights up again.

This is a paper plan. Nothing implemented yet.

---

## 1. What the mode does (today, when working)

The book gate has three softcore buttons (`softcore/start`, `softcore/toggle`, `softcore/stop`). Lifecycle:

**Start** (`softcore/start`)
- Clear inventory, clear XP, reset recipes and advancements.
- Zero out every scoreboard objective tied to stats and killers.
- Capture the player's current `Pos` into three start-position scores (`madagascar.start.x/y/z`).
- Add the `softcore` tag and force survival.

**Per tick** (`tick.mcfunction`, gated on `@p[tag=softcore]`)
- `gate/softcore_gamemode_check` → if the player switched out of survival, force them back and tellraw "You're stuck in SOFTCORE!".
- `gate/softcore_death_check` → if the player's deathCount went up AND their health objective is > 0 (i.e. a death already happened and they've respawned), trigger `softcore/stop`.

**Stop** (`softcore/stop`) — runs on death
- Clear inventory, tellraw "You DIED!".
- Increment the softcore death counter.
- Calculate playtime from ticks → hours/minutes/seconds.
- Aggregate per-mode distance stats (walk + sprint + crouch + climb + horse → land; swim + boat + surface + underwater → sea; flight + fall → air), converted from cm to m and km.
- Read `LastDeathLocation.pos[0..2]` into a storage list (for the marker entity to position itself later).
- Capture the death dimension by string-matching `LastDeathLocation.dimension` against each configured dimension; store both as a string (for the marker dimension hop) and as an integer score (for the loot-table conditions to pick the right "Death Dimension:" lore line).
- Run `softcore/player_head` → mints a customised player head and drops it in the player's inventory.
- Run `gate/softcore_dimension` → summons a death-marker entity in the dimension the player died in.
- Clear XP, remove the `softcore` tag.

**Player head minting** (`softcore/player_head`)
- Today: place a scratch shulker, `loot replace block container.0 loot madagascar:get_player_head`, read `Items[{Slot:0b}].tag.SkullOwner.Name` into storage, `loot give @s mine <pos> minecraft:air` to drop the head into the player, clear the block.
- The custom loot table `get_player_head` is the meat of the system: it returns a `player_head` filled to look like the player (`fill_player_head` with `entity: "this"`), enchanted with vanishing curse so it can't be kept across deaths, with **~80 `set_lore` operations** building a lore stack — start/death coordinates, death dimension, killed-by line (one per of ~50 mob types, conditioned on the matching killer score), totems used, nights slept, playtime, points, mob kills, damage dealt/taken, and distance travelled in each medium.

**Death marker placement** (`softcore/prepare_marker` → `softcore/place_marker`)
- Summon a `minecraft:marker` entity tagged `death_marker`, then run `place_marker` as that marker.
- Move the marker to the stored `LastDeathLocation.pos` triple.
- Roll a random rotation 0-9 via `loot spawn ~ ~ ~ loot madagascar:get_random_number` (the loot table emits between 0 and 9 stone items; the resulting count is the rotation).
- `setblock ~ ~ ~ minecraft:player_head[rotation=N] replace` (one execute-if line per rotation).
- `setblock ~ ~1 ~ minecraft:light[level=5] replace` for visibility.
- Set the placed head's **`ExtraType`** field from the stored player name (pre-1.20.5 path — see §2).
- Kill the marker.

End result: the player has a souvenir head with all their lifetime stats in lore, plus a permanent head-block memorial at their death location with a light above it.

---

## 2. What broke on 26.1

Three tightly-scoped issues — all in `app/softcore.js`, none in the loot tables themselves.

### 2.1 `tag.SkullOwner.Name` (line 211)

```js
command.append(`data modify storage ${config.namespace} ${config.storage.player_name} set from block ${config.coordinate.shulker.item} Items[{Slot:0b}].tag.SkullOwner.Name`);
```

`tag.SkullOwner` is pre-1.20.5 NBT. The 1.20.5 component rewrite moved skull profile data to `minecraft:profile`. Modern path on a player_head item:

```
components."minecraft:profile".name
```

The loot table's `minecraft:fill_player_head` function already writes to the modern component, so the data is there — only the read path is wrong.

### 2.2 `loot give @s mine <pos> <air>` (line 212)

```js
command.append(`loot give @s mine ${config.coordinate.shulker.item} ${config.item.air}`);
```

This relied on the custom `pack/data/minecraft/loot_tables/blocks/shulker_box.json` override that made shulker_box mining drop its contents instead of the box. That override was deleted in `e14a0d3` (Phase 0 of the tool-swap rewrite). Without it, this line drops a shulker_box (with `components."minecraft:container"` populated) into the player's inventory, not the player head.

### 2.3 `ExtraType` on placed block (line 145)

```js
command.append(`execute at @s run data modify block ~ ~${config.offset.player_head} ~ ExtraType set from storage ${config.namespace} ${config.storage.player_name}`);
```

`ExtraType` is a 1.7-era field name for player_head block entities (it stored the username string). Modern player_head block entities have a `profile` field — same shape as the item's `minecraft:profile` component (`{name: <string>, id: <uuid>, properties: <list>}`). To set just the owner-name on a fresh setblock:

```
data modify block ~ ~ ~ profile set value {name:""}
data modify block ~ ~ ~ profile.name set from storage <ns> player_name
```

(The first line initialises `profile` as a compound so the second line can write into it. Setting `profile.name` directly on a block whose `profile` is absent doesn't auto-create the parent compound — at least, not reliably.)

### Not broken — confirmed clean

- `get_player_head.json` — uses modern `fill_player_head`, `set_enchantments` (which now targets the `minecraft:enchantments` component), `set_lore` (text components are still text components), and `entity_scores` conditions. No `SkullOwner` / `tag:{` references.
- `get_random_number.json` — basic empty loot table, valid in 26.1.
- The scoreboard / stats / position / distance / time machinery — all standard scoreboard arithmetic and entity-NBT reads (`Pos[N]`, `LastDeathLocation.pos[N]`, `LastDeathLocation.dimension`). Unchanged in 26.1.
- `setblock minecraft:player_head[rotation=N]` and `setblock minecraft:light[level=5]` — still valid block state syntax.
- `summon minecraft:marker ~ ~ ~ {Tags:["death_marker"]}` — entity NBT writes still use this form.
- `loot spawn ~ ~ ~ loot <table>` and `loot replace block <pos> container.0 loot <table>` — valid syntax.

### Pre-existing bug (out of scope but worth flagging)

`pack/data/madagascar/item_modifier/get_softcore_stats.json` references the objective name `madagascar.softcore_deaths` (underscore), but `objectives.json` defines it as `madagascar.softcore.deaths` (dot). This item modifier file isn't referenced by any of the JS generators, so it's dead in the pack today. The name mismatch would prevent it from working if it were ever wired up.

---

## 3. The rewrite

Two file-level changes in `app/softcore.js`. Plus an obvious simplification: the player-head minting no longer needs a scratch shulker block — modern `loot replace entity` puts the loot directly into the player's inventory.

### 3.1 `createPlayerhead` — drop the scratch block

Replace the whole function with this (~3 lines instead of ~7):

```js
createPlayerhead() {
    const command = new Command();
    // Generate the lored player head straight into the player's inventory.
    // The loot table's fill_player_head + 80-odd set_lore lines fire with
    // @s as "this", so the head looks like the dead player and its lore
    // pulls from their scores.
    command.append(`loot replace entity @s hotbar.0 loot ${config.function.get_player_head}`);
    // Capture the head's owner name for later — the death-marker block
    // placement (place_marker) needs it to populate the block's profile.
    command.append(`data modify storage ${config.namespace} ${config.storage.player_name} set from entity @s Inventory[{Slot:0b}].components."minecraft:profile".name`);
    // Open the book gate so the player has a way to restart softcore.
    command.append(`execute as @s run function ${config.package}:gate/book`);
    return command.export();
}
```

What changes:
- No `createShulker` / `clearBlock` calls — no scratch block lifecycle.
- No `loot replace block container.0` indirection — `loot replace entity @s hotbar.0` invokes the table with the player as `this`, drops the result in slot 0.
- The owner-name read uses the modern component path on the player's inventory entry (since the head is in their hotbar 0 = `Inventory[{Slot:0b}]`).

Side effect to verify in smoke test: hotbar slot 0 (the leftmost) gets overwritten. Since `createStop` already called `clearInventory()` before this, the slot is empty going in — but if `clearInventory` somehow doesn't fire (or is reordered), the player would lose whatever was there. Worth confirming in a real death event.

### 3.2 `createPlaceMarker` — replace `ExtraType` with `profile`

Replace line 145:

```js
// Old
command.append(`execute at @s run data modify block ~ ~${config.offset.player_head} ~ ExtraType set from storage ${config.namespace} ${config.storage.player_name}`);
```

with:

```js
// Initialise the profile compound on the freshly setblock'd head so the
// next line has a parent to write into.
command.append(`execute at @s run data modify block ~ ~${config.offset.player_head} ~ profile set value {name:""}`);
command.append(`execute at @s run data modify block ~ ~${config.offset.player_head} ~ profile.name set from storage ${config.namespace} ${config.storage.player_name}`);
```

The setblock that places the head (lines 142) sets a fresh player_head with no profile. The two-line pattern: create the compound, then write the owner's name into it. Minecraft resolves the rest (UUID, skin textures) by looking up that name.

### 3.3 Nothing else changes

Everything else in `app/softcore.js` is already modern: the tick gates, the start/stop/pause/resume/toggle, the dimension capture, the marker summoning, the loot-spawn rotation roll, the time / distance arithmetic. The death-check using `scores={…deaths=1..,…health=1..}` and the gamemode-check on `gamemode=!survival` are all 26.1-valid.

The book buttons in `data/book.json` already point at `madagascar:gate/softcore_start` / `madagascar:gate/softcore_stop` / `madagascar:softcore/toggle` — those route to functions that still exist with the same names.

---

## 4. Open questions / verification before merging

These need to be checked in a live 26.1 server before declaring the rewrite done — paper analysis can't catch all of them.

1. **`loot replace entity @s hotbar.0 loot <table>` context for `this`.** I'm assuming the loot table's `fill_player_head` with `entity: "this"` resolves to `@s` (the player who just died) when invoked via `loot replace entity`. If `this` instead resolves to the entity being given the loot (also @s), great — same result. If neither, we'd need to use `loot give @s loot <table>` or fall back to the scratch-block approach.
2. **`data modify block … profile.name` without prior `profile` set.** The plan does a `set value {name:""}` first to be safe. Worth testing whether `profile.name set from …` alone works — if it does, drop the initialiser line.
3. **`Inventory[{Slot:0b}].components."minecraft:profile".name` read timing.** The `loot replace entity` and the subsequent `data modify storage … set from entity @s Inventory[…]` execute in the same function. Player NBT writes from `loot replace` should be visible within the same function tick, but worth confirming the storage read actually gets the new head's profile and not a stale value.
4. **Death sequence interaction with respawn screen.** `softcore/stop` runs when `deaths=1.. AND health=1..` — which means the player has died, hit the respawn screen, and clicked respawn. At that moment their location is the spawn point, not the death point. The death location is preserved via `LastDeathLocation` on the player's NBT, so the marker placement still works. Worth verifying nothing in `loot replace entity` cares about the player being "alive at death location" specifically.
5. **`coordinate.shulker.item` retirement.** Once this rewrite lands, no module references `coordinate.shulker.item`. The field can be deleted from `data/config.json`. Same for `util/command.js:createShulker` / `clearBlock` if `swapper_shulker.js` and `inventory.js` are also rewritten (see `shulker_swap_rewrite.md`); until then, leave them.

---

## 5. Effort

Small. Two functions in one file (`app/softcore.js`), totalling ~6 lines changed. No new files, no new data, no folder moves. The whole reason it broke is concentrated in three specific lines.

Out of scope (separate work, if you want them):

- The `get_softcore_stats.json` typo (§2). One-character fix but I have no evidence anyone is calling it.
- Re-enabling the god page (which has "Softcore" controls — the green/gold/red dots that call `gate/softcore_start` / `softcore/toggle` / `softcore/stop`). The dots are already in `book.json` and the gates work fine; the god page just isn't being emitted to the book yet. Tracked in `shulker_swap_rewrite.md` §4 as "Out of scope".
