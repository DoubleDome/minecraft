# Bomb Arrow

An arrow that detonates on contact: blast power **2**, **ignites fire**, **breaks blocks**.
Crafted from **8 arrows surrounding 1 TNT**. Pure datapack, vanilla 26.1.2, no mods.

---

## Goal

| Property | Value |
| --- | --- |
| Blast power | 2 (ExplosionPower; a creeper is 3, TNT is 4) |
| Fire | yes — leaves fire in the blast |
| Block damage | yes — craters terrain |
| Recipe | shaped: 8 `minecraft:arrow` around 1 `minecraft:tnt` → 8 bomb arrows |
| Acquisition | the recipe only (no command/loot needed) |

## How it works (mark → detect → detonate)

Vanilla has no "bomb arrow" item, so it's built in three parts:

1. **Mark.** The crafting recipe stamps the output arrow with a `custom_data` marker
   (`{bomb:true}`) and a red `item_name`. When fired, a `minecraft:arrow` entity stores
   the item it was shot from in its `item` NBT — so the marker rides along on the entity.
2. **Detect.** Every tick, `madagascar:arrow/tick` scans for arrows that have just landed
   (`inGround:1b`) **and** carry the marker, and runs the detonation on each.
3. **Detonate.** `madagascar:arrow/bomb` summons a ghast fireball with `ExplosionPower:2`
   at the arrow, then removes the arrow.

The tick scan is wired in by adding `madagascar:arrow/tick` to the `minecraft:tick` function
tag (alongside the generated `madagascar:tick`).

## Why a ghast fireball (not TNT or a creeper)

Only one vanilla explosion source does **fire + block damage with a tunable radius**:

| Source | Radius | Block damage | Fire | Reliable instant detonation |
| --- | --- | --- | --- | --- |
| `minecraft:tnt` (`{fuse:0}`) | fixed 4 (now tunable via `explosion_power`) | yes | **no** | yes |
| `minecraft:creeper` (`{Fuse:0,ignited:1b}`) | `ExplosionRadius` (tunable) | yes | **no** | yes |
| **`minecraft:fireball`** (`{ExplosionPower:2}`) | **tunable** | **yes** | **yes** | on contact (see caveat) |

The fireball is the only single primitive that satisfies all three requirements, so that's
what we use. It needs to collide to explode; summoning it at an arrow that's already lodged in
a block (plus a tiny downward `Motion` nudge) detonates it within a tick.

## 26.1.2 NBT field names (verified from the server jar)

Entity NBT casing is inconsistent in 26.x — some fields migrated to snake_case (TNT), most
base/entity fields stayed CamelCase. These were read directly out of
`versions/26.1.2/server-26.1.2.jar`:

| Entity | Field | Notes |
| --- | --- | --- |
| `minecraft:fireball` (LargeFireball) | `ExplosionPower` (int) | CamelCase. Default 1. We set 2. |
| `minecraft:arrow` (AbstractArrow) | `inGround` (byte), `item` (compound) | land flag + stored pickup item |
| base Entity | `Motion` (list), `Tags` (list) | CamelCase (unchanged) |
| `minecraft:tnt` (PrimedTnt) | `fuse`, `explosion_power`, `block_state` | snake_case (not used here, for reference) |
| `minecraft:creeper` | `ExplosionRadius`, `Fuse`, `ignited`, `powered` | mixed (not used here, for reference) |

If a future update changes `ExplosionPower`, confirm with:
`summon minecraft:fireball ~ ~ ~` then `data get entity @e[type=fireball,limit=1]`.

## Files

All static under `pack/` (cloned verbatim into the output by `creator.clone`), so no generator
code changes are needed:

| File | Role |
| --- | --- |
| `pack/data/madagascar/recipe/bomb_arrow.json` | The 8-arrows-around-TNT shaped recipe; output carries the `custom_data` marker. |
| `pack/data/madagascar/function/arrow/tick.mcfunction` | Per-tick: find landed marked arrows, call explode. |
| `pack/data/madagascar/function/arrow/bomb.mcfunction` | Summon the fireball, remove the arrow. |
| `pack/data/minecraft/tags/function/tick.json` | Adds `madagascar:arrow/tick` to the tick loop. |

## Ammo consumption — why it's a tipped arrow

The output is `minecraft:tipped_arrow`, not `minecraft:arrow`, **specifically so an Infinity bow
consumes it**. Vanilla Infinity only spares the plain `Items.ARROW`; tipped and spectral arrows
are different items and are *always* consumed (this is why potion arrows still deplete with
Infinity). Riding on that vanilla rule means **no custom ammo accounting** — every bow,
Infinity included, deducts one per shot natively.

The `potion_contents` component is set to only a `custom_color` (red `16711680`) with **no
potion and no effects**, so it's purely a consumable tinted arrow — it does no potion damage,
just the fireball blast.

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

- **`mobGriefing` must be `true` (the default).** A ghast fireball's block destruction *and*
  fire are gated by `mobGriefing`. With it `false`, the arrow still damages entities but won't
  break blocks or start fires.
- **Direct entity hits** are handled by a second detector. A non-piercing arrow that strikes a
  mob/player is *absorbed* (becomes a stuck arrow) and never sets `inGround`, so block hits would
  boom but direct hits wouldn't. Fix: `arrow/tick` also detonates a bomb arrow when a damageable
  entity (not in `#madagascar:bomb_ignore`, not the tagged shooter) is within ~2 blocks — a
  contact/proximity fuse. Side effect: passing within ~2 blocks of any mob detonates early.
- **Result components** (the marker on the crafted arrow) rely on crafting-recipe `result`
  supporting `components` (1.21.2+). To confirm it stuck: craft one and run
  `data get entity @s SelectedItem` while holding it — look for `minecraft:custom_data`.
- **Tuning knobs:** blast size → `ExplosionPower` in `explode.mcfunction`; output count →
  `result.count` in the recipe; name/color → `result.components."minecraft:item_name"`.
- **No fire wanted later?** Swap the fireball line for
  `summon minecraft:creeper ~ ~ ~ {ExplosionRadius:2,Fuse:0,ignited:1b}` (blocks, no fire).

## Deploy & test

```
node index.js live      # clones pack/ into the live world's datapack
/reload
```

Test without grinding the recipe:
```
# give yourself the exact crafted arrow
give @s minecraft:tipped_arrow[custom_data={bomb:true},custom_name={text:"Bomb Arrow",color:"red",italic:false},potion_contents={custom_color:16711680},tooltip_display={hidden_components:["minecraft:potion_contents"]}] 16
```
Shoot at a block — it should crater and catch fire on impact. Then craft it for real
(8 arrows around 1 TNT) to confirm the recipe stamps the marker.
