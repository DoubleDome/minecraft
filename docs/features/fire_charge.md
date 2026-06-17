# Throwable Fire Charge (Ghast Fireball)

A throwable item that flies straight and explodes like a **ghast fireball** — fire + block damage,
deflectable, no arc. Crafted **1:1 from a vanilla `minecraft:fire_charge`**. Pure datapack,
vanilla 26.1.2, no mods.

Builds on the Bomb Arrow pattern ([bomb_arrow.md](bomb_arrow.md)): same
mark-the-thrown-item → detect-the-entity → spawn-a-real-`minecraft:fireball` idea. The difference:
an arrow converts to a fireball **on landing**; a fire charge converts **in flight on tick 1**, so
vanilla's own fireball entity does the flying, the impact, the explosion, and even the deflection —
we reimplement nothing.

---

## Goal

| Property | Value |
| --- | --- |
| Behavior | flies straight (no gravity arc), explodes on first contact with fire + block damage |
| Blast power | `ExplosionPower:1` (a real ghast is 1; tunable — 2 craters harder, like the bomb arrow) |
| Deflectable | yes — it's an actual `minecraft:fireball`, so a melee hit reflects it (free, vanilla) |
| Item | `minecraft:snowball` + `custom_data:{ghast:true}`, named "Fire Charge" |
| Recipe | shapeless: 1 `minecraft:fire_charge` → 1 throwable fire charge |
| Acquisition | the recipe only (no command/loot needed) |
| Consumption | native — right-click throws and consumes one, like any snowball (no ammo accounting) |

## Why a snowball base (and not the fire charge itself)

Vanilla `minecraft:fire_charge` is **not throwable** — right-clicking it just ignites blocks like
flint & steel, and it never spawns a projectile entity we could hook. We need a vanilla item that
(a) throws on right-click and (b) spawns an entity that carries the stack it was thrown from, so the
crafted marker survives onto the entity. The throwable candidates:

| Base item | Throws on right-click | Carries thrown stack | Side effect to suppress |
| --- | --- | --- | --- |
| **`minecraft:snowball`** | yes | **`Item` NBT** | none — snowball just poofs |
| `minecraft:egg` | yes | `Item` NBT | can spawn a chicken on land |
| `minecraft:ender_pearl` | yes | `Item` NBT | teleports + damages the thrower |
| `minecraft:splash_potion` | yes | `Item` NBT | applies/clouds a potion |

**Snowball wins** — it's the only one with no land side effect, and we kill it on tick 1 anyway so
it never reaches the ground. The cost: in the hotbar it *looks* like a snowball, not a fire charge
(see "Looks" below). In flight it looks perfect — once converted, it renders as the flying ghast
fireball automatically.

## How it works (mark → detect → convert)

1. **Mark.** The shapeless recipe stamps the output snowball with `custom_data:{ghast:true}` and a
   red `custom_name` "Fire Charge". When thrown, the `minecraft:snowball` entity stores the item it
   was thrown from in its **`Item`** NBT — so the marker rides along on the entity (same mechanism
   as the arrow's `item`, just a different field name).
2. **Detect.** Every tick, `jakarta:fireball/tick` scans for snowballs carrying the marker and,
   on the first tick they exist, runs the conversion at each — `at @s` so the fireball spawns at the
   snowball's exact position and inherits its trajectory.
3. **Convert.** `jakarta:fireball/launch` summons a `minecraft:fireball`, copies the snowball's
   `Motion` onto it (this is what aims it), sets `ExplosionPower` + `acceleration_power`, then kills
   the snowball. From there vanilla flies and detonates it on contact — exactly a ghast fireball.

The tick scan is wired in by adding `jakarta:fireball/tick` to the `minecraft:tick` function tag
(alongside the existing `jakarta:tick` and `jakarta:arrow/tick`).

## Why convert to a real `minecraft:fireball` (not fake the flight)

A ghast fireball has four behaviors — straight no-gravity flight, impact detection, a fire+block
explosion, and melee deflection. The `minecraft:fireball` entity **is** all four, for free. Trying
to reproduce them by hand (motion each tick, raycasting impact, manual explosion) would be far more
code and still wouldn't deflect. So we spend the snowball purely as a *direction+position carrier*
and hand the rest to vanilla. The bomb arrow already proved the explosion half of this:
`summon minecraft:fireball {ExplosionPower:N}` = fire + craters, gated by `mobGriefing`.

## The crux: aiming the fireball

`minecraft:fireball` (AbstractHurtingProjectile) moves by accelerating along a stored **`direction`**
vector each tick (`acceleration_power` is the scalar, default ~0.1; the old 1.21.x `power` list is
gone — see field table). It does **not** steer by `Motion` — `Motion` is only the instantaneous
velocity, which drag erodes unless `direction` keeps feeding it. So we copy the snowball's Motion
into **both** fields: `direction` (sustains the aim) and `Motion` (initial velocity). The freshly
thrown snowball already has the right Motion (the thrower's look direction × throw speed):

```mcfunction
# in jakarta:fireball/launch, run `at @s` on the marked snowball:
summon minecraft:fireball ~ ~ ~ {ExplosionPower:1,acceleration_power:0.1,Tags:["mada_fb_new"]}
data modify entity @e[type=minecraft:fireball,tag=mada_fb_new,limit=1,sort=nearest] direction set from entity @s Motion
data modify entity @e[type=minecraft:fireball,tag=mada_fb_new,limit=1,sort=nearest] Motion set from entity @s Motion
tag @e[type=minecraft:fireball,tag=mada_fb_new] remove mada_fb_new
kill @s
```

> Note: the copied `direction` isn't unit-length (snowball Motion is ~1.5 b/t), so the fireball
> accelerates a touch faster than a real ghast's. Harmless — it still aims true. Tune with
> `acceleration_power` if it's too fast.

Converting on **tick 1** (rather than waiting for landing like the arrow) means the snowball's
gravity arc hasn't kicked in yet, so the flight reads as a flat, straight fireball.

## 26.1.2 NBT field names (verified from the server jar)

Extracted directly from `versions/26.1.2/server-26.1.2.jar` (the live jar is the source of truth —
see [26x_datapack_gotchas.md](../reports/26x_datapack_gotchas.md), "Entity NBT field casing is MIXED"):

| Entity (class) | Field | Case | Notes |
| --- | --- | --- | --- |
| `minecraft:snowball` (ThrowableItemProjectile) | `Item` | CamelCase | stored thrown stack — carries the marker |
| `minecraft:fireball` (LargeFireball) | `ExplosionPower` | CamelCase, int | default 1; matches the bomb arrow |
| `minecraft:fireball` (AbstractHurtingProjectile) | `direction` | lowercase | **the aim** — accel vector; copy snowball Motion here. Was part of the `power` list in 1.21.x |
| `minecraft:fireball` (AbstractHurtingProjectile) | `acceleration_power` | **snake_case** | **migrated** in 26.x; scalar speed of the accel along `direction` |
| `minecraft:fireball` (Fireball) | `Item` | CamelCase | optional — sets the rendered texture (defaults to fire charge) |
| base Entity | `Motion`, `Tags` | CamelCase | aim source + temp tag |

> ⚠️ The biggest change vs the 1.21.x community recipe: the old `power:[dx,dy,dz]` acceleration list
> no longer exists. Aim via `Motion` and use the scalar `acceleration_power`. If a future build
> renames it again, confirm with `summon minecraft:fireball ~ ~ ~` then
> `data get entity @e[type=fireball,limit=1]`.

## Proposed files (all static under `pack/`, cloned verbatim by `creator.clone` — no generator changes)

| File | Role |
| --- | --- |
| `pack/data/jakarta/recipe/fire_charge_throw.json` | shapeless 1 `fire_charge` → marked throwable snowball |
| `pack/data/jakarta/function/fireball/tick.mcfunction` | per-tick: find marked snowballs, call launch |
| `pack/data/jakarta/function/fireball/launch.mcfunction` | summon fireball, copy Motion, set power, kill snowball |
| `pack/data/minecraft/tags/function/tick.json` | **edit:** add `jakarta:fireball/tick` to the tick loop |

Recipe sketch (`fire_charge_throw.json`):
```json
{
  "type": "minecraft:crafting_shapeless",
  "category": "equipment",
  "ingredients": ["minecraft:fire_charge"],
  "result": {
    "id": "minecraft:snowball",
    "count": 1,
    "components": {
      "minecraft:custom_data": { "ghast": true },
      "minecraft:custom_name": { "text": "Fire Charge", "color": "red", "italic": false }
    }
  }
}
```

Detection line (`fireball/tick.mcfunction`):
```mcfunction
# Throwable Fire Charge: marked snowballs become real ghast fireballs on their first tick, so
# vanilla handles the flight/impact/explosion. Item field is CamelCase on snowballs.
execute as @e[type=minecraft:snowball,nbt={Item:{components:{"minecraft:custom_data":{ghast:1b}}}}] at @s run function jakarta:fireball/launch
```

`launch.mcfunction` is the four lines from "The crux" above.

Tick tag edit:
```json
{ "values": ["jakarta:tick", "jakarta:arrow/tick", "jakarta:fireball/tick"] }
```

## Looks: hotbar texture (optional, needs a resource pack)

The thrown projectile renders correctly on its own (it's a `minecraft:fireball`). Only the **hotbar
item** looks like a snowball. Pure-datapack, that's unavoidable — items have no server-side model
override. If the in-hand fire-charge texture matters, ship a tiny resource pack: add
`"minecraft:custom_model_data": { "floats": [1] }` to the recipe result's components and a model
override keyed on `custom_model_data` pointing at the `fire_charge` model. Otherwise accept the
snowball icon (the red "Fire Charge" name still disambiguates it in the tooltip).

## Caveats & tuning

- **`mobGriefing` must be `true` (the default).** A fireball's block destruction *and* fire are
  gated by `mobGriefing` — with it `false`, the blast still damages entities but won't break blocks
  or start fires. Same constraint as the bomb arrow.
- **Aim relies on copying `Motion` before the fireball caches its direction.** This is the
  "verify in-game, not in the log" situation from the gotchas doc — `/reload` shows no error even if
  the fireball flies the wrong way. If it mis-aims, the fallback is to summon it already pointed:
  `execute at @s rotated as @s run summon minecraft:fireball ^ ^ ^0.5 {...}` then still copy Motion,
  or scale `acceleration_power` up so Motion dominates sooner.
- **Throw speed.** A snowball is thrown at ~1.5 b/t; the copied `Motion` makes the fireball start
  fast, then `acceleration_power` sustains it. If it's too fast/slow, scale the copied Motion (copy
  into storage, no easy math in mcfunction — simplest is to just tune `acceleration_power`).
- **First-tick conversion can rarely miss point-blank shots** — if the snowball hits a wall the same
  tick it spawns, it poofs before the scan. Negligible at normal range; the fireball spawns at the
  snowball's position so very-close shots still detonate on you.
- **Self-damage / throwing while flying.** `launch.mcfunction` copies the snowball's `Owner`
  (thrower UUID) onto the fireball, so vanilla's "a projectile can't hit its own shooter until it
  has left the shooter's hitbox" grace applies and the fireball passes through the thrower — exactly
  like a real ghast fireball. This is essential when **flying**: thrower and fireball co-move at
  flight speed and never separate, so without an `Owner` the fireball's first collision check hits
  the player and detonates in their face. With `Owner` set it only re-arms against the thrower after
  clearing them (e.g. if deflected back).
- **Tuning knobs:** blast size → `ExplosionPower` in `launch.mcfunction`; flight speed →
  `acceleration_power`; output count → `result.count` in the recipe; name/color →
  `result.components."minecraft:custom_name"`.

## Deploy & test

```
node index.js live      # clones pack/ into the live world's datapack
/reload                  # functions, tags, and recipes reload fine on /reload (no restart needed —
                         # this feature adds no dynamic-registry files)
```

Test the item directly first, then craft it for real (1 fire charge → 1 throwable):
```mcfunction
give @s minecraft:snowball[custom_data={ghast:true},custom_name={text:"Fire Charge",color:"red",italic:false}] 16
```
Throw it at a wall — it should fly **straight** (no arc) and crater + ignite on impact. Throw one
across open ground and melee it mid-air to confirm it deflects like a real ghast fireball. Then
craft one from a `minecraft:fire_charge` to confirm the recipe stamps the marker
(`data get entity @s SelectedItem` while holding it → look for `minecraft:custom_data`).
```

If it mis-aims, apply the `Motion`-copy fallback in Caveats before changing anything else.
