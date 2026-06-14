# Frost Arrow

An arrow that **freezes the mob it hits in place** — `NoAI`, so the target can't move, pathfind, or
attack, but still takes damage and dies normally. The freeze auto-thaws after a set time. Three
tiers by ice type. Pure datapack, vanilla 26.1.2, no mods.

It **works like a flame arrow**: the freeze is delivered by a tipped arrow's on-hit effect, so
vanilla's own collision code decides what got hit — no custom hitbox/proximity detection at all.

---

## Tiers

| Recipe | Name | Freeze |
| --- | --- | --- |
| 1 arrow + 1 `minecraft:ice` | Frost Arrow | **4s** |
| 1 arrow + 1 `minecraft:packed_ice` | Frost Arrow II | **8s** |
| 1 arrow + 1 `minecraft:blue_ice` | Frost Arrow III | **16s** |

All shapeless, yield 1.

## How it works (marker effect → NoAI → vanilla timer)

The arrow is a `tipped_arrow` whose `potion_contents` carries one **hidden marker effect**:
`minecraft:slowness`, amplifier **100**, `show_particles:false`. Nothing else relies on custom
detection:

1. **Hit.** On a direct hit, vanilla applies the arrow's effect to the struck entity — the same
   mechanism a Flame/tipped arrow uses. This is engine-level and reliable; it only fires on an
   actual hit, never a near-miss, and works on any mob height.
2. **Freeze.** Each tick, `jakarta:arrow/tick` finds any mob carrying the marker (slowness
   amplifier 100) that isn't already frozen and runs `arrow/apply_freeze` → sets `NoAI:1b`, tags it
   `mada_frozen`, joins it to the `mada_frost` team, and adds Glowing so it shows an **aqua frozen
   outline** (the team color tints the glow). (Players are excluded from `NoAI`.)
3. **Timer.** The marker effect's **duration is the freeze length** — vanilla counts it down for us.
   No scoreboard. Effects keep ticking under `NoAI`, so the timer runs even while frozen.
4. **Thaw.** When the marker expires off a `mada_frozen` mob, `arrow/tick` runs `arrow/thaw`:
   restores `NoAI:0b`, clears the Glowing + team, and removes the tag.

### The "tint" is a glowing outline

Vanilla can't recolor a mob's actual texture (that needs a resource pack). The frozen tint is a
**Glowing outline colored by a team** (`mada_frost`, color `aqua`) — the standard way to highlight a
mob a given color. Change the shade by editing the team color in `arrow/load.mcfunction` to any of
the 16 named colors (`blue`, `dark_aqua`, `white`, ...). The outline is visible through walls, which
also makes frozen mobs easy to spot.

### Duration math (the 1/8 rule)

Tipped arrows apply a potion effect at **1/8 of its stored duration**. So to freeze for 4s (80
ticks) the recipe stores `duration: 640`; packed = `1280` (8s), blue = `2560` (16s). **If in-game
timing comes out 8× off, that 1/8 rule is the knob** — scale the recipe `duration` values.

## Why this approach

Earlier versions tried to detect the hit ourselves (proximity, then a hitbox-overlap cube). Letting
the tipped arrow apply an effect hands the hit detection to vanilla, which is both simpler and more
reliable. The marker effect does double duty: the on-hit signal *and* the timer.

`NoAI` is what stops **movement and attacking at once** while leaving the mob killable — the marker
slowness (even at amplifier 100) only stops walking, not attacking, so `NoAI` is still required.

## Files

| File | Role |
| --- | --- |
| `pack/data/jakarta/recipe/frost_arrow.json` / `_packed.json` / `_blue.json` | the three tiers; output is a tipped arrow carrying the marker effect. |
| `pack/data/jakarta/function/arrow/apply_freeze.mcfunction` | `NoAI:1b` + tag + aqua glow/team on the struck mob. |
| `pack/data/jakarta/function/arrow/thaw.mcfunction` | undo: restore AI, clear glow/team, untag. |
| `pack/data/jakarta/function/arrow/load.mcfunction` | create the `mada_frost` team and set its color. |
| `pack/data/jakarta/function/arrow/tick.mcfunction` | per-tick freeze + thaw rules keyed on the marker effect. |
| `pack/data/minecraft/tags/function/load.json` | registers `arrow/load`. |

## Caveats

- **Marker effect on players** — a frost arrow that hits a *player* still applies slowness amplifier
  100 (hidden) for the duration, nearly stopping their movement; `NoAI` does nothing to players, so
  they aren't fully frozen. If undesired, exclude players from the effect or clear it from them.
- **Statue effect** — `NoAI` mobs don't head-track or idle-animate while held. Intentional.
- **Direct hit only** — vanilla applies the effect on contact, so near-misses do nothing.
- **`NoAI` removes gravity** — a mob frozen mid-air (e.g. a phantom) hangs until thaw.
- **Killing a frozen mob** is clean — no leftover state.

## Test without grinding the recipe

```
give @s minecraft:tipped_arrow[potion_contents={custom_color:10079487,custom_effects:[{id:"minecraft:slowness",amplifier:100,duration:640,show_particles:false}]},custom_name={text:"Frost Arrow",color:"aqua",italic:false},tooltip_display={hidden_components:["minecraft:potion_contents"]}] 16
```

Shoot a mob — it should lock in place (no attacking), be freely killable, and unfreeze after ~4s if
left alive. Bump `duration` to 1280 / 2560 for the packed / blue tiers.
