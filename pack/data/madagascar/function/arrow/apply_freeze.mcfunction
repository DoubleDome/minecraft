# Freeze a mob (run AS the target). NoAI = can't move, pathfind, or attack — but it still takes
# damage and dies normally. Tag it, join the mada_frost team and add Glowing so it shows an aqua
# "frozen" outline (the team color tints the glow). The thaw rule in arrow/tick reverses all of this
# once the marker Slowness — the vanilla-managed timer — expires off the mob.
data merge entity @s {NoAI:1b}
tag @s add mada_frozen
team join mada_frost @s
effect give @s minecraft:glowing infinite 0 true
