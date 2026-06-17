# Sonic Horn

A custom **goat horn** that fires the **Warden's sonic boom** in the direction you look, on a
cooldown. Has durability and is enchantable (Mending + Unbreaking). Pure datapack, vanilla 26.1.2,
no mods.

---

## Summary

| Property | Value |
| --- | --- |
| Item | `minecraft:goat_horn` marked `custom_data {sonic_horn:true}`, named "Sonic Horn" |
| Activation | **blow the horn** (right-click), detected via the `minecraft:using_item` advancement trigger |
| Effect | a sonic-boom beam from the eyes: **10 armor-piercing damage** (vanilla `sonic_boom` damage type) to every entity in a **15-block** line, with the real particle + sound |
| Cooldown | **7 s** — the goat horn's own hardcoded cooldown (`instrument.use_duration × 20` = 7.0 × 20 = 140t). Goat horns **ignore** the `use_cooldown` component, so this is fixed by the instrument. |
| Durability | base **16 uses**, **1 per shot** |
| Enchantable | Mending + Unbreaking via anvil (`#minecraft:enchantable/durability`) |
| Obtain | `/give`, or a **50 % drop from the Warden** (alongside its vanilla sculk catalyst) |

## How it works

**Mark → detect → fire.** Vanilla has no "on right-click item" function hook, so activation rides the
`minecraft:using_item` advancement trigger, filtered to a goat horn carrying the `sonic_horn` marker.

1. **`advancement/sonic_horn.json`** — `using_item` trigger → reward function `jakarta:horn/sonic`.
2. **`horn/sonic`** (runs as the player) — the trigger fires *every tick* of the multi-second blow, so
   it fires on the **edge** only: when the player isn't already tagged `horn_blowing` and the horn is in
   the **main hand**. It tags `horn_blowing` + refreshes `horn_grace` (cleared a few ticks after the
   blow ends by `horn/tick`), then revokes so the advancement can re-grant. Re-blow spacing is the
   horn's own 7 s cooldown — no separate timer, so a blow never gets "eaten."
3. **`horn/fire`** — sets the cooldown first (so a blow always consumes the window, even a broken
   horn → no per-tick dud spam), plays the boom sound, then raycasts the beam, then wears the horn.
4. **`horn/ray`** — recursive 0.5-block steps along the look vector (30 steps = 15 blocks): draws the
   `sonic_boom` particle, damages fresh targets at each point, stops at range or the first
   non-passable block (`#jakarta:beam_pass`).
5. **`horn/hit`** — tags the entity (hit once) and deals `damage @s 10 minecraft:sonic_boom by
   <shooter>`. Reusing the vanilla damage type inherits its armor/shield/resistance bypass via the
   `#minecraft:bypasses_*` damage-type tags — no manual armor math.

## Durability, Mending, Unbreaking

- **Wear** — `horn/wear` → `apply_wear` consumes 1 point per shot via the `jakarta:horn_wear`
  item modifier (`set_damage` `add:-0.0625` = −1/16). At damage ≥ 16 the horn goes **dud** (the gate
  in `horn/fire` blocks firing) and plays the break sound — it is **not** removed, so Mending can
  bring it back.
- **Unbreaking** — vanilla's `item_damage` effect never fires here (we damage by command, not vanilla
  wear), so `horn/wear` rolls it manually: spend durability with probability **1/(level+1)**, which is
  exactly vanilla's tool formula (chance-to-spend = 1 − L/(L+1)). Expected uses: **16 / 32 / 48 / 64**
  for Unbreaking 0 / I / II / III.
- **Mending** — works for free. Mending is `slots:["any"]`, `supported_items:#enchantable/durability`;
  adding `minecraft:goat_horn` to that tag makes it both enchantable on an anvil and auto-repairing
  from XP while held.

> Durability/Unbreaking track the **main hand** only (they read `SelectedItem`). The boom also only
> fires from the main hand. Blowing a Sonic Horn from the offhand does nothing.

## Files

| File | Role |
| --- | --- |
| `pack/data/minecraft/loot_table/entities/warden.json` | overrides vanilla: keeps sculk catalyst, adds 50 % Sonic Horn (`set_components` stamps the marker, name, `max_damage:16`, `damage:0`). |
| `pack/data/jakarta/advancement/sonic_horn.json` | `using_item` trigger → reward `horn/sonic`. |
| `pack/data/jakarta/function/horn/*.mcfunction` | `load`, `tick`, `sonic`, `fire`, `ray`, `hit`, `wear`, `roll` (macro), `apply_wear`. |
| `pack/data/jakarta/item_modifier/horn_wear.json` | `set_damage add:-1/16` — one point of wear. |
| `pack/data/jakarta/tags/block/beam_pass.json` | blocks the beam passes through (air/water/plants). |
| `pack/data/minecraft/tags/item/enchantable/durability.json` | adds `goat_horn` → Mending/Unbreaking on an anvil. |
| `pack/data/minecraft/tags/function/{load,tick}.json` | wire `horn/load` and `horn/tick`. |

## Get one (without farming a Warden)

```
give @s minecraft:goat_horn[instrument="minecraft:ponder_goat_horn",custom_data={sonic_horn:true},custom_name={text:"Sonic Horn",color:"dark_aqua",italic:false},max_damage=16,damage=0] 1
```

Hold it in the **main hand**, blow it at a mob/wall — armor-piercing beam, 7 s cooldown, loses 1
durability per shot. (`damage:0` is **required** — the game only treats an item as damageable when it
has `max_damage`, no `unbreakable`, **and** a `damage` component.)

## Tuning knobs

- **Damage** → `10` in `horn/hit`.
- **Range** → `horn_ray` start (`30`) in `horn/fire` × 0.5-block step in `horn/ray`.
- **Cooldown** → fixed at the goat horn's 7 s (`instrument.use_duration`). For a different value you
  must use a **custom instrument** with a different `use_duration` (a dynamic registry — needs a server
  restart, not `/reload`); the `use_cooldown` component does nothing on goat horns.
- **Durability** → `max_damage` on the item + the `-0.0625` (−1/16) in `horn_wear.json` + the two
  `matches 16..` break checks in `horn/fire` and `apply_wear`. Keep all four in sync.
- **First entity only** (vs whole line) → stop the ray after the first `horn/hit`.

## Verify in-game (assumptions worth a quick check)

- An advancement **reward function runs with `@s` = the player** (fallback if not: grant a tag and
  act from a tick scan).
- `using_item` fires for a goat horn and the score gate yields exactly **one** boom per blow.
- `minecraft:use_cooldown` does **not** apply to goat horns (verified) — they use a hardcoded
  `instrument.use_duration × 20` cooldown (7 s). Edge-detection + the native cooldown is used instead.
  regardless).
- The item predicate / `if items` syntax and the `set_components` loot stamp produce a working horn.
