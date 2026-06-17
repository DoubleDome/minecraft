# Custom music discs

A custom disc is three pieces wired by a shared id (`jakarta:<name>`):

1. **Audio** (resource pack): an Ogg **Vorbis** `.ogg` under
   `resourcepack/assets/jakarta/sounds/<path>.ogg`. MP3 will not play — Minecraft only
   reads Ogg Vorbis. The file **must be mono**: OpenAL only applies distance attenuation
   to mono sources, so a stereo `.ogg` plays as a global, non-positional sound at constant
   volume no matter how far you are from the jukebox. Every vanilla disc is mono for this
   reason. Down-mix with `ffmpeg -i in -ac 1 ... | oggenc` (see "Adding another disc").
2. **Sound event** (resource pack): an entry in `resourcepack/assets/jakarta/sounds.json`
   that names the sound event and points at the `.ogg`. Use `"category": "record"` so it
   follows the Jukebox/Note-Block volume slider, and `"stream": true` so long tracks
   stream from disk instead of loading whole into memory.
3. **`jukebox_song`** (data pack): a registry file at
   `pack/data/jakarta/jukebox_song/<name>.json` that ties the sound event to a comparator
   output, tooltip description, and play length.

The disc item is just a vanilla disc carrying two components: `minecraft:jukebox_playable`
(the song id) and `minecraft:item_name`. No custom item model is used — it reuses the
vanilla disc texture.

## What ships now

| Piece | Path |
| --- | --- |
| Audio | `resourcepack/assets/jakarta/sounds/music/better_luck_next_time.ogg` |
| Sound event | `resourcepack/assets/jakarta/sounds.json` → `music_disc.better_luck_next_time` |
| Registry | `pack/data/jakarta/jukebox_song/better_luck_next_time.json` |
| Give | `pack/data/jakarta/function/disc/give.mcfunction` |

Sound event id resolves to `jakarta:music_disc.better_luck_next_time`; song id is
`jakarta:better_luck_next_time`.

Give command (26.1 SNBT; `jukebox_playable` takes the song id directly as of 1.21.5+):

```
give @s minecraft:music_disc_13[minecraft:jukebox_playable="jakarta:better_luck_next_time",minecraft:item_name={text:"Better Luck Next Time",color:"aqua"}] 1
```

## Deploy / reload rules

- **Resource pack:** rebuild with `node scripts/resourcepack.js`, paste the printed SHA-1
  into `server.properties` `resource-pack-sha1`, then **restart** (the RP is read only at
  startup). `collect()` zips everything under `resourcepack/`, so the `.ogg` and
  `sounds.json` are bundled automatically.
- **Data pack:** `jukebox_song` is a *dynamic registry* — it builds at world load, so a
  new disc needs a server **restart**, not `/reload` (same rule as enchantments and
  dimensions; see `docs/reports/26x_datapack_gotchas.md`). The `disc/give` function itself
  reloads fine, but the song it references won't resolve until after a restart.

So: a brand-new disc = full server restart. Tweaking only `disc/give.mcfunction` later =
`/reload`.

## Adding another disc

1. Convert source audio to **mono** Ogg Vorbis. This build's ffmpeg has no working Vorbis
   encoder (no `libvorbis`, and the native `vorbis` encoder errors out), so down-mix to a
   mono WAV with ffmpeg and encode with `oggenc` (from `vorbis-tools`):
   ```bash
   ffmpeg -i in.mp3 -ac 1 -ar 44100 /tmp/<name>.wav
   oggenc -q 5 -o resourcepack/assets/jakarta/sounds/music/<name>.ogg /tmp/<name>.wav
   ```
   `-ac 1` is mandatory — stereo discs play at constant volume (see piece 1 above).
   Verify with `ffprobe ... <name>.ogg` that `channels=1`.
2. Add a `music_disc.<name>` block to `sounds.json` pointing at `jakarta:music/<name>`.
3. Add `pack/data/jakarta/jukebox_song/<name>.json` (set `length_in_seconds` to the real
   duration — `ffprobe` the `.ogg`).
4. Add a give line (new disc base + `jukebox_playable="jakarta:<name>"`).
5. Rebuild the resource pack, update the SHA-1, restart.
