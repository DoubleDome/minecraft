# Recall Fruit

A consumable that warps you to your **personal spawn point** — "a chorus fruit, but back to your
spawn instead of random." Vanilla 26.1.2, no mods.

---

## Goal

| Property | Value |
| --- | --- |
| Item | `minecraft:popped_chorus_fruit` made consumable (eat ~1.6s), named "Recall Fruit", purple glint |
| On eat | teleport to the player's personal spawn (bed / respawn anchor), cross-dimension aware |
| No spawn set | refund the fruit + a "sleep in a bed first" message |
| Recipe | shapeless `chorus_fruit` + `ender_pearl` → 1 Recall Fruit |
| Consumed | yes — eating removes one (the `consumable` component) |

## Why `popped_chorus_fruit` (not chorus fruit)

Detection uses the `minecraft.used:minecraft.popped_chorus_fruit` stat. `popped_chorus_fruit` is
**not consumable in vanilla**, so that stat fires *only* for our item — no false positives. Basing
it on real `chorus_fruit` would be ambiguous (every chorus fruit shares the stat) **and** the
vanilla random teleport would fight ours. The `minecraft:consumable` component (1.21.2+) is what
makes the popped fruit eatable; it has no `food`, so it's always edible and restores nothing.

## How it works (eat → detect → warp)

1. **Eat.** The recipe stamps `consumable` + `custom_data:{recall:true}` + name/glint. Eating it
   consumes one and increments the `madagascar.recall` objective.
2. **Detect.** `recall/tick` runs `recall/go` on any player whose `madagascar.recall` ticked, then
   resets the score.
3. **Warp.** `recall/go` checks for a personal spawn; if present, `recall/warp` plays the departure
   effect, reads the spawn, teleports, and plays the arrival effect. No spawn → refund + message.

## Reading the spawn (26.x layout)

The old flat `SpawnX/SpawnY/SpawnZ` player NBT is **gone** in 26.x — the personal respawn point is a
compound under **`respawn`** (verified from `ServerPlayer$RespawnConfig` in the jar):

```
respawn: { pos: [I; x, y, z], dimension: "minecraft:overworld", angle: 0.0f, forced: 0b }
```

`recall/warp` copies `respawn.pos[0..2]` and `respawn.dimension` into storage and the macro
`recall/teleport` runs `execute in <dim> run tp @s <x>.5 <y> <z>.5` (block-centered, cross-dim).

## Files (all static under `pack/`)

| File | Role |
| --- | --- |
| `pack/data/madagascar/recipe/recall_fruit.json` | shapeless chorus_fruit + ender_pearl → Recall Fruit |
| `pack/data/madagascar/function/recall/tick.mcfunction` | detect the `used` score, run go, reset |
| `pack/data/madagascar/function/recall/go.mcfunction` | spawn set? warp : refund + message |
| `pack/data/madagascar/function/recall/warp.mcfunction` | effects + read `respawn` + teleport |
| `pack/data/madagascar/function/recall/teleport.mcfunction` | **macro:** `execute in $(dim) run tp …` |
| `pack/data/madagascar/function/util/load.mcfunction` | **edit:** adds the `madagascar.recall` used objective |
| `pack/data/minecraft/tags/function/tick.json` | **edit:** registers `recall/tick` |

No new dynamic registry, so `/reload` is enough (no restart needed, unlike enchantments).

## Verify in-game (things I couldn't test from here)

- The `minecraft:consumable` component schema and that `used:popped_chorus_fruit` fires on eat.
- The `respawn.pos` format is an int array (`[I; x, y, z]`). Confirm with
  `data get entity @s respawn` after sleeping in a bed; if `pos` is a compound, change
  `respawn.pos[0]` → `respawn.pos.x` etc. in `recall/warp`.

## Caveats & tuning

- **Block-centered tp** (`+0.5`); add `respawn.angle` to also restore facing if wanted.
- **No world-spawn fallback** — if a player never set a bed/anchor, it refunds rather than sending
  them to world spawn (world spawn lives in `level.dat`, which commands can't read). Add a hardcoded
  fallback coord in `recall/go` if you want one.
- **Cooldown:** none. Add a `minecraft:use_cooldown` component to the recipe result to rate-limit.

## Deploy & test

```
node index.js live
/reload
```
```
give @s minecraft:popped_chorus_fruit[minecraft:consumable={consume_seconds:1.6f,animation:"eat",sound:"minecraft:entity.generic.eat",has_consume_particles:true},minecraft:custom_data={recall:true},minecraft:item_name={text:"Recall Fruit",color:"light_purple"},minecraft:enchantment_glint_override=true] 4
```
Set a bed spawn, wander off, then hold-right-click to eat — you should warp back with portal FX.
