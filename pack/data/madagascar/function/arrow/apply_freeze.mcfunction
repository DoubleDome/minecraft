# Freeze a mob (run AS the target). NoAI = can't move, can't pathfind, can't attack, can't be
# pushed — but still takes damage and dies normally. The mada_frozen tag + countdown score let
# arrow/tick thaw it (NoAI:0b) when the timer runs out. Macro arg: ticks (the freeze duration).
data merge entity @s {NoAI:1b}
tag @s add mada_frozen
$scoreboard players set @s madagascar.freeze $(ticks)
