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

1. **Existing custom items** (Wings of Icarus, Sonic Horns, arrows in chests, Recall Fruit, Fire Charges) will go inert after the namespace flip (their `custom_data` marker + `item_model` point at `madagascar:`). **Verified:** all three players' inventories are full of `madagascar:` items, and their God/Magic books have buttons that call `/function madagascar:…` — so after the rename, held items lose behavior/texture **and the book buttons break** (function not found). Books are easy to re-issue (`/function jakarta:book/…` or re-give); held gadget items need re-crafting. Options:
   - (a) **Accept it** — old copies stop working / lose texture; players re-craft. Simplest. *(recommended)*
   - (b) Write a one-time fixer that scans loaded inventories/containers and rewrites the components. Expensive, never fully complete.
2. **Rehearse on a world copy first?** Strongly recommended given the dimension/playerdata edits. *(recommended: yes)*
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

**6b. Scoreboards** (`scoreboard.dat`):
- [ ] Criterion objectives (`stats.*`, `killer.*`, `softcore.health`) self-heal from player stats on login — no migration needed; new `jakarta.*` ones created by `load`.
- [ ] Carry persistent dummies before deleting old: `softcore.deaths`, `softcore.death_dimension` → `scoreboard players operation @a <new> = @a <old>` (run after first load creates the new objectives).
- [ ] Remove the old `madagascar.*` objectives (108) **and** the 2 leftover `hardcore.*` once values are carried.
- [ ] `save-all flush`.

**6c. Existing items**: per decision #1 — (a) accept inert/old items, or (b) run the fixer.

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

## Effort / risk
- **Code rename + pack gen + scoreboard reorg**: ~1–2 hrs, low risk (git-reversible, config-driven).
- **Live dimension migration**: now **low risk** — verified no players are in custom dims, so it's a folder move (no playerdata NBT surgery). Just back up first and re-confirm the guard before moving; the copied skyblock folder is the main thing to move carefully.
- **Existing-item breakage**: unavoidable with option (a) — re-issue books, re-craft gadget items. Cosmetic + minor friction.
