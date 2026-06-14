# Charged Bomb Arrow

An arrow that detonates on contact with the strength of a **charged creeper** — blast power **6**
(block damage, **no fire**). A stronger sibling of the [Bomb Arrow](bomb_arrow.md) (power 2).
Crafted from **1 copper ingot + 1 gunpowder + 1 arrow**. Pure datapack, vanilla 26.1.2, no mods.

---

## Goal

| Property | Value |
| --- | --- |
| Blast power | **6** — a charged creeper (normal creeper 3, TNT 4, bomb arrow's creeper 2) |
| Fire | **no** — creepers don't ignite blocks |
| Block damage | yes — craters terrain (gated by `mobGriefing`) |
| Recipe | shapeless: 1 `minecraft:copper_ingot` + 1 `minecraft:gunpowder` + 1 `minecraft:arrow` → 1 charged bomb arrow |
| Acquisition | the recipe only |

## Why a powered creeper

A creeper explodes at `ExplosionRadius × (powered ? 2 : 1)`; the default radius is 3, so a
**powered** creeper detonates at **6** — double TNT's 4, and triple the plain Bomb Arrow's 2.
Summoning a primed powered creeper is the exact charged-creeper explosion:

```
summon minecraft:creeper ~ ~ ~ {powered:1b,ignited:1b,Fuse:0,ExplosionRadius:3}
```

`Fuse:0` + `ignited:1b` make it blow within a tick with **no collision needed**. `powered:1b` is
what doubles the radius — leave `ExplosionRadius` at its default 3, or the powered flag would stack
on top of a custom value.

## How it works (mark → detect → blast)

1. **Mark.** The shapeless recipe stamps `custom_data {charged_bomb:true}` and a gold name/orange
   tint on the output `tipped_arrow`. The marker rides the fired `minecraft:arrow` entity's `item` NBT.
2. **Detect.** `jakarta:arrow/tick` (already in the `minecraft:tick` tag) runs the same two
   detectors as the bomb/lightning arrows: a landed arrow (`inGround:1b`), and a ~2-block proximity
   fuse for absorbed direct hits. The shooter is tagged via **`on origin`** (a projectile's spawner;
   `on owner` is a tamed pet's owner and would leave the shooter untagged → muzzle detonation).
3. **Blast.** `jakarta:arrow/charged_bomb` summons the primed powered creeper, then removes the arrow.

## Ammo / item behavior

Output is `minecraft:tipped_arrow` so Infinity consumes it natively (no custom ammo accounting),
with a gold name and orange tint and the "No Effect" line suppressed via `tooltip_display`. See the
[Bomb Arrow](bomb_arrow.md) doc for the full rationale on the tipped-arrow approach.

## Files

| File | Role |
| --- | --- |
| `pack/data/jakarta/recipe/charged_bomb_arrow.json` | shapeless copper + gunpowder + arrow; output carries the marker. |
| `pack/data/jakarta/function/arrow/charged_bomb.mcfunction` | summon the powered creeper, remove the arrow. |
| `pack/data/jakarta/function/arrow/tick.mcfunction` | the two detector lines (shared per-tick scan). |

## Caveats

- **`mobGriefing`** gates the crater; the power-6 *entity* damage applies regardless.
- **No fire** — faithful to a charged creeper. If you want fire too, swap the summon for a fireball
  with `ExplosionPower:6`.
- **Proximity fuse** means passing within ~2 blocks of a non-shooter mob detonates early — inherent
  to the shared contact-fuse approach.

## Test without grinding the recipe

```
give @s minecraft:tipped_arrow[custom_data={charged_bomb:true},custom_name={text:"Charged Bomb Arrow",color:"gold",italic:false},potion_contents={custom_color:16744192},tooltip_display={hidden_components:["minecraft:potion_contents"]}] 16
```

Shoot a block or mob — it should crater hard (charged-creeper sized) with no fire. Then craft it for
real (copper ingot + gunpowder + arrow) to confirm the recipe stamps the marker.
