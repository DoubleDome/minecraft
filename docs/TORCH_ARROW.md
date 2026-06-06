# Torch Arrow

An arrow that places a torch on whatever it hits — shoot a wall or floor to light it from range.
Crafted **shapeless: 1 arrow + 1 torch**, in three flavors — **normal / soul / redstone** — the
torch you craft with is the torch that gets placed. Vanilla 26.1.2, no mods.

Builds directly on the Explosive Arrow pattern ([EXPLOSIVE_ARROW.md](EXPLOSIVE_ARROW.md)) — same
tipped-arrow trick, same marker + `inGround` detection. The new problems are **placing the right
torch variant on the right face** and **carrying the chosen torch type through to placement**.

---

## Goal

| Property | Value |
| --- | --- |
| Item | `minecraft:tipped_arrow` + `custom_data:{torch:true,t:"<prefix>"}` (so Infinity consumes it; see EXPLOSIVE_ARROW.md) |
| Recipes | shapeless `minecraft:arrow` + a torch → 1 matching torch arrow. Three: torch / soul_torch / redstone_torch |
| On landing | attach the matching torch to the block hit: standing torch on floors, wall torch on walls |
| Ceilings | skipped — vanilla has no ceiling-mounted torch |

## Variants

The marker carries a `t` field = the torch **block-id prefix**, so one macro builds the block id
(`minecraft:<t>torch` / `minecraft:<t>wall_torch`). Names and tints match the torch:

| Recipe (arrow +) | `t` | Name (color) | Placed blocks |
| --- | --- | --- | --- |
| `minecraft:torch` | `""` | Torch Arrow (gold) | `torch` / `wall_torch` |
| `minecraft:soul_torch` | `"soul_"` | Soul Torch Arrow (aqua) | `soul_torch` / `soul_wall_torch` |
| `minecraft:redstone_torch` | `"redstone_"` | Redstone Torch Arrow (red) | `redstone_torch` / `redstone_wall_torch` |

## How it works (mark → detect → place)

1. **Mark.** Each shapeless recipe stamps `custom_data:{torch:true,t:"<prefix>"}`, a matching
   `custom_name`, and a matching tint. It's a `tipped_arrow` (no potion effect) so every bow —
   Infinity included — consumes it, exactly like the explosive arrow.
2. **Detect.** One line in the existing `arrow/tick` matches `inGround` arrows carrying the
   `torch` marker (any variant, via `{torch:1b}`) and runs placement **rotated as the arrow** so
   the placement function has the flight direction.
3. **Place.** `arrow/torch` copies the `t` prefix to storage and calls the macro `arrow/torch_place`
   with it; the macro picks the face from the arrow's orientation, places `minecraft:<t>torch` /
   `minecraft:<t>wall_torch`, then `arrow/torch` removes the arrow.

## The crux: which face did it hit?

A stuck arrow keeps its **flight rotation** (`inGround` zeroes Motion but not `Rotation`), and it
hit the face it was pointing at. So orientation tells us the face, and we place the torch in the
**air block behind the tip** — which is always the open side, for every face — via a local-coord
nudge backward along travel:

```mcfunction
# positioned/rotated at the arrow (set up by the tick caller):
positioned ^ ^ ^-0.5 align xyz   # 0.5 block back along travel = the air block it came from
setblock ~ ~ ~ <variant> keep    # keep = only fill air, never overwrite the block it hit
```

Then the **variant** is chosen by pitch/yaw:

| Arrow pitch (`x_rotation`) | Face hit | Place |
| --- | --- | --- |
| `45..90` (steeply down) | top of a block (floor) | `minecraft:torch` (standing) |
| `-45..45` (horizontal) | a side (wall) | `minecraft:wall_torch[facing=<opposite of travel>]` |
| `< -45` (steeply up) | bottom of a block (ceiling) | nothing — no vanilla ceiling torch |

For walls, `facing` is the **opposite of travel** (the torch points back toward the shooter),
mapped from yaw the same way [`app/ender.js`](../app/ender.js) maps `directions.json` ranges:

| Travel (`y_rotation`) | Wall torch facing |
| --- | --- |
| `-45..45` (south) | `north` |
| `45..135` (west) | `east` |
| `135..180` and `-180..-135` (north) | `south` |
| `-135..-45` (east) | `west` |

`wall_torch[facing=F]` needs a solid block on the side opposite `F` — which is exactly the block
the arrow hit, so support is guaranteed when the offset lands in the right block. `keep` mode is
the safety net: if a precision miss puts the target in a solid block, nothing is placed (no torch
embedded in stone, no block destroyed).

## Files (all static under `pack/`, like the explosive arrow)

| File | Role |
| --- | --- |
| `pack/data/madagascar/recipe/torch_arrow.json` | shapeless arrow + torch → normal torch arrow (`t:""`) |
| `pack/data/madagascar/recipe/soul_torch_arrow.json` | arrow + soul_torch → soul torch arrow (`t:"soul_"`) |
| `pack/data/madagascar/recipe/redstone_torch_arrow.json` | arrow + redstone_torch → redstone torch arrow (`t:"redstone_"`) |
| `pack/data/madagascar/function/arrow/torch.mcfunction` | copy `t` → storage, call macro, `kill @s` |
| `pack/data/madagascar/function/arrow/torch_place.mcfunction` | **macro:** face select + place `minecraft:$(t)[wall_]torch` |
| `pack/data/madagascar/function/arrow/tick.mcfunction` | **edit:** add one torch-detection line |

`tooltip_display` hides the greyed-out "No Effect" line a no-potion tipped arrow would otherwise
show (same trick as the explosive arrow); all three recipes include it.

Detection line in `arrow/tick` (matches all three variants via `{torch:1b}`):
```mcfunction
execute as @e[type=minecraft:arrow,nbt={inGround:1b,item:{components:{"minecraft:custom_data":{torch:1b}}}}] at @s rotated as @s run function madagascar:arrow/torch
```

`arrow/torch.mcfunction` — default the prefix to `""` so a missing/stale value falls back to a
normal torch, copy the arrow's `t`, run the macro, remove the arrow:
```mcfunction
data modify storage madagascar:arrow t set value ""
data modify storage madagascar:arrow t set from entity @s item.components."minecraft:custom_data".t
function madagascar:arrow/torch_place with storage madagascar:arrow
kill @s
```

`arrow/torch_place.mcfunction` — macro lines (`$` prefix), `$(t)` substitutes the prefix:
```mcfunction
$execute if entity @s[x_rotation=45..90] positioned ^ ^ ^-0.5 align xyz run setblock ~ ~ ~ minecraft:$(t)torch keep
$execute if entity @s[x_rotation=-45..45,y_rotation=-45..45]    positioned ^ ^ ^-0.5 align xyz run setblock ~ ~ ~ minecraft:$(t)wall_torch[facing=north] keep
$execute if entity @s[x_rotation=-45..45,y_rotation=45..135]    positioned ^ ^ ^-0.5 align xyz run setblock ~ ~ ~ minecraft:$(t)wall_torch[facing=east]  keep
$execute if entity @s[x_rotation=-45..45,y_rotation=135..180]   positioned ^ ^ ^-0.5 align xyz run setblock ~ ~ ~ minecraft:$(t)wall_torch[facing=south] keep
$execute if entity @s[x_rotation=-45..45,y_rotation=-180..-135] positioned ^ ^ ^-0.5 align xyz run setblock ~ ~ ~ minecraft:$(t)wall_torch[facing=south] keep
$execute if entity @s[x_rotation=-45..45,y_rotation=-135..-45]  positioned ^ ^ ^-0.5 align xyz run setblock ~ ~ ~ minecraft:$(t)wall_torch[facing=west]  keep
# ceiling (x_rotation < -45): no line matches = no effect
```

## Caveats & tuning

- **The `^ ^ ^-0.5` offset is the thing to calibrate in-game.** Arrows embed at slightly different
  depths; if torches land one block off, sweep the offset in `-0.3 .. -0.7`. This is exactly the
  "verify in-game" situation from [26X_DATAPACK_GOTCHAS.md](26X_DATAPACK_GOTCHAS.md) — `/reload`
  shows no error even when placement is visually wrong.
- **Ceilings get nothing** — vanilla has no ceiling torch. Option: place a wall torch on the
  nearest side instead, or just accept it (the arrow is still consumed). Decide before building.
- **Diagonal/edge hits** round to the nearest of the 6 faces; corner shots may face an odd way.
- **Non-solid / non-supporting targets** (e.g. shooting glass, leaves, the side of a slab) — the
  torch pops off if support is invalid; `keep` prevents block damage but the torch may drop as an
  item. Expected vanilla behavior.
- **Adding more torch types** is one recipe + the right `t` prefix — the macro already handles any
  `minecraft:<t>torch` / `minecraft:<t>wall_torch` pair (e.g. a modded torch).
- **Consumption:** identical to the explosive arrow — tipped-arrow base means 1 consumed per shot
  on every bow. 1 torch in → 1 torch arrow → 1 torch placed (clean conservation; bump
  `result.count` if you want more per craft).

## Deploy & test

```
node index.js live
/reload
```
Test the variants directly, then shoot a floor and a wall:
```
give @s minecraft:tipped_arrow[custom_data={torch:true,t:""},custom_name={text:"Torch Arrow",color:"gold",italic:false},potion_contents={custom_color:16755200},tooltip_display={hidden_components:["minecraft:potion_contents"]}] 16
give @s minecraft:tipped_arrow[custom_data={torch:true,t:"soul_"},custom_name={text:"Soul Torch Arrow",color:"aqua",italic:false},potion_contents={custom_color:5636095},tooltip_display={hidden_components:["minecraft:potion_contents"]}] 16
give @s minecraft:tipped_arrow[custom_data={torch:true,t:"redstone_"},custom_name={text:"Redstone Torch Arrow",color:"red",italic:false},potion_contents={custom_color:16711680},tooltip_display={hidden_components:["minecraft:potion_contents"]}] 16
```
Verify per variant: floor shot → upright torch of that type; wall shot → matching wall torch
pointing back at you; ceiling shot → nothing (arrow consumed). If placement is one block off,
tune the `^ ^ ^-0.5` offset.
