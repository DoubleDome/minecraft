# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Persona

Read `SOUL.md` at the start of every session and adopt the persona/answer style it defines (expert Minecraft Java Edition 1.18+ server admin: exact copy-paste syntax, version-specific notes, no legacy workarounds unless asked, distinguish Fabric/Forge/NeoForge/vanilla).

## What This Project Does

This is a **Minecraft Datapack Generator** for a custom world called **Madagascar**. It programmatically generates `.mcfunction` files (Minecraft command scripts) from JSON configuration data. It supports multiple dimensions: Overworld, Nether, The End, Canvas, Skyblock, Caves, Sky Islands, Waterworld, and Dynamite.

The live server runs vanilla Minecraft **26.1.2** at `D:\jakarta-vanilla-26.1.2\`. Generated packs land in that world's `datapacks/madagascar_pack/` folder.

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

## Environment Setup

Fill out `.env` with real paths before running any script. The generator writes output to the paths defined there.

- `BASE_PATH` — parent directory the generator writes into (the world's `datapacks/` folder for live)
- `PACK_FOLDER` — pack folder name appended onto `BASE_PATH` (e.g. `madagascar_pack`)

**Target switching:** `index.js` picks the target from CLI arg → `TARGET` env → `'test'` default. `server.js` reads `TARGET` env (defaults to `test`). When the target is `test`, both entry points layer `.env.test` on top of `.env` with `override:true` — so anything in `.env.test` (typically a sandbox `BASE_PATH=D:\Code\.temp`) wins, and everything else falls through to `.env`. Files:

- `.env` — shared / live values, always loaded
- `.env.test` — test overrides, loaded on top of `.env` only when `TARGET=test`
- Both gitignored; scaffolds tracked as `.env.example` and `.env.test.example`

`index.js` refuses to run if `BASE_PATH` or `PACK_FOLDER` is unset after the load, and `creator.destroy()` will refuse to delete any directory that contains `package.json`, `.git`, or `node_modules` (it once wiped the project root when an env var was undefined).

## Scratch Output and Test Builds

`.temp/` is the single scratch directory. Two distinct uses share it:

1. **Generator test target.** With `TARGET=test` (the default), `index.js` writes the regenerated pack to `TEST_BASE_PATH/TEST_PACK_PATH`, which is set to `.temp/madagascar_pack/`. `creator.destroy()` wipes **that subdirectory** on every run — never store anything you want to keep inside `.temp/madagascar_pack/`.
2. **Loose scratchpad.** Everything else under `.temp/` (anywhere outside `madagascar_pack/`) is safe scratch space. Drop log files, ad-hoc test outputs, NBT/JSON dumps, and other throwaway artifacts there. Do **not** drop them in the project root or in source dirs (`app/`, `pack/`, `scripts/`).

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

1. `config.json`, master config: namespace (`minecraft:madagascar`), folder names, dimension IDs, item IDs, teams, scoreboards, game rules, storage paths
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

### Output Structure

Generated `.mcfunction` files follow this path pattern:

```
{PACK_PATH}/data/madagascar/function/
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

1. **Namespace:** `minecraft:madagascar`, all functions are registered under this namespace
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
- **Magic Book** (`data/locations.json`) — adds to a named group (existing or new), generates a `/function madagascar:location/<filename>` teleport

Both paths call `generator.create()` after writing so the pack rebuilds before the player runs `/reload`. Strips UTF-8 BOM on JSON read (PowerShell's `Set-Content -Encoding UTF8` writes one and `JSON.parse` rejects it).
