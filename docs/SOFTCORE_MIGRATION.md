# Softcore Rename — One-Time World Migration

The hardcore → softcore rename changed three scoreboard objective names and one player tag. The datapack's `load.mcfunction` re-creates the new objectives idempotently on reload, but it won't carry over existing values or migrate any player who's currently in the mode. Run this **once** against the live world before swapping in the new pack.

## TL;DR — use the bundled function

The whole recipe below is packaged in the datapack as `pack/data/madagascar/function/migrate_softcore.mcfunction`. After loading the new pack (or while the old one is still loaded — the function only touches scoreboard state and player tags), run:

```mcfunction
function madagascar:migrate_softcore
```

It performs steps 1–4 of the manual recipe and tellraw's `[Madagascar] Softcore migration complete.` when done. The rest of this doc is the manual breakdown — useful as reference, for diff-checking what the function does, or for rollback (see §"Rollback").

## What's changing

| Identifier | Old | New |
| --- | --- | --- |
| Scoreboard objective (death count) | `madagascar.hardcore.deaths` | `madagascar.softcore.deaths` |
| Scoreboard objective (health tracker) | `madagascar.hardcore.health` | `madagascar.softcore.health` |
| Scoreboard objective (death dimension) | `madagascar.hardcore.death_dimension` | `madagascar.softcore.death_dimension` |
| Player tag (currently in the mode) | `hardcore` | `softcore` |
| Function namespace folder | `madagascar:hardcore/*` | `madagascar:softcore/*` |
| Gate functions | `madagascar:gate/hardcore_*` | `madagascar:gate/softcore_*` |
| `load.mcfunction` sidebar | shows `madagascar.hardcore.deaths` | shows `madagascar.softcore.deaths` |

Function-path changes (the bottom three rows) are handled automatically when you load the new pack — old paths cease to exist, the book buttons in the magic page already point at the new ones because they were regenerated from the same `book.json` source.

The first four rows are world-save state and need manual migration.

## Order of operations

1. Make a **world backup** before doing anything. The migration is reversible per-command but a backup is the safety net if you skip a step.
2. With the **old** datapack still loaded, run the recipe below.
3. Disable / remove the old datapack.
4. Drop in the rebuilt pack (`node index.js` output) and `/reload`.
5. Verify (commands at the bottom).

## The recipe

Paste each block into chat or a command block. Each block is independent and idempotent — re-running won't double-count.

### 1. Create the new objectives

```mcfunction
scoreboard objectives add madagascar.softcore.deaths dummy "Softcore Deaths"
scoreboard objectives add madagascar.softcore.health health
scoreboard objectives add madagascar.softcore.death_dimension dummy
```

If `load.mcfunction` already ran in some earlier session and created these (e.g. you reloaded the new pack before doing the migration), the lines just print "Objective already exists" and continue. Harmless.

### 2. Copy historical values from the old objectives

```mcfunction
scoreboard players operation * madagascar.softcore.deaths = * madagascar.hardcore.deaths
scoreboard players operation * madagascar.softcore.death_dimension = * madagascar.hardcore.death_dimension
```

`* <objective>` is the wildcard player — covers every real player who has a score on that objective, plus internal fake-players like `#temp` and `#constants` the generator uses. One operation copies them all.

`madagascar.hardcore.health` is the auto-tracked vanilla `health` type. The new `madagascar.softcore.health` (also type `health`) will populate from each player's current HP automatically as soon as the objective exists. No copy needed.

### 3. Migrate the in-flight player tag

```mcfunction
tag @a[tag=hardcore] add softcore
tag @a[tag=hardcore] remove hardcore
```

Anyone currently tagged as in hardcore mode is now tagged softcore. Tick gates pick them up on the next tick.

### 4. Remove the old objectives

```mcfunction
scoreboard objectives remove madagascar.hardcore.deaths
scoreboard objectives remove madagascar.hardcore.health
scoreboard objectives remove madagascar.hardcore.death_dimension
```

This also clears any sidebar slot that was displaying these objectives. The new pack's load will re-set the sidebar to `madagascar.softcore.deaths`.

## Verify after `/reload` of the new pack

```mcfunction
# Confirm new objectives exist and have values
scoreboard objectives list
scoreboard players list

# Should display the softcore death counter in the sidebar
scoreboard objectives setdisplay list madagascar.softcore.deaths

# Should fire the softcore start function (i.e. there's a function at the new path)
function madagascar:gate/softcore_start
# (then immediately stop it if you don't want to actually be in softcore)
function madagascar:softcore/stop
```

## What doesn't migrate (intentionally)

- **Placed player_head memorial blocks from past deaths.** Each one has its own lore baked in at the time of minting — the lore references `madagascar.hardcore.deaths` etc. After step 4 those score references resolve to nothing and render as blank. If you have a museum of past death-heads you want to keep visually intact, **skip step 4** and leave the old objectives in place as inert dummies. The new mode won't touch them.
- **Future-style heads under the new name** — heads minted *after* the rename will reference `madagascar.softcore.deaths` and render correctly.

## Rollback (if it goes sideways)

The migration is reversible per step until you remove the old objectives. To undo before step 4:

```mcfunction
tag @a[tag=softcore] add hardcore
tag @a[tag=softcore] remove softcore
scoreboard players operation * madagascar.hardcore.deaths = * madagascar.softcore.deaths
scoreboard players operation * madagascar.hardcore.death_dimension = * madagascar.softcore.death_dimension
scoreboard objectives remove madagascar.softcore.deaths
scoreboard objectives remove madagascar.softcore.health
scoreboard objectives remove madagascar.softcore.death_dimension
```

After step 4, the only way back is the world backup from step 1 of the order-of-operations section.
