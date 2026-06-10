# Thaw a mob (run AS the target): undo everything apply_freeze did, once the marker Slowness has
# expired. Restore AI, drop the aqua glow + team, and clear the freeze tag.
data merge entity @s {NoAI:0b}
effect clear @s minecraft:glowing
team leave @s
tag @s remove mada_frozen
