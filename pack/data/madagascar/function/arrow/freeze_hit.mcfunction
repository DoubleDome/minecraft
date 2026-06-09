# Frost Arrow contact (run AS the arrow, AT the arrow). Read this arrow's freeze duration off its
# stored item (set by the recipe tier: ice 80 / packed 160 / blue 320), freeze the mob it's lodged
# in, then consume the arrow. Direct hit only: the target is the mob whose hitbox contains the arrow
# (zero-size dx/dy/dz volume), nearest first if somehow overlapping more than one.
data modify storage madagascar:freeze ticks set from entity @s item.components."minecraft:custom_data".freeze_ticks
execute as @e[dx=0,dy=0,dz=0,tag=!freeze_owner,type=!#madagascar:bomb_ignore,sort=nearest,limit=1] run function madagascar:arrow/apply_freeze with storage madagascar:freeze
kill @s
