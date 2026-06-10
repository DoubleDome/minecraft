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
2. **The live pack is backed up automatically before every wipe.** Both rebuild paths share
   `app/rebuild.js`, which snapshots the live pack to `.temp/madagascar_pack.live.bak` before
   `creator.destroy` wipes it (the live folder has no sentinel). No manual `cp -r` needed; the
   snapshot is overwritten each run, so it's the previous build, not a history.
3. **`live` is the deploy target; `test` (default) only writes to `.temp/`.** Use `node index.js`
   (or `TARGET=test`) for a dry run that never touches the server; use `node index.js live` to ship.
   The web server is the exception: launch it with `$env:TARGET='live'; node server.js` so its
   `/rebuild` button deploys to the live world while the CLI stays safe-by-default.
4. **Verify after deploy.** Confirm the changed bytes actually landed in the live pack (grep/ls the
   specific file) — `/reload` shows no error even when content is wrong (see
   `docs/26x_datapack_gotchas.md`, "Verify text components in-game, not just in the log").
