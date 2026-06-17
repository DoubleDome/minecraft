# Warning band: the wax is softening. Cue the flier to descend before it melts.
particle minecraft:dripping_lava ~ ~1 ~ 0.3 0.3 0.3 0 3
playsound minecraft:block.lava.pop player @s ~ ~ ~ 0.6 1.3
title @s actionbar {"text":"The wax is softening… descend!","color":"gold"}
