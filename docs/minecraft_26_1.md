# Minecraft Java Edition 26.1 — Datapack & Book Notes

Research notes for upgrading this datapack to **Minecraft Java Edition 26.1** (the release line after `1.21.x`). Focused on items affecting the Madagascar generator — books, text components, datapack format, and file layout.

> Sources (all `minecraft.wiki`): [Java Edition 26.1](https://minecraft.wiki/w/Java_Edition_26.1), [26.1 dev versions](https://minecraft.wiki/w/Java_Edition_26.1/Development_versions), [Pack format](https://minecraft.wiki/w/Pack_format), [Data component format / written_book_content](https://minecraft.wiki/w/Data_component_format/written_book_content), [Data pack](https://minecraft.wiki/w/Data_pack).

---

## 1. Versioning Scheme

Mojang dropped the `1.21.x` prefix. New releases are labelled `YY.M[.patch]` (year + monthly cadence):

| Version | data pack format | Resource pack format |
| --- | --- | --- |
| 1.21.5 | `71` | — |
| 1.21.6 | `80` | — |
| 1.21.7 / 1.21.8 | `81` | — |
| 1.21.9 / 1.21.10 | `88.0` | — |
| 1.21.11 | `94.1` | — |
| **26.1 — 26.1.2** | **`101.0` – `101.1`** | **`84.0`** |

At 1.21.9 Mojang split the format value into a **major.minor** pair (minor bumps = non-breaking additions; major bumps = breaking changes). At 26.1 they also dropped the single `pack_format` JSON field — **a JSON float like `101.1` is not a valid value** and the pack fails to load on server start. Modern `pack.mcmeta` uses two integer-pair fields, `min_format` and `max_format`, to express the compatible range:

```json
{
    "pack": {
        "description": "Madagascar",
        "min_format": [101, 0],
        "max_format": [101, 1]
    }
}
```

`min_format` / `max_format` are arrays of two integers (`[major, minor]`). The server picks a format somewhere in the inclusive range. Older clients still respect the major version — refusing packs whose `min_format` major exceeds theirs.

---

## 2. Written Book Component (`minecraft:written_book_content`)

**No breaking changes to the book component itself between 1.21.5 and 26.1.** The component format introduced in 1.20.5 and refined in 1.21.5 is still current.

### Component shape

```
give @a written_book[written_book_content={
    title: { raw: "Book of the Damned XIII" },   // or just a string
    author: "DoubleDome",
    generation: 0,                                // 0=orig 1=copy 2=copy² 3=tattered
    resolved: true,                               // pre-resolve text components server-side
    pages: [
        { raw: "[{...text component json...}]" },
        { raw: "Plain text page" }
    ]
}, lore=[ '[{"text":"..."}]' ]]
```

### Field rules

| Field | Notes |
| --- | --- |
| `title` | Either a string or `{raw, filtered}`. Max 32 chars. Empty string is ignored. |
| `author` | Plain string. |
| `generation` | Int 0–3. **>1 cannot be copied.** This repo currently sets `3`, which makes the books non-copyable — intentional, keep. |
| `resolved` | If `true`, server pre-evaluates text components (selectors, scores, etc.) on first open. Set `true` for books with dynamic components; safe to set `true` always. |
| `pages` | Array of either bare strings (auto-wrapped to `{raw:...}`) or `{raw, filtered}`. **`raw` is a stringified text-component JSON array** — that's why this repo wraps each page in `'[...]'`. |

### Text components inside pages (1.21.5+ rename, unchanged in 26.1)

Old (pre-1.21.5) keys are **dead**. The keys/values in use now:

| Action | Old (≤1.21.4) | Current (1.21.5 → 26.1) |
| --- | --- | --- |
| Click handler | `clickEvent` | `click_event` |
| `run_command` payload | `value` | `command` |
| `open_url` payload | `value` | `url` |
| `change_page` payload | `value` | `page` |
| `copy_to_clipboard` payload | `value` | `value` *(unchanged)* |
| Hover handler | `hoverEvent` | `hover_event` |
| Hover `show_text` payload | `value` | `value` *(unchanged)* |
| Hover `show_item`/`show_entity` payload | `value` / `contents` | `id` + fields directly |

Example (correct for 26.1):

```json
{
    "text": "Survival Mode",
    "color": "dark_green",
    "click_event": { "action": "run_command", "command": "/gamemode survival @s" }
}
```

---

## 3. Data Pack Folder Layout

### `data/<namespace>/function/...` — **unchanged**

`.mcfunction` files still live under `data/<namespace>/function/...`. The Madagascar generator already writes there — no change needed.

### `world/data/` — **now namespaced** (NEW in 26.1)

Per the 26.1 release notes: *"Data saved in the world's `data` folder is now namespaced. All that data will now be stored in a namespace subfolder."*

This affects the **world save**, not the datapack output. The Madagascar generator does not write to `world/data/`, so no code change. Flag if you ever add scoreboard/structure dumps that read from `level.dat`-adjacent dirs.

---

## 4. Other 26.1 Schema / Behaviour Changes

### 4.1 Loot tables — `set_lore` requires explicit `mode`

The `replace: true / false` boolean on `minecraft:set_lore` is **gone**. Modern entries must specify a `mode` field:

| Old | New |
| --- | --- |
| `"replace": true` (or omitted, which defaulted to true) | `"mode": "replace_all"` |
| `"replace": false` | `"mode": "append"` |

Without this the loot table fails to load with `No key mode in MapLike`. Discovered in production via `pack/data/madagascar/loot_table/get_player_head.json` — 60 entries needed conversion. Other modes documented for `set_lore`: `insert`, but `replace_all` / `append` cover the common cases.

### 4.2 Custom dimension_types must have a dimension referencing them

If you define a `data/<ns>/dimension_type/<name>.json` but never reference it from a `data/<ns>/dimension/<name>.json` (`"type": "<ns>:<name>"`), the dimension_type is **orphan** — the dimension never gets created. In the Madagascar repo this surfaced as the `madagascar:dynamite` dimension_type with no matching dimension; the existing `dimension/dynamite.json` was pointing at `minecraft:overworld` and had to be redirected to `madagascar:dynamite`.

### 4.3 Informational — additions that don't affect this repo

- **Data-driven villager trades** under `data/<ns>/villager_trade/`
- **`minecraft:dye` data component** (16 colour values)
- **`world_clock` registry** — define data-driven clocks under `data/<ns>/world_clock/<id>.json`; `/time of <clock> set/add` syntax
- **New loot functions:** `minecraft:set_random_dyes`, `minecraft:set_random_potion`
- **New predicate / number provider:** `environment_attribute_check`, `environment_attribute`, `sum`
- **Block tag split:** `#dirt` no longer aggregates mud/moss/grass — use `#substrate_overworld` for the old behaviour
- **Mob inventory accessor:** `mob.inventory.*` replaces `villager.*` and `piglin.*` in selectors/data sources
- **Name tag is now craftable** (any nugget + paper)

---

## 5. Audit of Madagascar Book Exporter Against 26.1

Files involved: `app/book.js`, `data/book.json`, `util/page.js`, `pack/pack.mcmeta`.

### What's already correct

1. `app/book.js:21` — `give @a written_book[written_book_content=...]` syntax is right for 26.1.
2. `app/book.js:110` — location page links use `click_event` + `command` (1.21.5+ rename applied).
3. Pages are emitted as `'[...]'` raw strings inside the `pages:` array — matches the `{raw: "..."}` requirement (`'[...]'` is SNBT shorthand for `raw`).
4. `generation: 3` choice makes the book a tattered (non-copyable) artifact — intentional design.

### What still needs fixing for 26.1

1. **`pack/pack.mcmeta`** — `"pack_format": 34` is ancient (≈ 1.20.2). Must be **`101.1`** for 26.1. Without this the server will refuse to load the pack or warn loudly.
2. **`data/book.json`** — every embedded text component (the `modes`, `players`, `utility`, `softcore`, `inventory`, `pickaxe`, `axe`, `shovel`, `hoe`, `shears`, `flint` blocks) still uses the **old** `clickEvent`/`value` keys. These pages are currently dead code (the `switch` in `generatePages` is commented out, `book.js:34-43`), but if/when they're re-enabled they will silently fail in 26.1 because the server ignores unknown keys on text components. Rename to `click_event` / `command`. *(Done — `fd5a25d`.)*
3. **`app/book.js:84`** — `generateMetadata` hardcodes `generation:3` while accepting a `generation` parameter that's discarded. Either honor the param or drop it. Cosmetic, not a 26.1 blocker.
4. **`generatePages` magic/god pages disabled** (`app/book.js:35-43`) — if reactivating them, also re-test with 26.1 since they consume `book.json` content. Re-enabling without fixing point 2 will produce visually correct text but dead clicks. *(Done — magic page in `2610219`, god page in `0d71643`.)*

### Out of scope / leave alone

- Folder structure under `data/minecraft/madison/function/` — still correct for 26.1.
- World data namespacing — does not touch this repo.
- All other modules (locations, softcore, swapper, ender, etc.) — not part of book export. Audit separately if upgrading the whole pack.
