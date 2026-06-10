# Frost Arrow team — its color tints the glowing outline applied to frozen mobs (see apply_freeze).
# Registered on the minecraft:load tag. `team add` is idempotent across reloads (harmless if it
# already exists), and the color is (re)set every load so edits here take effect on /reload.
team add mada_frost
team modify mada_frost color aqua
