# Server Config

A tracked snapshot of the live vanilla server's config files (live server lives at
`D:\jakarta-vanilla-26.1.2`). This is a **backup/reference copy** — the live box is the
source of truth. Use it to restore settings or review what changed over time.

## What's here

| File | Notes |
|---|---|
| `server.properties` | Full config. **`management-server-secret` is intentionally blanked** (see Secrets). |
| `start-server.bat` | JVM launch flags (Aikar's flags, G1 tuned for the N100). |
| `eula.txt` | EULA acceptance. |
| `ops.json` | Operators (level 4). |
| `whitelist.json` / `banned-players.json` / `banned-ips.json` | Access lists. |

Deliberately **not** tracked: `usercache.json` (churns every join), `world/`, `logs/`,
`crash-reports/`, `server.jar`, `versions/`, `libraries/`.

## Secrets — read before restoring

`management-server-secret` is **blanked** in the committed `server.properties`. Git history
is permanent, so the real token must never be committed even though this repo is private.

When restoring to a live server, set it back in the live file (NOT here):

```
management-server-secret=<your real token>
```

It's only used when `management-server-enabled=true` (currently `false`), so a blank value is
harmless for normal operation.

## Updating this snapshot

Run the sync script from the repo root after changing any server setting:

```powershell
powershell -File scripts/sync-config.ps1
```

It copies the files above from the live server into this folder and re-blanks
`management-server-secret` automatically. Review the diff, then commit.

## Restoring to a server

Copy the files back into the server directory, then put the real `management-server-secret`
back into `server.properties`. Restart the server.
