# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Persona

The persona/answer style lives in `.claude/rules/persona.md`, which Claude Code auto-loads every session (it's an unconditional rule — `alwaysApply: true` and no `paths:` key). It defines an expert Minecraft Java Edition 1.18+ server admin: exact copy-paste syntax, version-specific notes, no legacy workarounds unless asked, distinguish Fabric/Forge/NeoForge/vanilla.

## Custom Content Catalog

`docs/CUSTOM_FEATURES.md` is the index of all custom content — items/recipes, dimensions, enchantments, books, mechanics, and which `docs/` file details each. Start there to see what exists.

## What This Project Does

This is a **Minecraft Datapack Generator** for a custom world called **Madagascar**. It programmatically generates `.mcfunction` files (Minecraft command scripts) from JSON configuration data. It supports multiple dimensions: Overworld, Nether, The End, Canvas, Skyblock, Caves, Sky Islands, Waterworld, and Dynamite.

The live server runs vanilla Minecraft **26.1.2** at `D:\jakarta-vanilla-26.1.2\`. Generated packs land in that world's `datapacks/jakarta_pack/` folder.

## Running the Project

```bash
# Generate all datapack files (writes to the configured Minecraft world path)
node index.js

# Start the HTTP server for on-demand generation (port 3000)
node server.js

# Generate keyboard shortcut commands
node scripts/keyboard.js

# Watch for changes and auto-regenerate (requires nodemon)
nodemon
```

There are no tests (`npm test` exits with an error, no test suite exists).

## Live Server (RCON access)

The live server at `D:\jakarta-vanilla-26.1.2` runs with **RCON enabled**, so its console can be driven remotely — most usefully to run `/reload` after `node index.js live` instead of waiting for the player to type it, plus `data get` / `give` / `summon` for verification. Ports (from `server.properties`): RCON `25575`, game `25577`, query `25565`.

- **The RCON password lives in `server.properties` only — never copy it into this repo** (CLAUDE.md, scripts, commit messages). `server.properties` sits outside the repo, under the server dir.
- **Treat RCON as an outward action on a production host: confirm with the user before sending commands** (a permission gate also guards it). It is not implied by the user merely *asking whether* access exists.
- **RCON runs from the console with no player context** — target players explicitly (`@a`, name, or coords), and you **cannot observe gameplay visually**. Player-facing tests (e.g. "throw a fire charge while flying") still need a human in-game; the console can only `/reload` and run/inspect commands.
- **What `/reload` does and doesn't pick up:** functions, recipes, tags, loot tables, advancements, predicates, and item modifiers reload live; dynamic registries (enchantments, dimensions, damage types, worldgen) need a server **restart** (see `.claude/rules/rebuild.md`).

## Environment Setup

Fill out `.env` with real paths before running any script. The generator writes output to the paths defined there.

- `BASE_PATH` — parent directory the generator writes into (the world's `datapacks/` folder for live)
- `PACK_FOLDER` — pack folder name appended onto `BASE_PATH` (e.g. `jakarta_pack`)

**Target switching:** `index.js` picks the target from CLI arg → `TARGET` env → `'test'` default. `server.js` reads `TARGET` env (defaults to `test`). When the target is `test`, both entry points layer `.env.test` on top of `.env` with `override:true` — so anything in `.env.test` (typically a sandbox `BASE_PATH=D:\Code\.temp`) wins, and everything else falls through to `.env`. Files:

- `.env` — shared / live values, always loaded
- `.env.test` — test overrides, loaded on top of `.env` only when `TARGET=test`
- Both gitignored; scaffolds tracked as `.env.example` and `.env.test.example`

`index.js` refuses to run if `BASE_PATH` or `PACK_FOLDER` is unset after the load, and `creator.destroy()` will refuse to delete any directory that contains `package.json`, `.git`, or `node_modules` (it once wiped the project root when an env var was undefined).

## Scratch Output and Test Builds

`.temp/` is the single scratch directory. Two distinct uses share it:

1. **Generator test target.** With `TARGET=test` (the default), `index.js` writes the regenerated pack to `TEST_BASE_PATH/TEST_PACK_PATH`, which is set to `.temp/jakarta_pack/`. `creator.destroy()` wipes **that subdirectory** on every run — never store anything you want to keep inside `.temp/jakarta_pack/`.
2. **Loose scratchpad.** Everything else under `.temp/` (anywhere outside `jakarta_pack/`) is safe scratch space. Drop log files, ad-hoc test outputs, NBT/JSON dumps, and other throwaway artifacts there. Do **not** drop them in the project root or in source dirs (`app/`, `pack/`, `scripts/`).

## Architecture

### Two Entry Points

1. `index.js`, CLI: instantiates `Generator`, calls all generation methods, writes files
2. `server.js`, Express server with three responsibilities:
   - `GET /` — status page (pings the Minecraft server TCP port, shows ONLINE/OFFLINE, links to `/add-location`)
   - `GET /status.json` — JSON variant of the status check
   - `GET /add-location` and `POST /add-location` — web form for adding entries to either the Exploration Book (writes `data/exploration.json`) or the Magic Book (writes a chosen group in `data/locations.json`). Auto-runs `generator.create()` after a successful POST so the pack rebuilds before `/reload`.
   - A list of generator endpoints under the `endpoints` array (book, locations, inventory, etc.) that trigger individual generators on demand. Each one re-reads its JSON data file, so web-driven edits are picked up without restarting the server.

### Core Flow

```
JSON data files (data/*.json)
    |
app/*.js modules, each handles one game system, builds Minecraft commands
    |
util/command.js, fluent command builder (append, comment, scoreboard ops)
util/game.js,    shared game patterns (countdowns, lobby, scoreboards)
util/page.js,    written book page formatting
    |
app/creator.js,  writes .mcfunction files to the configured output path
```

### App Modules

Each file in `app/` corresponds to a Minecraft game feature:

1. `generator.js`, orchestrates all other modules
2. `softcore.js`, softcore mode game functions
3. `dynamite.js`, dynamite game mode
4. `book.js`, written book give commands (God + Magic books)
5. `exploration.js`, standalone Coordinates book (flat entries list, paginated 12/page, dim-colored)
6. `location.js`, waypoint/location functions
7. `swapper_tools.js`, tool swapping mechanics
8. `swapper_armor.js`, armor swapping mechanics
9. `swapper_shulker.js`, shulker container management
10. `inventory.js`, inventory import/export/stash (stash places chest + barrel in front of player, sorts equipment to chest, rest to barrel)
11. `ender.js`, ender chest summoning — places/destroys an ender chest 2 blocks in front of player, tracked by a marker entity
12. `playerhead.js` / `resource.js` / `operator.js` / `template.js`, supporting utilities
13. `backup.js`, world backup helpers
14. `load.js` / `tick.js`, singleton Command instances for load/tick functions
15. `creator.js`, file writer, manages output directory structure

`load.js` and `tick.js` use a **singleton pattern** (`static getInstance()`) because the load and tick functions must be shared across modules.

### Data Files (`data/`)

All configuration is externalized to JSON:

1. `config.json`, master config: namespace (`minecraft:jakarta`), folder names, dimension IDs, item IDs, teams, scoreboards, game rules, storage paths
2. `locations.json`, Magic Book waypoints grouped by header (Bases, Landmarks, Dimensions, Farms, etc.)
3. `exploration.json`, Coordinates Book flat entries list (`{label, dim, x, y, z}`), written by `/add-location`
4. `objectives.json`, scoreboard objective definitions (kills, stats, time, distance)
5. `book.json`, written book content (titles, pages, game mode options, inventory block)
6. `directions.json`, y_rotation ranges + offsets for "place block in front of player" (ender chest, stash chest/barrel)
7. `equipment.json`, items that the Stash function captures into the chest by id (all tool tiers, bow/crossbow/trident/mace/shield/elytra/shears/etc.). Armor + offhand are captured by slot index in the function, not listed here.
8. `items.json`, the older curated loadout list still used by inventory/export
9. `tools.json` / `armor.json` / `shulkers.json`, equipment configurations for swapper modules
10. `resources.json`, supporting resource defs
11. `dynamite.json`, dynamite game mode settings
12. `killers.json`, mob/killer tracking definitions
13. `roman.json`, roman numeral mappings (used for scoreboard display)

### Dimensions (`dimensions/`)

Contains Minecraft dimension definition files for the custom dimensions that extend beyond vanilla: Canvas, Skyblock, Caves, Sky Islands, Waterworld (under `dimensions/dimension/`), plus Dynamite (defined in `pack/data/madagascar/dimension/dynamite.json`). Noise settings for Sky Islands and Waterworld live in `pack/data/madagascar/worldgen/noise_settings/`.

**Special spawners are gated by `dimension_type`, not dimension key.** Vanilla's special spawners — wandering trader, cat, pillager patrol, village siege, and **phantom** (insomnia) — run in any dimension whose `dimension_type` is `minecraft:overworld`, regardless of the dimension's own key. So custom dimensions that *reuse* the `minecraft:overworld` type get them; dimensions with a custom type do not:

- `minecraft:overworld` type → Skyblock, Canvas, Waterworld, **and now Sky Islands + Caves** (switched from their custom types on 2026-06-13 to enable phantoms/wandering-traders + sleeping) → **do** get traders/cats/patrols/phantoms.
- custom type → only Dynamite (`madagascar:dynamite`) → **doesn't**.

Verified by entity-file census (2026-06-13): skyblock's `entities/` held 25 wandering traders + 20 cats; caves — explored just as heavily (70 region files vs skyblock's 87) — had zero, matching the admin's experience of never seeing traders there. That proved the gate is the `dimension_type`, so Sky Islands + Caves were switched to `minecraft:overworld` to turn the spawners on. A dimension's `generator` (worldgen) is independent of its `dimension_type`, so switching the type **keeps the custom terrain** — Sky Islands still generates floating islands. The overworld type also gives `bed_works: true` (sleeping). Changing a `dimension_type` is a dynamic registry edit: it needs a **server restart**, not `/reload`. (Phantoms only ever come from the special spawner — no biome lists them.) Note: Skyblock is also a single-player world copied in, but the traders there are genuinely spawning, not imported.

### Output Structure

Generated `.mcfunction` files follow this path pattern:

```
{PACK_PATH}/data/jakarta/function/
|- load.mcfunction
|- tick.mcfunction
|- book/          <- god.mcfunction, magic.mcfunction, exploration.mcfunction
|- softcore/
|- location/
|- tool_swap/
|- shulker/
|- inventory/     <- import, export, stash
|- ender/         <- place, destroy, toggle
|- gate/          <- function gate wrappers (book, inventory_*, shulker_export, etc.)
```

## Key Conventions

1. **Namespace:** `minecraft:jakarta`, all functions are registered under this namespace
2. **Command building:** Use `util/command.js` for constructing Minecraft commands; it provides a fluent API for appending raw commands, adding comments, and building scoreboard operations
3. **JSON-driven:** Add new items, locations, or objectives by editing the relevant `data/*.json` file, the generators read these at runtime
4. **`todo.txt`** tracks one outstanding task: add `pack.mcdata` to the build process

## Minecraft Version Notes

Targeting vanilla **26.1.2** (live server). Mojang switched to calendar-based versioning in 2026: `YEAR.DROP.HOTFIX`, so `26.1` = first 2026 game drop, `26.1.2` = its second hotfix. 1.21.x is now legacy.

Format and behavior pins that affect generation:

1. Books use **item components**, not legacy NBT: `give @a written_book[written_book_content={pages:[...]}]`
2. Text components use **snake_case** event keys as of 1.21.5: `click_event` (not `clickEvent`) and the value key is now `command` (not `value`) for `run_command` actions. Same applies to `hover_event`.
3. Book pages inside `written_book_content` are objects of the form `{raw: '[{...}]'}`, not bare JSON strings.
4. **Pack metadata** (since 25w31a): `pack.mcmeta` accepts `min_format` / `max_format` (integer or `[major, minor]`) in addition to legacy `pack_format`. Current vanilla: data pack `[101, 1]`, resource pack `[84, 0]`.
5. **Villager trades** were rewritten in 26.1 to the `villager_trade` registry. Old 1.21.x trade datapacks fail validation on 26.x.
6. **World clocks** (26.1): `/time` requires `of <clock>` for non-overworld dimensions.
7. **Stricter item-stack validation**: items with conflicting component data are treated as empty on load.

### Item Tiers Worth Knowing for Generation

- **Tool tiers (7):** wooden, **copper** (added in The Copper Age, Sept 2025 / Java 1.21.9), stone, iron, golden, diamond, netherite. Tools: pickaxe, axe, shovel, hoe, sword.
- **Armor materials (6):** leather, chainmail, iron, golden, diamond, netherite, **copper**, plus turtle helmet.
- **Copper chests** are also a thing — separate item from regular chests.
- The Stash function (`inventory.js` → `equipment.json`) hard-codes the tool id list, so new tool tiers need to be added here when Mojang ships them.

## Features Worth Knowing

### Stash Inventory (book button on God page)

Places a chest + barrel in front of the player using the same y_rotation switch as `ender/place`. Captures armor (slots 100–103) and offhand (-106) into the chest by slot, plus any id listed in `equipment.json` into the chest by id. The rest of the player's inventory goes to the barrel. Switches the player to creative. No auto-restore — player retrieves manually.

Caveats: barrel silently drops overflow past 27 stacks; only the first matching stack per id goes to the chest.

### /add-location Web UI

`server.js` exposes a styled web form at `/add-location` that adds new entries to either:
- **Exploration Book** (`data/exploration.json`) — flat entry list, paginated 12/page, generated by `app/exploration.js`
- **Magic Book** (`data/locations.json`) — adds to a named group (existing or new), generates a `/function jakarta:location/<filename>` teleport

Both paths call `generator.create()` after writing so the pack rebuilds before the player runs `/reload`. Strips UTF-8 BOM on JSON read (PowerShell's `Set-Content -Encoding UTF8` writes one and `JSON.parse` rejects it).

### Custom projectile patterns (arrows, fireballs)

These features (bomb/lightning/charged-bomb/frost arrows, throwable fire charge) all work by marking a thrown vanilla item, detecting the entity each tick, and handing behavior back to vanilla. Two hard-won rules — **lean on vanilla's collision and owner mechanics; don't reinvent them:**

1. **Detect a direct entity hit with a vanilla-applied marker effect, never proximity polling.** Make the projectile a `tipped_arrow` whose `potion_contents.custom_effects` carries a hidden marker — an inert effect at `amplifier:100` (bomb=`weakness`, lightning=`mining_fatigue`, charged=`unluck`; kept distinct per projectile so they don't cross-trigger, and clear of frost's `slowness`/`glowing`). Vanilla collision applies it on a *real* hit, so a tick rule detonates any entity carrying the marker, then clears it — run *as the victim*, and **never `kill @s`** (the blast deals the damage). A `distance=..2` proximity fuse is unreliable: a drawn arrow flies ~3 b/t, so the once-per-tick sample tunnels past the target *and* false-triggers near bystanders. Block-landing detection stays a separate detector (`inGround:1b` on the marked arrow) and is unaffected.

2. **A summoned projectile that must pass through its thrower needs an `Owner`.** When converting a snowball into a `minecraft:fireball` (or similar), copy the source entity's `Owner` UUID onto the spawned projectile (`data modify entity <new> Owner set from entity @s Owner`). Vanilla's "a projectile can't hit its own shooter until it has left the shooter's hitbox" grace **only applies when an `Owner` is set** — without it, a projectile spawned on top of the player detonates on them, most visibly when **flying** (thrower and projectile co-move at flight speed and never separate). `Owner` is a stable base-`Projectile` field (CamelCase), unaffected by the 26.x snake_case migrations.
