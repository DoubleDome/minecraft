# Frost Arrow

An arrow that **freezes the mob it hits in place** — `NoAI`, so the target can't move, pathfind, or
attack, but still takes damage and dies normally. The freeze auto-thaws after a set time. Three
tiers by ice type. Pure datapack, vanilla 26.1.2, no mods. Same mark → detect pattern as the
[Bomb Arrow](bomb_arrow.md), but **single-target** (the struck mob) instead of a blast.

---

## Tiers

| Recipe | Name | Freeze |
| --- | --- | --- |
| 1 arrow + 1 `minecraft:ice` | Frost Arrow | **4s** (80 ticks) |
| 1 arrow + 1 `minecraft:packed_ice` | Frost Arrow II | **8s** (160 ticks) |
| 1 arrow + 1 `minecraft:blue_ice` | Frost Arrow III | **16s** (320 ticks) |

All shapeless, yield 1. The duration is baked into the arrow's `custom_data.freeze_ticks`.

## How it works (mark → detect → freeze → thaw)

1. **Mark.** The recipe stamps `custom_data {freeze:true, freeze_ticks:N}` on a `tipped_arrow`
   (aqua name, pale-blue tint). The marker + duration ride the fired `minecraft:arrow` entity in its
   `item` NBT.
2. **Detect.** `madagascar:arrow/tick` finds a freeze-marked arrow that is **embedded in a mob** —
   the mob whose hitbox contains the arrow, via a zero-size `dx=0,dy=0,dz=0` volume selector (a true
   direct hit, not proximity, and height-independent). The shooter is excluded (tagged via
   **`on origin`**, since the arrow spawns inside the firer at launch) and `#madagascar:bomb_ignore`
   entities are skipped. On a match it runs `arrow/freeze_hit`.
3. **Freeze.** `arrow/freeze_hit` (as the arrow) copies `freeze_ticks` into storage, applies it to
   the **nearest** valid target via the `arrow/apply_freeze` macro, and consumes the arrow.
   `apply_freeze` sets `NoAI:1b`, tags the mob `mada_frozen`, and sets its `madagascar.freeze`
   countdown score.
4. **Thaw.** Each tick, `arrow/tick` decrements every `mada_frozen` mob's score; at 0 it restores
   `NoAI:0b` and removes the tag. The `madagascar.freeze` objective is created in `arrow/load`
   (registered on the `minecraft:load` tag).

## Why `NoAI` (not Slowness)

The goal is "held but harmless and killable." `NoAI` is the only single vanilla flag that stops
**movement and attacking** at once while leaving the mob damageable. Slowness only stops walking —
a slowed mob still swings at you. The trade-off: a `NoAI` mob is a **statue** (no head-tracking or
idle animation) for the duration. To keep it animated-but-harmless instead, swap `apply_freeze` for
`minecraft:movement_speed`/`attack_damage` attribute zeroing — but that needs a save/restore of the
prior values, so `NoAI` is simpler and fully reversible.

## Files

| File | Role |
| --- | --- |
| `pack/data/madagascar/recipe/frost_arrow.json` / `_packed.json` / `_blue.json` | the three tiers; output carries `{freeze, freeze_ticks}`. |
| `pack/data/madagascar/function/arrow/freeze_hit.mcfunction` | read duration, freeze nearest target, consume arrow. |
| `pack/data/madagascar/function/arrow/apply_freeze.mcfunction` | macro: `NoAI:1b` + tag + countdown on the mob. |
| `pack/data/madagascar/function/arrow/load.mcfunction` | create the `madagascar.freeze` objective. |
| `pack/data/madagascar/function/arrow/tick.mcfunction` | detector + per-tick thaw loop. |
| `pack/data/minecraft/tags/function/load.json` | adds `madagascar:arrow/load` to the load tag. |

## Caveats

- **Statue effect** — frozen mobs don't animate (see above). Intentional.
- **Direct hit only** — the arrow must actually embed in the mob (its hitbox contains the arrow), so
  near-misses don't freeze. Unlike the blast arrows' ~2-block proximity fuse, flying *past* a mob
  does nothing. If an arrow somehow overlaps two hitboxes, only the nearest mob freezes.
- **Chunk unload** — the thaw loop only runs on loaded mobs; a frozen mob in an unloaded chunk keeps
  its remaining ticks and resumes counting down when reloaded. It never thaws "early."
- **`NoAI` removes gravity** — a mob frozen mid-air (e.g. a phantom) hangs until thaw.
- **Killing a frozen mob** is clean — its score is dropped with the entity, no leftover state.

## Test without grinding the recipe

```
give @s minecraft:tipped_arrow[custom_data={freeze:true,freeze_ticks:80},custom_name={text:"Frost Arrow",color:"aqua",italic:false},potion_contents={custom_color:10079487},tooltip_display={hidden_components:["minecraft:potion_contents"]}] 16
```

Shoot a mob — it should lock in place (no attacking), be freely killable, and unfreeze after ~4s if
left alive. Bump `freeze_ticks` to 160/320 to test the packed/blue tiers.
