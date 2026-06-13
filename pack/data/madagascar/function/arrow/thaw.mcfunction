# Thaw a mob (run AS the target): undo everything apply_freeze did, once the marker Slowness has
# expired. Restore AI, drop the aqua glow + team, and clear the freeze tag.
# Restore AI only if it wasn't already NoAI before we froze it (see apply_freeze).
execute unless entity @s[tag=mada_was_noai] run data merge entity @s {NoAI:0b}
tag @s remove mada_was_noai
effect clear @s minecraft:glowing
team leave @s
tag @s remove mada_frozen
