# 26.x Datapack Gotchas

Notes from migrating the madagascar_pack from a 1.21.x-era format to 26.1.2. Two halves: schema-level gotchas that bit us (would apply to any datapack), and pipeline gotchas specific to this repo.

---

## Vanilla 26.x schema gotchas

### `pack.mcmeta` format
Old `pack_format: <integer>` is being phased out in favor of `min_format` / `max_format`. For 26.1 the data-pack format is `[101, 0]` to `[101, 1]`:

```json
{
    "pack": {
        "description": "...",
        "min_format": [101, 0],
        "max_format": [101, 1]
    }
}
```

A float like `pack_format: 101.1` is *not* valid — it gets silently coerced and the pack misbehaves.

### Folder rename: plurals → singulars
1.21 renamed every legacy plural data-pack folder. None of these load on 26.x at the old path:

| Old (legacy) | New (26.x) |
| --- | --- |
| `data/<ns>/loot_tables/` | `data/<ns>/loot_table/` |
| `data/<ns>/item_modifiers/` | `data/<ns>/item_modifier/` |
| `data/<ns>/advancements/` | `data/<ns>/advancement/` |
| `data/<ns>/loot_tables/blocks/<block>.json` | `data/<ns>/loot_table/blocks/<block>.json` |
| `data/<ns>/loot_tables/entities/<mob>.json` | `data/<ns>/loot_table/entities/<mob>.json` |
| `data/minecraft/tags/functions/` | `data/minecraft/tags/function/` |

When in doubt: the registry id is singular, the folder is singular.

### `set_lore` needs a `mode` key (1.21.5+)
The old `"replace": true|false` boolean is gone. Every `minecraft:set_lore` entry needs an explicit `mode`:

| Old | New |
| --- | --- |
| `"replace": true` (or absent) | `"mode": "replace_all"` |
| `"replace": false` | `"mode": "append"` |
| — | `"mode": "insert"` / `"mode": "replace_section"` (new) |

A loot table that omits `mode` fails to parse with `"No key mode in MapLike[...]"` and the whole table goes dark.

### Item NBT predicates: `tag:{...}` → `components:{...}`
Pre-1.20.5 item NBT used `tag:{display:{Name:"..."}}`. 26.x uses components. Both the NBT path predicate **and** the `clear`/`give` bracket selector changed:

```mcfunction
# data / execute if data (NBT context)
data modify storage <ns> <path> set from entity @s Inventory[{id:"minecraft:yellow_shulker_box",components:{"minecraft:custom_name":"Basics"}}]

# clear / give (component bracket selector context)
clear @s minecraft:yellow_shulker_box[custom_name="Basics"] 1
```

The NBT context wants `components:{"minecraft:custom_name":...}` (full namespaced key, double quotes). The bracket selector wants `[custom_name=...]` (short form, no namespace).

### `minecraft:custom_name` storage format is **not** what you think
When Minecraft auto-migrates a pre-1.20.5 `tag.display.Name` to the new component, it usually stores the value as a **plain string**, not a JSON text component:

```
"minecraft:custom_name": "Construction"            # ← what's actually stored (after migration)
"minecraft:custom_name": "{\"text\":\"...\"}"      # ← JSON-string form, sometimes seen
"minecraft:custom_name": {text:"..."}              # ← compound form, sometimes seen
```

If you match against the wrong form, your predicate silently never matches. Bias toward dumping the storage with `/data get entity @s EnderItems[<N>].components."minecraft:custom_name"` and inspecting the actual form before generating predicates.

When the format is mixed across items (some plain, some compound, some JSON-string), the cleanest read is to **skip name matching entirely** and iterate slots:

```mcfunction
data modify storage <ns> tmp_list append from entity @s EnderItems[{Slot:0b}].components."minecraft:custom_name"
data modify storage <ns> tmp_list append from entity @s EnderItems[{Slot:1b}].components."minecraft:custom_name"
... 27 slots
```

`append from` accepts a multi-value source. Empty slots / missing components produce zero values and are no-ops.

### Book pages: `{raw:'<json string>'}` → `{raw: <text component>}`
This was the **biggest** time-sink. In 1.21.5+ each entry in `written_book_content.pages` is a filterable text component:

```
pages: [{raw: <text_component>, filtered?: <text_component>}, ...]
```

`<text_component>` is a **direct text component** — a list, compound, or string (interpreted as plain text). It is **NOT** a JSON-string that gets re-parsed.

```
# WRONG (renders as literal JSON in the book)
pages:[{raw:'[{"text":"hello"}]'}]

# RIGHT
pages:[{raw:[{"text":"hello"}]}]
```

Same rule for `lore`: each entry is a direct text component, not a JSON-string of one. Pre-1.21.5 the string was JSON-auto-parsed if it started with `[` or `{`; that ambiguity was removed.

### The four-layer escape stack (book / tellraw)
After the JSON-string layer was removed, escapes have to survive three layers instead of four:

| Layer | Reads | Common escapes |
| --- | --- | --- |
| 1. JS / generator source | source code | `\\n` = `\n` in string |
| 2. JS runtime string → file write | string contents | (none, written verbatim) |
| 3. SNBT parser (mcfunction read) | file bytes inside `"..."` | `\\` → `\`, `\n` → newline (1.21.5+), `\"` → `"` |
| 4. Text component renderer | parsed string | does **not** process `\n` or `\u` |

For a newline in book/tellraw text: the file should contain `\n` (2 chars: `\` + `n`), so SNBT parses it to a real newline character (1 byte 0x0A), which the renderer prints as a line break. In JS source that's `'\\n'`.

For a Unicode symbol: **use the literal UTF-8 character in source** (e.g. `▶`, `○`, `≫`). Don't use `▶`-style escapes — they survive to the renderer as literal text since neither SNBT nor the text renderer process `\u`.

Pre-1.21.5 the JSON-string layer interpreted `\n` and `\u` for you. Removing that layer means escapes that worked then now don't.

### Snake_case event keys (1.21.5+)
```
"clickEvent" → "click_event"
"hoverEvent" → "hover_event"
```
And the value field for `run_command`:
```
{"action":"run_command","value":"/give ..."} → {"action":"run_command","command":"/give ..."}
```

### Tellraw chat throttle
~25 rapid `tellraw` calls in a single function hits the per-tick chat output cap and most get dropped silently. If you're listing many things, collect them into command storage with `data modify ... append`, then emit one final `tellraw` with `{"nbt":"list[]","storage":"<ns>","separator":", "}`. Single chat message, always survives.

### mcfunction can't iterate NBT
There's no `forEach` over an NBT list. To "loop" over enderchest slots / inventory / etc., enumerate by index:

```mcfunction
data modify storage <ns> out append from entity @s EnderItems[{Slot:0b}]...
data modify storage <ns> out append from entity @s EnderItems[{Slot:1b}]...
... 27 lines
```

Or by id filter (one command per known id). Macros (1.20.2+) let you parameterize, but the call site still has to specify N values.

### Command storage persists to a file
`data modify storage <ns> <path>` writes to `world/data/command_storage_<ns>.dat` — a binary NBT file on disk. Useful as a side channel for "export" or per-player backups. Readable by NBTExplorer / Universal Minecraft Editor / pynbt.

`/data get` always also writes its output to the server console, which the log captures as text. So you've got two file forms: binary `.dat` (structured) or the rolling `logs/latest.log` (text).

### `data get` doesn't take multi-value paths
`/data get entity @s EnderItems[{id:"..."}]` errors with "this argument accepts a single nbt value" when the filter matches more than one item. Use a specific index (`EnderItems[0]`) or filter narrowly enough to match one.

### `@a`/`@s` only see online players
Tag/scoreboard migrations via `tag @a[tag=old] add new` skip offline players. Their tags live in `world/playerdata/<uuid>.dat` and only come back into selector scope when they log in. Either run the migration while everyone's online, schedule it on a join event, or NBT-edit the offline files externally.

---

## Project pipeline gotchas (D:\Code → live server)

### The `pack/` directory is cloned verbatim
[`app/creator.js`](../app/creator.js) `clone(this.paths.pack, this.paths.base)` copies everything under [`pack/`](../pack/) into the output before any generator runs. To add a static asset (recipe, stub loot table, dimension JSON, hand-written .mcfunction that doesn't fit the generator pattern), just drop it in the right path under `pack/` and it ships.

### `creator.destroy` wipes the output dir on every `node index.js`
There's a sentinel-file guard that refuses to nuke a directory containing `package.json`, `.git`, or `node_modules`. The live `world/datapacks/madagascar_pack/` has none of those, so it WILL get wiped. Always back up the world (or at least the pack folder) before deploying. Anything hand-edited directly into the live pack is lost on next regen — port it back to `pack/` or the generator.

### `.env` and `git pull --rebase --autostash`
`.env` is gitignored but was historically tracked. Running `git rm --cached .env` to untrack it on the local side conflicts with upstream that still has it tracked — and the rebase-autostash cycle can silently delete `.env` from disk. Before pulling, copy `.env` aside (`cp .env .env.bak.predeploy`) and verify it's still there after. The blank template lives in `.env.example`.

### Verify text components in-game, not just in the log
A pack with malformed book pages, lore, or tellraw text loads cleanly — the server log shows no errors — but the content renders as raw JSON or literal escape codes in-game. `latest.log` only catches parse failures, never rendering bugs. After any change touching `app/book.js`, `app/swapper_shulker.js`, or any `tellraw`/lore emitter, **actually grab a book or run the function in-game** before declaring it deployed.

### Auto mode blocks `git push origin main`
Even with explicit user confirmation the harness classifier blocks direct pushes to the default branch. Options: push from a non-Claude terminal, add a Bash permission rule, or push to a feature branch + open a PR.

### Don't push to main while the server's loading the old pack
The pack-load happens once on server start (or `/reload`). If you deploy a new pack mid-session, anyone in-game with old books / old tags / old objectives is in a mixed state until they relog. For renames like hardcore→softcore: stop the server, deploy, run any migration helper function, then restart cleanly.

### Where one-shot helpers belong
Migration / cleanup mcfunctions (e.g. `migrate_softcore.mcfunction`) go in `pack/data/madagascar/function/` so they survive `node index.js` regens. They're idempotent enough to be re-run anytime, and live there until the migration is universally done at which point they can be deleted from source.

### Backup convention
World backups live in `D:\Backup\YYYY.MM.DD\` — the date folder IS the world root (contains `level.dat`, `region/`, etc. directly, not nested inside another `world/` folder). Match the convention when adding new backups. Use Windows `Move-Item` for cross-folder same-volume moves (it's a rename, not a copy — fast even for 16 GB).

### Server can't run during world backup
The world `session.lock` is held while the server is up. Copy succeeds if the server is stopped; if it's running, the lock file fails to copy with an IOException (one harmless 3-byte file). All real world data still copies.
