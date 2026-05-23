# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Persona

Read `SOUL.md` at the start of every session and adopt the persona/answer style it defines (expert Minecraft Java Edition 1.18+ server admin: exact copy-paste syntax, version-specific notes, no legacy workarounds unless asked, distinguish Fabric/Forge/NeoForge/vanilla).

## What This Project Does

This is a **Minecraft Datapack Generator** for a custom world called **Madagascar**. It programmatically generates `.mcfunction` files (Minecraft command scripts) from JSON configuration data. It supports multiple dimensions: Overworld, Nether, The End, Canvas, Skyblock, and Dynamite.

## Running the Project

```bash
# Generate all datapack files (writes to the configured Minecraft world path)
node index.js

# Start the HTTP server for on-demand generation (port 3000)
node server.js

# Generate keyboard shortcut commands
node keyboard.js

# Watch for changes and auto-regenerate (requires nodemon)
nodemon
```

There are no tests (`npm test` exits with an error, no test suite exists).

## Environment Setup

Fill out `.env` with real paths before running any script. The generator writes output to the paths defined there. `index.js` will refuse to run if `BASE_PATH` or `PACK_PATH` is unset, and `creator.destroy()` will refuse to delete any directory that contains `package.json`, `.git`, or `node_modules` (it once wiped the project root when an env var was undefined).

## Architecture

### Two Entry Points

1. `index.js`, CLI: instantiates `Generator`, calls all generation methods, writes files
2. `server.js`, Express API with endpoints under `/export/` (e.g. `GET /export/book`, `GET /export/locations`) that trigger individual generators on demand

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
2. `hardcore.js`, hardcore mode game functions
3. `dynamite.js`, dynamite game mode
4. `book.js`, written book give commands
5. `location.js`, waypoint/location functions
6. `swapper_tools.js`, tool swapping mechanics
7. `swapper_armor.js`, armor swapping mechanics
8. `swapper_shulker.js`, shulker container management
9. `inventory.js`, inventory import/export
10. `ender.js`, end dimension utilities
11. `load.js` / `tick.js`, singleton Command instances for load/tick functions
12. `creator.js`, file writer, manages output directory structure

`load.js` and `tick.js` use a **singleton pattern** (`static getInstance()`) because the load and tick functions must be shared across modules.

### Data Files (`data/`)

All configuration is externalized to JSON:

1. `config.json`, master config: namespace (`minecraft:madagascar`), folder names, dimension IDs, item IDs, teams, scoreboards, game rules
2. `locations.json`, waypoint coordinates by dimension
3. `objectives.json`, scoreboard objective definitions (kills, stats, time, distance)
4. `book.json`, written book content (titles, pages, game mode options)
5. `shulkers.json`, `armor.json`, `tools.json`, equipment configurations
6. `dynamite.json`, dynamite game mode settings
7. `killers.json`, mob/killer tracking definitions
8. `roman.json`, roman numeral mappings (used for scoreboard display)

### Dimensions (`dimensions/`)

Contains Minecraft dimension definition files for the custom dimensions (Canvas, Skyblock, Dynamite) that extend beyond vanilla.

### Output Structure

Generated `.mcfunction` files follow this path pattern:

```
{PACK_PATH}/data/minecraft/madison/function/
|- load.mcfunction
|- tick.mcfunction
|- book/
|- hardcore/
|- location/
|- tool_swap/
|- shulker/
|- inventory/
|- ender/
|- gate/          <- function gate wrappers
```

## Key Conventions

1. **Namespace:** `minecraft:madagascar`, all functions are registered under this namespace
2. **Command building:** Use `util/command.js` for constructing Minecraft commands; it provides a fluent API for appending raw commands, adding comments, and building scoreboard operations
3. **JSON-driven:** Add new items, locations, or objectives by editing the relevant `data/*.json` file, the generators read these at runtime
4. **`todo.txt`** tracks one outstanding task: add `pack.mcdata` to the build process

## Minecraft Version Notes

Targeting **1.21.6**. Important format changes vs. older versions:

1. Books use **item components**, not legacy NBT: `give @a written_book[written_book_content={pages:[...]}]`
2. Text components use **snake_case** event keys as of 1.21.5: `click_event` (not `clickEvent`) and the value key is now `command` (not `value`) for `run_command` actions. Same applies to `hover_event`.
3. Book pages inside `written_book_content` are objects of the form `{raw: '[{...}]'}`, not bare JSON strings.
