# Lightning Arrow

An arrow that calls down a **lightning bolt** on contact. Crafted from **1 copper ingot + 1
arrow**. Pure datapack, vanilla 26.1.2, no mods. Built on the same mark → detect → act pattern
as the [Bomb Arrow](bomb_arrow.md).

---

## Goal

| Property | Value |
| --- | --- |
| Effect | summons `minecraft:lightning_bolt` at the impact point |
| Damage | vanilla lightning (5 hearts, plus the mob conversions: pig→zombified piglin, etc.) |
| Fire | yes — lightning ignites blocks, gated by `mobGriefing` (same as the bomb's blast) |
| Recipe | shapeless: 1 `minecraft:copper_ingot` + 1 `minecraft:arrow` → 1 lightning arrow |
| Acquisition | the recipe only |

## How it works (mark → detect → strike)

Identical structure to the bomb arrow — only the action differs (lightning bolt instead of a
fireball blast):

1. **Mark.** The shapeless recipe stamps the output arrow with `custom_data {lightning:true}`
   and a yellow name/tint. Fired, the `minecraft:arrow` entity carries the marker in its `item` NBT.
2. **Detect.** `madagascar:arrow/tick` (already in the `minecraft:tick` tag) runs **two** detectors
   each tick — the same pair as the bomb arrow:
   - landed arrow (`inGround:1b`) carrying the marker, and
   - a direct entity hit: an absorbed arrow never sets `inGround`, so a ~2-block proximity fuse
     catches mob/player hits. The shooter is tagged `lightning_owner` first so a point-blank shot
     doesn't strike at the muzzle, and `#madagascar:bomb_ignore` is reused to skip
     projectiles/markers/etc.
3. **Strike.** `madagascar:arrow/lightning` summons the bolt at the arrow, then removes the arrow.

## Ammo consumption — tipped arrow (same as bomb)

Output is `minecraft:tipped_arrow` so **Infinity consumes it natively**, like a potion arrow — no
custom ammo accounting. `potion_contents` carries only a `custom_color` (yellow `16776960`), no potion
or effects; the greyed "No Effect" line is suppressed with `tooltip_display`
(`hidden_components:["minecraft:potion_contents"]`). The name uses `custom_name` (highest priority)
so the generated "Uncraftable Tipped Arrow" name can't override it. See the bomb arrow doc for the
full rationale.

## Files

| File | Role |
| --- | --- |
| `pack/data/madagascar/recipe/lightning_arrow.json` | shapeless copper + arrow; output carries the marker. |
| `pack/data/madagascar/function/arrow/lightning.mcfunction` | summon the bolt, remove the arrow. |
| `pack/data/madagascar/function/arrow/tick.mcfunction` | the two detector lines (shared per-tick scan). |

No tick-tag change needed — `madagascar:arrow/tick` is already wired in by the bomb arrow.

## Caveats

- **`mobGriefing`** gates only the *fire* a strike leaves behind; the shock damage and mob
  conversions fire regardless.
- **Proximity fuse** means passing within ~2 blocks of any mob strikes early — inherent to the
  shared contact-fuse approach.
- **Weather/visual:** the bolt is a real `lightning_bolt` entity, so it makes thunder sound and
  can convert/ignite as vanilla lightning does; it does **not** change the world weather.

## Test without grinding the recipe

```
give @s minecraft:tipped_arrow[custom_data={lightning:true},custom_name={text:"Lightning Arrow",color:"yellow",italic:false},potion_contents={custom_color:16776960},tooltip_display={hidden_components:["minecraft:potion_contents"]}] 16
```

Shoot a block or a mob — a bolt strikes on impact. Then craft it for real (copper ingot + arrow)
to confirm the recipe stamps the marker.
