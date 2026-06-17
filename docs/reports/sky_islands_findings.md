# Sky Islands dimension — research findings

Goal: a `madagascar:sky_islands` dimension that looks like floating islands in the void, with varied biomes. As close to "Aether-style" as possible without writing custom worldgen from scratch.

## What we tried and what each failure actually meant

### Attempt 1 — `floating_islands` noise + multi_noise overworld preset
**Result:** all chunks were `plains` + `river`.
**Cause:** `/reload` doesn't refresh dimension/worldgen configs (only server restart does). The "fresh" chunks were still using the original config baked in at server-start time. Not a config error — a deployment ordering error.

### Attempt 2 — `floating_islands` noise + multi_noise with 7 single-point biomes
**Result:** 100% meadow.
**Cause:** see the big finding below — `floating_islands` makes every block report the same climate, so multi_noise always picks the single biome closest to (0,0,0,0,0,0). Meadow at T=0.2/H=0 wins everywhere.

### Attempt 3 — `amplified` noise + multi_noise with parameter ranges
**Result:** "water world."
**Cause:** `amplified` (the noise_settings preset) has `aquifers_enabled: true` and a normal sea_level. Amplified terrain has huge vertical swings, so most of the surface is below sea level → ocean. Biome ranges were probably working, but the user was standing in ocean.

## The big finding

Vanilla `minecraft:floating_islands` noise_settings hardcodes EVERY climate noise to a constant:

```json
"noise_router": {
    "continents":  0.0,
    "depth":       0.0,
    "erosion":     0.0,
    "temperature": 0.0,
    "vegetation":  0.0,
    "ridges":      0.0,
    ...
}
```

Multi_noise picks biomes by sampling these noise functions at each block and finding the biome whose parameters best match. **When every sample is (0, 0, 0, 0, 0, 0), every block picks the same biome.** That's why vanilla The End uses `biome_source: {"type": "minecraft:the_end"}` (fixed) — multi_noise wouldn't work there.

This is the core blocker. You can keep iterating on biome ranges forever and you'll only ever get one biome out of vanilla `floating_islands`.

## How biome selection actually works (relevant bits only)

- The noise generator's `noise_router` produces 6 climate values per block: temperature, vegetation (humidity), continents (continentalness), erosion, depth, ridges (weirdness)
- `biome_source: multi_noise` picks the biome whose `parameters` are closest to those samples (Euclidean in 6D climate space)
- Parameters can be points (e.g. `0.5`) or ranges (e.g. `[-0.2, 0.3]`). Ranges = "match this entire box of climate space"
- **Surface rules cannot create air or void.** They only assign which block goes in already-solid positions. So worry about geometry comes from noise_router, not biome surface_rules

## How `floating_islands` produces islands

Its `final_density` function uses `y_clamped_gradient` (Y=4 → Y=32) multiplied by `end/base_3d_noise` and squeezed into a density function. The 3D noise produces "stone here / void there" patches; the y-gradient confines terrain to a narrow Y band; `aquifers_enabled: false` means void stays void instead of filling with water. Critically: this geometry **does not depend on the climate noises** — those can vary freely without breaking the islands.

## The fix — fork the noise_settings

Copy `minecraft:floating_islands` into our namespace, replace the climate constants with actual noise functions, leave the geometry alone.

### File: `pack/data/madagascar/worldgen/noise_settings/sky_islands.json`

Same as `floating_islands.json` except in `noise_router`:

| Field | Vanilla | New |
|---|---|---|
| `temperature` | `0.0` | shifted_noise referencing `minecraft:temperature` |
| `vegetation` | `0.0` | shifted_noise referencing `minecraft:vegetation` |
| `ridges` | `0.0` | reference to `minecraft:overworld/ridges` (gives weirdness variety) |
| `continents` | `0.0` | **keep 0.0** (preserves island geometry; not needed for biome selection if our biomes use full continents range) |
| `erosion` | `0.0` | **keep 0.0** (same reasoning) |
| `depth` | `0.0` | **keep 0.0** (geometry-critical) |
| `final_density`, sea_level, surface_rule, etc. | unchanged | unchanged |

The exact replacement values for temperature/vegetation match what `minecraft:overworld` uses:

```json
"temperature": {
    "type": "minecraft:shifted_noise",
    "noise": "minecraft:temperature",
    "shift_x": "minecraft:shift_x",
    "shift_y": 0,
    "shift_z": "minecraft:shift_z",
    "xz_scale": 0.25,
    "y_scale": 0
}
```

`vegetation` is the same template with `"noise": "minecraft:vegetation"`. `ridges` is the string reference `"minecraft:overworld/ridges"`.

### File: `pack/data/madagascar/dimension/sky_islands.json`

Change the noise settings reference:

```diff
- "settings": "minecraft:floating_islands",
+ "settings": "madagascar:sky_islands",
```

Keep the multi_noise biome_source with parameter **ranges** (not points) that cover the T/H/W space we expect. With continents/depth/erosion all 0, only T, H, and W matter for biome selection.

## Expected result

- Geometry: actual floating islands in void (same as vanilla End outer islands but with overworld blocks and biomes)
- Biomes: varied based on real climate noise — meadow, cherry_grove, jungle, etc. distributed across the islands
- No water filling void (aquifers off, sea_level -64)
- Surface composition: each island's surface uses its biome's surface rules (grass+dirt for meadow, etc.) — that's fine because surface rules only fill the solid parts, not the void

## What this won't give us

- Hand-shaped islands (Aether's curated archipelago) — those require custom density functions
- Special "sky" features like Aether-style cliffs, custom trees, custom mobs
- Bottom-of-island look (it'll just be stone from below)

## Estimated work

15-25 min total:
- ~10 min to fork floating_islands.json and patch noise_router (mostly mechanical)
- ~5 min for dimension JSON update + biome ranges
- ~5 min for deploy + restart + chunk wipe + verification

## Workflow gotchas this exposed

To add to `docs/reports/26x_datapack_gotchas.md`:

1. **Dimension/worldgen configs don't hot-reload.** `/reload` only refreshes functions, tags, recipes, advancements. Dimension JSON, biome JSON, noise_settings JSON all require a full server restart. Editing then `/reload`ing is silently wrong — new chunks still use the old config until restart.

2. **Backups inside `world/datapacks/` are loaded as datapacks.** Naming a backup `madagascar_pack.bak.<timestamp>` and leaving it next to the live pack means Minecraft tries to load it. If the backup is from an older schema, the broken pack kills the entire server load (not just its own contents). Backups go in `D:\Backup\YYYY.MM.DD\`, never inside `world/datapacks/`.

3. **`level.dat` remembers enabled packs across restarts.** When a pack disappears from disk you get `Missing data pack file/<name>` warnings every server start until you `/datapack disable` it and `/save-all`.

4. **`minecraft:floating_islands` cannot pair with multi_noise.** Its noise_router zeros out all climate noises, so multi_noise always selects the same biome. Use `the_end` (fixed) biome_source with vanilla floating_islands, OR fork the noise_settings into your namespace and replace the climate constants with actual noise functions.

5. **`minecraft:amplified` has aquifers enabled.** Pairing it with a high sea_level makes most low terrain into ocean. Either set `sea_level: -64` in a forked noise_settings, or use `minecraft:overworld` / `minecraft:large_biomes` for normal land/water balance.

6. **`aquifers_enabled: false` is required** for any "void with islands" geometry. Otherwise void below the surface fills with water and you get "ocean dimension."
