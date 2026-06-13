# Too close to the sun: the wax melts. Drain the wings' durability fast each tick
# (they stop providing flight when it hits 0). A quick dive can still save them.
item modify entity @s armor.chest madagascar:icarus/melt_wing
playsound minecraft:block.lava.ambient player @a ~ ~ ~ 1 0.8
particle minecraft:flame ~ ~1 ~ 0.4 0.5 0.4 0.02 25
particle minecraft:falling_lava ~ ~1 ~ 0.4 0.5 0.4 0 10
title @s actionbar {"text":"The wax is melting!","color":"#EFC75E"}
