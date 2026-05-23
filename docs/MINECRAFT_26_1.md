# Minecraft Java Edition 26.1 — Datapack & Book Notes

Research notes for upgrading this datapack to **Minecraft Java Edition 26.1** (the release line after `1.21.x`). Focused on items affecting the Madagascar generator — books, text components, datapack format, and file layout.

> Sources (all `minecraft.wiki`): [Java Edition 26.1](https://minecraft.wiki/w/Java_Edition_26.1), [26.1 dev versions](https://minecraft.wiki/w/Java_Edition_26.1/Development_versions), [Pack format](https://minecraft.wiki/w/Pack_format), [Data component format / written_book_content](https://minecraft.wiki/w/Data_component_format/written_book_content), [Data pack](https://minecraft.wiki/w/Data_pack).

---

## 1. Versioning Scheme

Mojang dropped the `1.21.x` prefix. New releases are labelled `YY.M[.patch]` (year + monthly cadence):

| Version | `pack_format` (data) | Resource pack format |
| --- | --- | --- |
| 1.21.5 | `71` | — |
| 1.21.6 | `80` | — |
| 1.21.7 / 1.21.8 | `81` | — |
| 1.21.9 / 1.21.10 | `88.0` | — |
| 1.21.11 | `94.1` | — |
| **26.1 — 26.1.2** | **`101.1`** | **`84.0`** |

`pack_format` switched to a **major.minor** form at `1.21.9`. Minor bumps mean **non-breaking** additions; major bumps mean breaking changes. Older clients refuse packs whose major exceeds theirs; minor mismatches still load.

**Action for this repo:** `pack/pack.mcmeta` is currently `"pack_format": 34` (≈ 1.20.2). It must move to `101.1` for 26.1.

```json
{
    "pack": {
        "pack_format": 101.1,
        "description": "Madagascar"
    }
}
```

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

## 4. Other 26.1 Changes (informational — not used in this repo)

Not relevant to the book exporter but useful when planning upgrades to other modules:

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
2. **`data/book.json`** — every embedded text component (the `modes`, `players`, `utility`, `hardcore`, `inventory`, `pickaxe`, `axe`, `shovel`, `hoe`, `shears`, `flint` blocks) still uses the **old** `clickEvent`/`value` keys. These pages are currently dead code (the `switch` in `generatePages` is commented out, `book.js:34-43`), but if/when they're re-enabled they will silently fail in 26.1 because the server ignores unknown keys on text components. Rename to `click_event` / `command`.
3. **`app/book.js:84`** — `generateMetadata` hardcodes `generation:3` while accepting a `generation` parameter that's discarded. Either honor the param or drop it. Cosmetic, not a 26.1 blocker.
4. **`generatePages` magic/god pages disabled** (`app/book.js:35-43`) — if reactivating them, also re-test with 26.1 since they consume `book.json` content. Re-enabling without fixing point 2 will produce visually correct text but dead clicks.

### Out of scope / leave alone

- Folder structure under `data/minecraft/madison/function/` — still correct for 26.1.
- World data namespacing — does not touch this repo.
- All other modules (locations, hardcore, swapper, ender, etc.) — not part of book export. Audit separately if upgrading the whole pack.
