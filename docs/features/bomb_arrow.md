# Bomb Arrow

An arrow that detonates on contact: blast power **2**, **breaks blocks**, **no fire**.
Crafted from **1 arrow + 1 gunpowder**. Pure datapack, vanilla 26.1.2, no mods.

---

## Goal

| Property | Value |
| --- | --- |
| Blast power | 2 (creeper ExplosionRadius; a normal creeper is 3, TNT is 4) |
| Fire | **no** — a creeper blast starts no fires |
| Block damage | yes — craters terrain |
| Recipe | shapeless: 1 `minecraft:arrow` + 1 `minecraft:gunpowder` → 1 bomb arrow |
| Acquisition | the recipe only (no command/loot needed) |

## How it works (mark → detect → detonate)

Vanilla has no "bomb arrow" item, so it's built in three parts:

1. **Mark.** The crafting recipe stamps the output arrow with a `custom_data` marker
   (`{bomb:true}`) and a dark-red `item_name`. When fired, a `minecraft:arrow` entity stores
   the item it was shot from in its `item` NBT — so the marker rides along on the entity.
2. **Detect.** Every tick, `jakarta:arrow/tick` scans for arrows that have just landed
   (`inGround:1b`) **and** carry the marker, and runs the detonation on each.
3. **Detonate.** `jakarta:arrow/bomb` summons a primed creeper with `ExplosionRadius:2`
   at the arrow, then removes the arrow.

The tick scan is wired in by adding `jakarta:arrow/tick` to the `minecraft:tick` function
tag (alongside the generated `jakarta:tick`).

## Why a creeper (not TNT or a fireball)

We want **block damage with a tunable radius and NO fire**, detonating reliably on contact:

| Source | Radius | Block damage | Fire | Reliable instant detonation |
| --- | --- | --- | --- | --- |
| `minecraft:tnt` (`{fuse:0}`) | fixed 4 (now tunable via `explosion_power`) | yes | **no** | yes |
| **`minecraft:creeper`** (`{ExplosionRadius:2,Fuse:0,ignited:1b}`) | **tunable** | **yes** | **no** | **yes** |
| `minecraft:fireball` (`{ExplosionPower:2}`) | tunable | yes | **yes** | on contact only |

The creeper gives a tunable radius and no fire, and `Fuse:0`+`ignited:1b` make it blow within a
tick with **no collision needed** (so no `Motion` nudge). TNT also works but its radius was fixed
at 4 until `explosion_power` was added; the creeper's `ExplosionRadius` has always been tunable.

> **History:** this arrow originally used a ghast **fireball** specifically to add fire on top of
> the blast. Fire was later removed, so it switched to a creeper. To bring fire back, swap the
> summon line in `bomb.mcfunction` for `summon minecraft:fireball ~ ~ ~ {ExplosionPower:2,Motion:[0.0,-0.1,0.0]}`.

## 26.1.2 NBT field names (verified from the server jar)

Entity NBT casing is inconsistent in 26.x — some fields migrated to snake_case (TNT), most
base/entity fields stayed CamelCase. These were read directly out of
`versions/26.1.2/server-26.1.2.jar`:

| Entity | Field | Notes |
| --- | --- | --- |
| `minecraft:creeper` | `ExplosionRadius` (int), `Fuse` (short), `ignited` (byte), `powered` (byte) | mixed casing. We set `ExplosionRadius:2,Fuse:0,ignited:1b`. |
| `minecraft:arrow` (AbstractArrow) | `inGround` (byte), `item` (compound) | land flag + stored pickup item |
| base Entity | `Motion` (list), `Tags` (list) | CamelCase (unchanged) |
| `minecraft:tnt` (PrimedTnt) | `fuse`, `explosion_power`, `block_state` | snake_case (not used here, for reference) |
| `minecraft:fireball` (LargeFireball) | `ExplosionPower` (int) | CamelCase. Default 1. Used by the old fire variant. |

If a future update changes `ExplosionRadius`, confirm with:
`summon minecraft:creeper ~ ~ ~ {powered:1b}` then `data get entity @e[type=creeper,limit=1]`.

## Files

All static under `pack/` (cloned verbatim into the output by `creator.clone`), so no generator
code changes are needed:

| File | Role |
| --- | --- |
| `pack/data/jakarta/recipe/bomb_arrow.json` | The arrow + gunpowder shapeless recipe; output carries the `custom_data` marker. |
| `pack/data/jakarta/function/arrow/tick.mcfunction` | Per-tick: find landed marked arrows, call explode. |
| `pack/data/jakarta/function/arrow/bomb.mcfunction` | Summon the creeper blast, remove the arrow. |
| `pack/data/minecraft/tags/function/tick.json` | Adds `jakarta:arrow/tick` to the tick loop. |

## Ammo consumption — why it's a tipped arrow

The output is `minecraft:tipped_arrow`, not `minecraft:arrow`, **specifically so an Infinity bow
consumes it**. Vanilla Infinity only spares the plain `Items.ARROW`; tipped and spectral arrows
are different items and are *always* consumed (this is why potion arrows still deplete with
Infinity). Riding on that vanilla rule means **no custom ammo accounting** — every bow,
Infinity included, deducts one per shot natively.

The `potion_contents` component is set to only a `custom_color` (dark red `11141120`) with **no
potion and no effects**, so it's purely a consumable tinted arrow — it does no potion damage,
just the creeper blast.

Because `potion_contents` carries no effects, the tipped-arrow tooltip would otherwise render
the greyed-out **"No Effect"** line. We suppress it with `minecraft:tooltip_display`
(`hidden_components:["minecraft:potion_contents"]`) — the component that replaced
`hide_additional_tooltip` in 1.21.5. The red tint still applies; only the effect line is hidden.

The name uses `minecraft:custom_name` (not `item_name`): a potion-type item with no real potion
generates the name "Uncraftable Tipped Arrow", and that generated name overrides `item_name`.
`custom_name` is the highest-priority name and always wins; `italic:false` keeps it from
rendering in the italic "renamed" style.

> An earlier version used plain `minecraft:arrow` plus a `pickup`-state hack to re-charge free
> Infinity/creative shots. The tipped-arrow approach is simpler and fully vanilla — that hack
> was removed.

## Caveats & tuning

- **`mobGriefing` must be `true` (the default).** A creeper's block destruction is gated by
  `mobGriefing`. With it `false`, the arrow still damages entities but won't break blocks. (No
  fire either way — a creeper blast never ignites.)
- **Direct entity hits** are handled by a second detector. A non-piercing arrow that strikes a
  mob/player is *absorbed* (becomes a stuck arrow) and never sets `inGround`, so block hits would
  boom but direct hits wouldn't. Fix (same trick as the frost arrow): the tipped bomb arrow carries
  a hidden marker effect (`weakness` amp 100) that vanilla's own arrow collision applies to whatever
  it strikes; `arrow/tick` detonates any entity carrying that marker via `arrow/bomb_hit`, which
  summons the blast and clears the marker so it fires exactly once and never kills the victim
  outright. Reliable on any entity, players included — no proximity/tunneling guesswork, and it can't
  trigger at the muzzle. (An earlier version used a ~2-block proximity fuse, which missed fast arrows
  and detonated early near bystanders.)
- **Result components** (the marker on the crafted arrow) rely on crafting-recipe `result`
  supporting `components` (1.21.2+). To confirm it stuck: craft one and run
  `data get entity @s SelectedItem` while holding it — look for `minecraft:custom_data`.
- **Tuning knobs:** blast size → `ExplosionRadius` in `bomb.mcfunction`; output count →
  `result.count` in the recipe; name/color → `result.components."minecraft:custom_name"`.
- **Want fire back?** Swap the creeper line for
  `summon minecraft:fireball ~ ~ ~ {ExplosionPower:2,Motion:[0.0,-0.1,0.0]}` (blocks + fire).

## Deploy & test

```
node index.js live      # clones pack/ into the live world's datapack
/reload
```

Test without grinding the recipe:
```
# give yourself the exact crafted arrow
give @s minecraft:tipped_arrow[custom_data={bomb:true},custom_name={text:"Bomb Arrow",color:"dark_red",italic:false},potion_contents={custom_color:11141120,custom_effects:[{id:"minecraft:weakness",amplifier:100,duration:100}]},tooltip_display={hidden_components:["minecraft:potion_contents"]}] 16
```
Shoot at a block — it should crater on impact (no fire). Then craft it for real
(1 arrow + 1 gunpowder) to confirm the recipe stamps the marker.
