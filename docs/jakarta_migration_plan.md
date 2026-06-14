# Migration plan: `madagascar` → `jakarta` (package + namespace)

Status: **DRAFT — not started.** Rename the datapack package and namespace from
`madagascar` to `jakarta`, regenerate the pack, and clean up the live scoreboard
(including folding the softcore objectives under a `jakarta.softcore.*` umbrella).

The code rename is mechanical; the **live-world migration is the risk** (dimensions,
scoreboards, already-crafted custom items). Do it on a **stopped server with a full
backup**, ideally rehearsed on a copy of the world first.

---

## 1. Footprint (what "madagascar" touches)

| Area | Files | Matches | Notes |
|---|--:|--:|---|
| `pack/` (functions, tags, recipes, predicates, dimensions, worldgen, loot, item_modifiers) | 51 | 219 | hardcoded `madagascar:` / `madagascar.` throughout; also the `data/madagascar/` folder name |
| `data/` | 5 | 153 | `config.json` (namespace/package/folders/dims/storage) + `objectives.json` (108 `madagascar.*` names) + `locations.json`, `book.json` |
| `app/` JS | 5 | 12 | hardcoded strings in `book.js`, `softcore.js`, `playerhead.js`, `rebuild.js`, `generator.js` (rest is config-driven) |
| `scripts/` | 3 | 8 | `resourcepack.js` (asset namespace), `wizard.js`; `temp.js` is dead |
| `resourcepack/assets/madagascar/` | dir | — | textures/models namespace + `dist/madagascar_rp.zip` + sha1 + `server.properties` resource-pack URL |

**Live world (the hard part):**
- `world/dimensions/madagascar/{canvas,caves,dynamite,sky_islands,skyblock,waterworld}` — 6 dimension folders (skyblock = your copied SP world).
- ~108 live `madagascar.*` scoreboard objectives (+ 2 leftover `hardcore.*`).
- Every already-crafted custom item carries `custom_data {madagascar:{…}}` + `item_model:"madagascar:…"`.

---

## 2. Open decisions (resolve before executing)

1. **Existing custom items + in-game books → RESOLVED: accept the breakage, no fixer.** Already-crafted `madagascar:` gadget items and the God/Magic book items in inventories go inert / lose texture after the flip, and book buttons (calling `/function madagascar:…`) stop working. **Per the owner: don't care about existing in-game books/items** — no fixer, no book re-issue. Fresh items/books made after the rename work normally.
2. **Rehearse on a world copy first?** Cheaper insurance now that the dimension move is just a folder move; still recommended. Confirm.
3. **Softcore objective reorg scope** (folded into this migration): move `stats`, `killer`, `distance`, `start`, `death`, `time`, `softcore` under `jakarta.softcore.*`; leave `constants`/`temp` as shared `jakarta.*`. Confirm.
4. **Pack folder**: `madagascar_pack` → `jakarta_pack` (PACK_FOLDER env).

---

## 3. Phase 0 — Safety
- [ ] Full stop of the MC server (`/stop`) — no live edits to world data while it's running.
- [ ] Full backup of `D:\jakarta-vanilla-26.1.2\world` to `D:\Backup\<date>\` (NOT inside `world/datapacks/`).
- [ ] Git branch `jakarta-migration`; commit current state.
- [ ] (Recommended) copy the world to a scratch dir and rehearse Phases 4–5 there first.

## 4. Phase 1 — Source rename (code; safe, reversible in git)
- [ ] **`data/config.json`**: `package` `madagascar`→`jakarta`; `path.madagascar` → `jakarta`; `root` → `datapacks/jakarta_pack/`; dimension ids/labels `madagascar:*`→`jakarta:*`; function/storage refs. (Leave `namespace:"minecraft:madagascar"` decision — it's only a label; set to `minecraft:jakarta` for consistency.)
- [ ] **Rename folder** `pack/data/madagascar/` → `pack/data/jakarta/`.
- [ ] **Find/replace inside `pack/`**: `madagascar:` → `jakarta:` and `madagascar.` → `jakarta.` (219 matches across 51 files — functions, tags incl. `minecraft:tick`/`load`, recipes' `custom_data`/`item_model`, predicates, dimensions' `type`, worldgen settings refs, item_modifiers, loot).
- [ ] **`data/objectives.json`**: rename the 108 `name` fields. Fold softcore groups under `jakarta.softcore.*` here (decision #3). Everything generated picks these up automatically.
- [ ] **`data/locations.json`, `book.json`**: any `madagascar:` refs → `jakarta:`.
- [ ] **`app/` JS** (12 hardcoded): `book.js`, `softcore.js`, `playerhead.js`, `rebuild.js`, `generator.js` — replace literal `madagascar` strings (the `.live.bak` path in rebuild.js, etc.).
- [ ] **`migrate_softcore.mcfunction`**: update its 3 literal objective refs (or retire it).
- [ ] **`scripts/resourcepack.js`** + `resourcepack/assets/madagascar/` → `assets/jakarta/`; output `jakarta_rp.zip`.
- [ ] **`.env` / `.env.example`**: `PACK_FOLDER=jakarta_pack`. (`BASE_PATH` unchanged.)
- [ ] `node --check` all JS; `node index.js` (test build to `.temp`) → confirm a clean `jakarta_pack` generates with `jakarta:`/`jakarta.` everywhere and **no** residual `madagascar`.

## 5. Phase 2 — Pack generation & resource pack
- [ ] `node index.js live` → builds `jakarta_pack` into the world's `datapacks/` (old `madagascar_pack` still present until cleanup).
- [ ] Rebuild resource pack (`node scripts/resourcepack.js`) → `dist/jakarta_rp.zip` + sha1; update `server.properties` `resource-pack` URL + `resource-pack-sha1` + `resource-pack-id` (new UUID).

## 6. Phase 3 — Live-world migration (server STOPPED)
**6a. Dimensions** — *de-risked*: **verified all players are in `minecraft:overworld`** (Dimension, LastDeathLocation, and respawn all overworld for DoubleDome/Filbert/Mermaid), so **no player `Dimension` NBT rewrite is needed**. This was the scary part; it's gone.
- [ ] Move `world/dimensions/madagascar/*` → `world/dimensions/jakarta/*` (all 6, incl. skyblock).
- [ ] (Guard) re-confirm no player `.dat` has `Dimension:"madagascar:*"` right before the move (in case someone visited a custom dim after this check).
- [ ] Check `level.dat` for any stored dimension ids / forced chunks.

**6b. Scoreboards** — *full reset, no value migration.* (Owner: softcore stats can be reset; the mode has changed too much to count as the same — so nothing to preserve.)
- [ ] New `jakarta.*` objectives are created fresh by `load` (criterion ones self-heal from player stats; dummies start at 0).
- [ ] Remove ALL old `madagascar.*` objectives (108) + the 2 leftover `hardcore.*`. No `scoreboard players operation` carry-over.
- [ ] `save-all flush`.

**6c. Existing items / books**: nothing to do — accepted breakage (decision #1). Old `madagascar:` items/books go inert; new ones work.

## 7. Phase 4 — Deploy, restart, verify
- [ ] Start server (fresh start = loads `jakarta_pack`, dimension types, registries).
- [ ] Verify: `/datapack list` shows jakarta; a custom recipe crafts; a function runs (`/function jakarta:…`); dimensions load (`/execute in jakarta:sky_islands …`); scoreboards show `jakarta.*`; resource pack applies; books give correctly.
- [ ] Confirm **no** `madagascar` left: `grep -ri madagascar` over the live pack; `scoreboard objectives list` has no `madagascar.*`.

## 8. Phase 5 — Cleanup
- [ ] Delete old `world/datapacks/madagascar_pack/`.
- [ ] Delete old `world/dimensions/madagascar/` (after confirming the `jakarta` copies load).
- [ ] `/datapack disable` any stale entry; remove old `dist/madagascar_rp.*`.
- [ ] Update `CLAUDE.md`, `docs/CUSTOM_FEATURES.md`, `.claude/rules/rebuild.md` references.
- [ ] Merge `jakarta-migration` branch; push.

## 9. Rollback
- Server stopped + full world backup from Phase 0 = restore the world folder, `git checkout main`, revert `server.properties`. Because everything happens on a stopped server against a backed-up world, rollback is a folder restore.

---

## Things still worth worrying about
1. **Dimension folder path must EXACTLY match the new dim id.** A dim `jakarta:sky_islands` must live at `world/dimensions/jakarta/sky_islands/`. If the path is wrong, the game treats the dimension as empty and **regenerates fresh chunks — losing existing builds** (skyblock = your copied SP world; highest stakes). Verify each of the 6 folders lands at the exact path and loads its old chunks before deleting the `madagascar` copies.
2. **Old + new pack must not load together on first start.** While both `madagascar_pack` and `jakarta_pack` are in `datapacks/`, the old pack's `load` still re-creates `madagascar.*` objectives and both register functions. **Remove/disable `madagascar_pack` before the first start with `jakarta_pack`**, or you get duplicate objectives and stale `madagascar.*` back.
3. ~~Scoreboard semantics~~ — **RESOLVED: full reset, don't care.** Owner is fine resetting softcore stats (the mode has changed too much to be the same), so we don't need to understand or preserve the old values — just create fresh `jakarta.*` and delete the old. The earlier per-life-vs-lifetime mystery no longer matters.
4. **`config.namespace` (`minecraft:madagascar`) drives `data modify storage` paths** (stash, etc.). Renaming moves the storage namespace; it's transient (stash is momentary, recall uses `madagascar:recall`), so low risk — but verify nothing persistent reads the old storage.
5. **Resource pack must update as a set** — new `resource-pack` URL **and** `resource-pack-sha1` **and** `resource-pack-id`; a mismatch makes clients silently reject the pack (no custom textures).
6. **Generator/seed must stay byte-identical** so moved chunks line up with newly generated ones at the borders. True as long as we *only* rename (don't touch noise settings/biome sources in the same pass).
7. **`migrate_softcore.mcfunction` + the 2 leftover `hardcore.*` objectives** — with the scoreboard reset (#3), just **retire/delete** the migration and let the hardcore objectives be removed with everything else. Nothing to preserve.

## Effort / risk
- **Code rename + pack gen + scoreboard reorg**: ~1–2 hrs, low risk (git-reversible, config-driven).
- **Live dimension migration**: now **low risk** — verified no players are in custom dims, so it's a folder move (no playerdata NBT surgery). Just back up first and re-confirm the guard before moving; the copied skyblock folder is the main thing to move carefully.
- **Existing-item breakage**: accepted (owner doesn't care about current in-game items/books) — nothing to do.
