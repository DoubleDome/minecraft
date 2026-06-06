---
description: Always rebuild and deploy to live after editing pack source
alwaysApply: true
---

# Always rebuild after editing source

Editing files under `pack/`, `app/`, `data/`, `dimensions/`, `util/`, or `scripts/` changes
**source only** — nothing reaches the live Minecraft server until the generator runs. The live
world reads `D:\jakarta-vanilla-26.1.2\world\datapacks\madagascar_pack`, which is **regenerated**,
not edited in place.

**After any source change, rebuild and deploy without being asked:**

```bash
node index.js live
```

This clones `pack/` and runs every generator into the live world's `madagascar_pack/`. The user
then runs `/reload` in-game (functions, recipes, tags, loot tables, advancements, predicates, and
item modifiers reload live; dynamic registries — enchantments, dimensions, damage types, worldgen —
need a server **restart**, not `/reload`).

## Rules

1. **Treat the rebuild as part of the edit.** A source edit is not "done" until `node index.js live`
   has run and the new bytes are confirmed in the live pack. Never report a change as deployed off a
   source edit alone.
2. **Back up the live pack first** (it gets wiped on every run — `creator.destroy` has no sentinel in
   the live folder): `cp -r <live pack> .temp/madagascar_pack.live.bak` before `node index.js live`.
3. **`live` is the deploy target; `test` (default) only writes to `.temp/`.** Use `node index.js`
   (or `TARGET=test`) for a dry run that never touches the server; use `node index.js live` to ship.
4. **Verify after deploy.** Confirm the changed bytes actually landed in the live pack (grep/ls the
   specific file) — `/reload` shows no error even when content is wrong (see
   `docs/26x_datapack_gotchas.md`, "Verify text components in-game, not just in the log").
