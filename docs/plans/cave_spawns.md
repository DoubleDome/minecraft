# Plan: Custom caves spawns — Ravagers + Sniffers

**Status:** Proposed (2026-06-21) — not implemented.

## Goal

Make **ravagers** (hostile) and **sniffers** (passive) appear naturally in the
**`madagascar:caves`** dimension only, as part of its ambient mob population.

## Why a function (not biome spawn lists)

- Neither mob has a natural spawn in vanilla: **ravagers** spawn only in raids,
  **sniffers** only hatch from eggs (suspicious sand/gravel). So there's no biome
  `spawners` entry to lean on, and adding one would require custom biomes.
- The caves dimension reuses the **`minecraft:overworld` multi-noise biome preset**,
  so any biome-level edit would affect every overworld-preset dimension — it can't be
  scoped to caves without forking biomes (heavy, needs a restart).
- A datapack function scoped with `execute in madagascar:caves …` is naturally
  per-dimension, fully tunable (rate/cap/conditions), and **reloads live** (no restart).

Contrast: **slimes already spawn** in caves for free (overworld biomes list slime;
slime-chunk rule fires below y40). No custom spawner needed for them.

## Mechanic

New function group `jakarta:cave_spawns/…`, driven by a self-rescheduling loop so it
costs nothing outside its tick:

```mcfunction
# cave_spawns/load   (registered on the #minecraft:load tag)
schedule function jakarta:cave_spawns/run 100t replace   # ~every 5s; "replace" avoids stacking on /reload

# cave_spawns/run
execute in madagascar:caves as @a[gamemode=!spectator,gamemode=!creative] at @s run function jakarta:cave_spawns/ravager
execute in madagascar:caves as @a[gamemode=!spectator,gamemode=!creative] at @s run function jakarta:cave_spawns/sniffer
schedule function jakarta:cave_spawns/run 100t replace
```

Per-player attempt (run as the player, at the player):

1. **Cap check** — skip if too many already nearby, e.g.
   `execute if entity @e[type=minecraft:ravager,distance=..80,limit=3] run return fail`.
2. **Chance gate** — `random value 1..100`, proceed only under a threshold.
3. **Pick a spot** — random horizontal direction + distance, then find a valid floor:
   - random yaw via `random value`, then a macro `$execute rotated $(yaw) 0 positioned ^ ^ ^$(dist)` to project a point ~20–44 blocks out in a random direction.
   - scan downward for a **solid floor with 2 air above** (and, for ravagers, low light); abort if none — never spawn inside stone.
4. **Summon** — `summon minecraft:ravager` / `minecraft:sniffer` at the found spot.

Sniffers reuse the same skeleton but as a passive mob: **no darkness requirement**,
own cap, and they don't need to be far from the player.

## Defaults (knobs)

| Knob | Ravager | Sniffer |
| --- | --- | --- |
| Frequency | ~ chance every ~10 s per player | same loop |
| Cap (per ~80 blocks of a player) | 3 | 3 |
| Light requirement | dark only (like vanilla hostiles) | any light |
| Spawn distance ring | ~20–44 blocks | ~20–44 blocks |

All scoped to `madagascar:caves` via `execute in`. Tunable without a restart.

## Files (to create)

- `pack/data/jakarta/function/cave_spawns/load.mcfunction` — arm the schedule.
- `pack/data/jakarta/function/cave_spawns/run.mcfunction` — the loop body + reschedule.
- `pack/data/jakarta/function/cave_spawns/ravager.mcfunction` — ravager attempt.
- `pack/data/jakarta/function/cave_spawns/sniffer.mcfunction` — sniffer attempt.
- `pack/data/jakarta/function/cave_spawns/spot.mcfunction` (+ macro) — shared spot-find.
- Add `jakarta:cave_spawns/load` to `pack/data/minecraft/tags/function/load.json`.

(Static functions fit the existing `arrow/`, `horn/`, `fireball/` gadget pattern. Could
instead be generated from an `app/cave_spawns.js` module if it needs config-driven knobs.)

## Build / deploy / verify

1. `node index.js live` — deploy to the live pack.
2. `/reload` in-game (functions reload live — **no restart**).
3. In caves: confirm ravagers appear in dark open areas and sniffers in the open, both
   capped, and that neither spawns inside walls. Tune rate/cap and redeploy.

## Open questions

- Final frequency/cap once playtested (ravagers are dangerous; sniffers can clutter).
- Should sniffers be capped globally (they're a novelty) vs per-player?
- Performance: the cap + low frequency keep it cheap; confirm no lag with several players.
- Do these count against / interact with the vanilla mob cap (they're `summon`ed, so they
  bypass the natural-spawn cap — the per-player cap check is what bounds them).
