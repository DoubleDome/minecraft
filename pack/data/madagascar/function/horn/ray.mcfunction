# One 0.5-block beam step. Executor stays the player; we only reposition along the look vector.
# Draw the sonic-boom particle, damage every fresh target at this point, then step forward — stopping
# at max range (horn_ray) or the first non-passable block (#madagascar:beam_pass = air/water/plants).
particle minecraft:sonic_boom ~ ~ ~ 0 0 0 0 1 force
execute as @e[distance=..1.6,type=!#madagascar:bomb_ignore,tag=!sonic_shooter,tag=!sonic_hit] run function madagascar:horn/hit
scoreboard players remove @s horn_ray 1
execute if score @s horn_ray matches 1.. positioned ^ ^ ^0.5 if block ~ ~ ~ #madagascar:beam_pass run function madagascar:horn/ray
