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
| Item | `minecraft:tipped_arrow` + `custom_data:{torch:true,f:"<floor id>",w:"<wall id>"}` (so Infinity consumes it; see EXPLOSIVE_ARROW.md) |
| Recipes | shapeless `minecraft:arrow` + a torch → 1 matching torch arrow. Three: torch / soul_torch / redstone_torch |
| On landing | attach the matching torch to a real adjacent support: standing on floors, wall torch on walls |
| Ceilings | nothing — vanilla has no ceiling-mounted torch |

## Variants

The marker carries the actual block ids — `f` (floor / standing form) and `w` (wall form) — which
the recipe stamps in. The placer (`util/place_mounted`) substitutes them directly, so no string
building is needed. Names and tints match the torch:

| Recipe (arrow +) | `f` / `w` | Name (color) |
| --- | --- | --- |
| `minecraft:torch` | `torch` / `wall_torch` | Torch Arrow (gold) |
| `minecraft:soul_torch` | `soul_torch` / `soul_wall_torch` | Soul Torch Arrow (aqua) |
| `minecraft:redstone_torch` | `redstone_torch` / `redstone_wall_torch` | Redstone Torch Arrow (red) |

## How it works (mark → detect → place)

1. **Mark.** Each shapeless recipe stamps `custom_data:{torch:true,f:"…",w:"…"}`, a matching
   `custom_name`, and a matching tint. It's a `tipped_arrow` (no potion effect) so every bow —
   Infinity included — consumes it, exactly like the explosive arrow.
2. **Detect.** One line in the existing `arrow/tick` matches `inGround` arrows carrying the
   `torch` marker (any variant, via `{torch:1b}`) and runs placement at the arrow.
3. **Place.** `arrow/torch` copies the `f`/`w` block ids to storage (defaulting to a normal torch)
   and calls the reusable **`util/place_mounted`**, which probes the blocks around the landing
   point for a real support and places the matching torch; then `arrow/torch` removes the arrow.

## The crux: which face did it hit? (probe, don't guess)

Two dead ends came first: (1) classifying the face from the arrow's **flight angle** (pitch/yaw
bins like `ender.js`/`directions.json`) — only works on perpendicular shots; (2) a rotation
**step-off** (`^ ^ ^-0.5`) to find the open cell — drifts diagonally on angled hits, so most shots
placed nothing. Both **dropped**.

The real difficulty: the arrow's `Pos` sits **on the hit face**, so `align xyz` is a coin-flip
between the **open cell** and the **solid block** it hit, and vanilla exposes neither the hit block
nor the face. So instead of locating the cell precisely, we **probe the blocks around the landing
point** ([`util/place_mounted`](../pack/data/madagascar/function/util/place_mounted.mcfunction)) and
handle **both** roundings:

| Our aligned cell is… | We look for… | Place |
| --- | --- | --- |
| **open** | solid below | `floor` (standing) in our cell |
| **open** | solid to a side | `wall` facing away from it, in our cell |
| **solid** (rounded into the hit block) | open above | `floor` on top of us |
| **solid** | open to a side | `wall` in that cell, attached to us |
| anything | only solid above / no support | nothing — no vanilla ceiling torch |

`#minecraft:replaceable` (air, water, grass, …) is the "open / not-a-support" test. Floor is tried
first, then the four walls; the **first successful placement wins** via a `#done` flag (set by
`store success` on the `setblock`). No rotation is used at all, so it's independent of approach
angle. The `0.5` step-off and the boundary coin-flip are both gone.

## Files (all static under `pack/`, like the explosive arrow)

| File | Role |
| --- | --- |
| `pack/data/madagascar/recipe/{torch,soul_torch,redstone_torch}_arrow.json` | the three shapeless recipes; each bakes `f`/`w` block ids into the marker |
| `pack/data/madagascar/function/arrow/torch.mcfunction` | copy `f`/`w` → storage (default normal torch), call the placer, `kill @s` |
| `pack/data/madagascar/function/util/place_mounted.mcfunction` | **reusable macro:** probe neighbours, place `$(floor)` / `$(wall)[facing=…]` |
| `pack/data/madagascar/function/util/load.mcfunction` | creates the `madagascar.place` scratch objective (the `#done` flag) |
| `pack/data/madagascar/function/arrow/tick.mcfunction` | **edit:** torch-detection line |
| `pack/data/minecraft/tags/function/{tick,load}.json` | **edit:** register `arrow/tick` and `util/load` |

`tooltip_display` hides the greyed-out "No Effect" line a no-potion tipped arrow would otherwise
show (same trick as the explosive arrow); all three recipes include it.

Detection line in `arrow/tick` (matches all three variants via `{torch:1b}`):
```mcfunction
execute as @e[type=minecraft:arrow,nbt={inGround:1b,item:{components:{"minecraft:custom_data":{torch:1b}}}}] at @s run function madagascar:arrow/torch
```

`arrow/torch.mcfunction` — default `f`/`w` to a normal torch (covers old arrows), overwrite from the
marker, run the reusable placer, remove the arrow:
```mcfunction
data modify storage madagascar:place floor set value "minecraft:torch"
data modify storage madagascar:place wall set value "minecraft:wall_torch"
data modify storage madagascar:place floor set from entity @s item.components."minecraft:custom_data".f
data modify storage madagascar:place wall set from entity @s item.components."minecraft:custom_data".w
function madagascar:util/place_mounted with storage madagascar:place
kill @s
```

`util/place_mounted.mcfunction` — reusable. `$(floor)`/`$(wall)` come from the storage. First five
lines treat our cell as open (support = a neighbour); last five treat it as the solid block hit
(open cell = a neighbour). `#done` (set by `store success`) makes the first placement win:
```mcfunction
scoreboard players set #done madagascar.place 0
$execute align xyz if score #done madagascar.place matches 0 if block ~ ~ ~ #minecraft:replaceable unless block ~ ~-1 ~ #minecraft:replaceable store success score #done madagascar.place run setblock ~ ~ ~ $(floor)
$execute align xyz if score #done madagascar.place matches 0 if block ~ ~ ~ #minecraft:replaceable unless block ~ ~ ~-1 #minecraft:replaceable store success score #done madagascar.place run setblock ~ ~ ~ $(wall)[facing=south]
# … +3 more wall directions (open cell), then 5 mirrored lines for the "our cell is solid" case …
```
(`wall[facing=F]` attaches to the block opposite `F`: support north → facing south, south → north,
east → west, west → east. See the deployed file for all ten lines.)

To **reuse** elsewhere: store `floor` + `wall` block ids in `madagascar:place` and
`function madagascar:util/place_mounted with storage madagascar:place`, positioned where you want
the mount.

## Caveats & tuning

- **Works from any angle** — the variant comes from probing real neighbours, not the shot angle, so
  arced/diagonal/steep hits place correctly, and there's no offset to calibrate (no rotation used).
  Still a "verify in-game" feature ([26X_DATAPACK_GOTCHAS.md](26X_DATAPACK_GOTCHAS.md)): `/reload`
  shows no error even if a torch lands wrong.
- **Ceilings get nothing** — vanilla has no ceiling torch (only-above support matches no probe).
- **Inside corners** (multiple solid neighbours) take floor-first, then N/E/S/W priority — a valid
  torch either way, just a fixed tie-break.
- **`#minecraft:replaceable` is the support proxy.** Water/tall grass count as "open" (a torch in
  water still pops — vanilla), and any non-replaceable block counts as support; vanilla's own
  placement validation is the final backstop.
- **Adding more torch types** is one recipe with the right `f`/`w` block ids — no code change; the
  reusable placer already handles any floor/wall block pair (e.g. a modded torch).
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
give @s minecraft:tipped_arrow[custom_data={torch:true,f:"minecraft:torch",w:"minecraft:wall_torch"},custom_name={text:"Torch Arrow",color:"gold",italic:false},potion_contents={custom_color:16755200},tooltip_display={hidden_components:["minecraft:potion_contents"]}] 16
give @s minecraft:tipped_arrow[custom_data={torch:true,f:"minecraft:soul_torch",w:"minecraft:soul_wall_torch"},custom_name={text:"Soul Torch Arrow",color:"aqua",italic:false},potion_contents={custom_color:5636095},tooltip_display={hidden_components:["minecraft:potion_contents"]}] 16
give @s minecraft:tipped_arrow[custom_data={torch:true,f:"minecraft:redstone_torch",w:"minecraft:redstone_wall_torch"},custom_name={text:"Redstone Torch Arrow",color:"red",italic:false},potion_contents={custom_color:16711680},tooltip_display={hidden_components:["minecraft:potion_contents"]}] 16
```
Verify per variant, **and from angles** — shoot a floor steeply, a wall from off to the side, and
straight up at a ceiling: floor → upright torch; wall → matching wall torch; ceiling → nothing
(arrow consumed). If a torch lands one cell off, tune the `^ ^ ^-0.5` step-off.
