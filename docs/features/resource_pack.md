# Resource pack (custom item textures)

Server-pushed resource pack that gives four custom items their own textures. Clients download it
over the LAN when they join.

## What gets a custom model

Four items carry a `minecraft:item_model` component pointing at a `jakarta:` model. A resource
pack can only retexture an item that carries `item_model` (or `custom_model_data`) — it cannot see
`custom_data`. Without the component, retexturing would hit *every* vanilla stick / snowball /
popped chorus fruit.

| Item | Base item | `item_model` id | Source give site |
| --- | --- | --- | --- |
| Golden Chorus Fruit | `popped_chorus_fruit` | `jakarta:golden_chorus_fruit` | `recipe/recall_fruit.json` + refund give in `function/recall/go.mcfunction` |
| Trade Reroller | `stick` | `jakarta:trade_reroller` | `recipe/trade_reroller.json` |
| Fire Charge (throwable) | `snowball` | `jakarta:fire_charge` | `recipe/fire_charge_throw.json` |
| Heavy Stick | `stick` | `jakarta:heavy_stick` | `recipe/heavy_stick.json` |

Arrows (Bomb / Torch / Redstone Torch / Soul Torch) intentionally have **no** custom model — they
render as vanilla tipped arrows with their potion tint.

> Caveat: only newly given/crafted items get the `item_model`. Items already sitting in inventories
> or chests keep the old form and render vanilla until re-obtained.

## Pack layout (`resourcepack/`)

```
resourcepack/
  pack.mcmeta                                  # min_format/max_format [84,0]  (RP format, NOT the [101,x] datapack one)
  assets/jakarta/
    items/<name>.json                          # item-model definition (1.21.4+ system)
    models/item/<name>.json                    # parent item/generated, layer0 = the texture
    textures/item/<name>.png                   # 16x16 art (all four are real hand-made textures)
```

`min_format`/`max_format` are arrays per the 26.x convention (see `docs/reports/26x_datapack_gotchas.md`).
The **resource-pack** format is `84`; the data-pack format is `101` — different numbers.

## Build

```bash
node scripts/resourcepack.js          # zip + sha1; keeps existing textures
node scripts/resourcepack.js --force  # also regenerate the placeholder PNGs
```

Outputs (gitignored):
- `dist/jakarta_rp.zip` — store-mode zip, forward-slash paths (Minecraft rejects backslash-
  separated zips, which `Compress-Archive` can emit, so the script writes the zip itself)
- `dist/jakarta_rp.sha1.txt` — the SHA-1 for `resource-pack-sha1`

The script has **no npm deps** (Node `zlib` for PNG/deflate, `crypto` for sha1). Placeholder
textures are generated programmatically; drop real 16x16 PNGs into `textures/item/` and rebuild
(without `--force`) to keep them.

## Delivery over the LAN

1. Run the dashboard server: `node server.js` (port 3000). It serves the zip at
   `/jakarta_rp.zip` from `dist/`.
2. `server.properties` (live server) points clients at it:
   ```
   resource-pack=http://10.0.0.64:3000/jakarta_rp.zip
   resource-pack-id=43f2e50c-4e6d-40e6-92c4-5ffa76e521cd   # 26.x push protocol needs a UUID
   resource-pack-sha1=<sha1 from dist/jakarta_rp.sha1.txt>
   resource-pack-prompt={"text":"Jakarta custom item textures","color":"light_purple"}
   require-resource-pack=false                              # true = kick players who decline
   ```

### After changing the pack

1. `node scripts/resourcepack.js` → new zip + new sha1.
2. Paste the new sha1 into `server.properties` `resource-pack-sha1` (clients cache by sha1 — a stale
   value makes them refuse or reuse the old pack).
3. **Restart the server** — `server.properties` is read only at startup, not on `/reload`.
4. Make sure `node server.js` is running and `http://10.0.0.64:3000/jakarta_rp.zip` is reachable
   from a client machine on the LAN.

`10.0.0.64` is this host's current LAN IP — update the URL if it changes (consider a DHCP
reservation so it doesn't).
