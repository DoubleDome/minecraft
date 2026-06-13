# The wax melts: the wings are destroyed, the flier is scorched and falls.
item replace entity @s armor.chest with minecraft:air
damage @s 3 minecraft:on_fire
playsound minecraft:block.fire.extinguish player @a ~ ~ ~ 1 0.6
particle minecraft:flame ~ ~1 ~ 0.4 0.5 0.4 0.05 40
particle minecraft:falling_lava ~ ~1 ~ 0.4 0.5 0.4 0 20
title @s actionbar {"text":"The wax melts — your wings are gone!","color":"#EFC75E"}
