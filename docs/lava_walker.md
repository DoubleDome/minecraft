# Lava Walker

A boots enchantment that lays a **temporary** path across **lava** as you walk — the lava analog of
**Frost Walker**. Vanilla 26.1.2, no mods. The enchantment (data-driven) places the magma; a small
tick system melts the trail back to lava after you leave.

---

## Goal

| Property | Value |
| --- | --- |
| Item | boots (`#minecraft:enchantable/foot_armor`, `slots:["feet"]`) |
| On walking | lava at your feet turns into **magma block** in a disk under you (`radius 3 + 1/level`) |
| Trail | **temporary** — magma melts back to lava ~8s after you leave it (tick system) |
| Safety | the enchant grants immunity to `burn_from_stepping`, so **you** walk the magma path unburned |
| Levels | max 2 (radius 3 then 4), mirroring Frost Walker |
| Obtain | **treasure** — villager trades, chest loot, fishing (NOT the enchanting table) — exactly Frost Walker's tag set |
| Exclusive with | **Frost Walker + Depth Strider** — shares `#minecraft:exclusive_set/boots`, exactly like Frost Walker |

## Why placement is just an enchantment JSON

Frost Walker is **fully data-driven** in 1.21+: it uses a `minecraft:location_changed` enchantment
effect running a `minecraft:replace_disk` that swaps water→frosted_ice in a disk under the player
when they move on the ground. Lava Walker is the *same effect pointed at lava*. We mirror vanilla's
[`frost_walker.json`](../pack/data/minecraft/enchantment/frost_walker.json) and change three things:

| Frost Walker | Lava Walker |
| --- | --- |
| `block_state` → `frosted_ice` (with `age`) | `magma_block` (no properties) |
| predicate `matching_blocks` / `matching_fluids` → `minecraft:water` | `minecraft:lava` |
| placed ice **melts** over time (frosted_ice has `age`) | magma is **permanent** (vanilla has no decaying obsidian/magma) |

Everything else is identical: the air-above check (only crusts exposed surface), `unobstructed`,
the `on_ground` + `not in a vehicle` requirements, the clamped `3 + 1/level` radius, and the
`block_place` game event.

### The magma synergy
Frost Walker already carries a `damage_immunity` for the `#minecraft:burn_from_stepping` damage tag
(that's the magma-block / hot-floor burn). We **keep it**, so the wearer walks the magma path with
no burn — while other players/mobs without the enchant still take magma damage on it (a nice trap
side effect). That's why magma block is the natural choice: the immunity is already there for it.

## Temporary path (the tick system)

Vanilla has no self-reverting block (Frost Walker's ice melts via the `age` blockstate; magma has
none), so reversion is done in a function loop. The enchantment still does all the **placement**;
the tick only **tracks and melts**:

1. **Track.** `lava_walker/tick` runs `lava_walker/mark` on each Lava Walker player standing on
   **enchant-placed** magma — identified as magma with **lava directly beneath** (`~ ~-1 ~` magma,
   `~ ~-2 ~` lava), which excludes natural magma blocks. It drops one invisible `marker` per cell
   (deduped) with a ~8s countdown on the `madagascar.lw` scoreboard.
2. **Melt.** `lava_walker/revert` ages each marker; at zero it `fill`s a ±4 disk of
   `magma_block` → `lava` at the marker and removes itself — **unless a player is within 4 blocks**,
   in which case it re-arms (so the path never reverts out from under someone, which would drop them
   in the lava). ±4 covers the level-2 disk radius.

Detection uses the `madagascar:has_lava_walker` predicate (boots enchantment, any level), so it's
level-agnostic and reloadable.

## ⚠️ Enchantments need a server RESTART, not `/reload`

Enchantments are a **startup-only datapack registry** (see
[26x_datapack_gotchas.md](26x_datapack_gotchas.md)). `/reload` will load the *referencing* tags but
not register `madagascar:lava_walker`, producing "missing reference" errors. **Stop and restart the
server** after deploying.

## Files (all static under `pack/`)

| File | Role |
| --- | --- |
| `pack/data/madagascar/enchantment/lava_walker.json` | the enchantment (mirrors Frost Walker, lava + magma) |
| `pack/data/minecraft/tags/enchantment/{treasure,tradeable,on_random_loot,tooltip_order}.json` | the **exact** four tags Frost Walker sits in (obtainability + tooltip sort) |
| `pack/data/minecraft/tags/enchantment/exclusive_set/boots.json` | adds Lava Walker to Frost Walker's exclusive set (incompatible with Frost Walker + Depth Strider, both directions) |
| `pack/data/madagascar/predicate/has_lava_walker.json` | detects the boots enchant (any level) |
| `pack/data/madagascar/function/lava_walker/{tick,mark,revert}.mcfunction` | track + melt the temporary trail |
| `pack/data/madagascar/function/util/load.mcfunction` | **edit:** adds the `madagascar.lw` countdown objective |
| `pack/data/minecraft/tags/function/tick.json` | **edit:** registers `lava_walker/tick` |

(All three tags use `"replace": false` to append to vanilla — they're exactly the tags Frost Walker
sits in.)

## Caveats & tuning

- **Melt timing** is the `160` (8s) in `lava_walker/mark` and the `40`-tick re-arm in
  `lava_walker/revert` — tune to taste.
- **The ±4 melt fill is blunt** — within 4 blocks of the trail it reverts *any* `magma_block` to
  lava. Markers only drop over a lava surface (magma with lava beneath), so this only bites if
  natural magma sits right next to a lava lake you're walking. Acceptable edge; note it exists.
- **Stand still too long and the path can still melt** if you step off the marked cell — keep
  moving, like Frost Walker. The re-arm guard stops it reverting while you're directly on it.
- **Treasure = no enchanting table.** Get it from raid/trade/fishing/loot, or `/enchant` for
  testing. To allow table rolls instead, drop it from `#treasure` and add `#in_enchanting_table`.
- **Exclusive with Frost Walker AND Depth Strider** — `exclusive_set` points at
  `#minecraft:exclusive_set/boots` (the same tag Frost Walker uses) and Lava Walker is appended to
  that tag, so the incompatibility holds from both sides, exactly mirroring Frost Walker. To allow
  stacking, give it a narrower `exclusive_set` (or drop the field) and remove it from the boots tag.
- **Level/radius/cost** mirror Frost Walker; bump `max_level` / `radius` to taste.

## Deploy & test

```
node index.js live
# then STOP and RESTART the server (enchantments don't hot-reload)
```
Test:
```
# put it on boots directly
enchant @s madagascar:lava_walker
# or a book to combine in an anvil
give @s enchanted_book[minecraft:stored_enchantments={"madagascar:lava_walker":1}]
```
Wear the boots and walk to the edge of a lava lake — the surface should turn to magma you can walk
on without burning. Confirm with `/enchant` that it's "Lava Walker" (not "Unknown enchantment",
which would mean the server wasn't restarted).
