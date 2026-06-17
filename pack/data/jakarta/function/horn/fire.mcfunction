# Fire the sonic boom from the player's eyes. One call per blow (horn/sonic edge-gates this). Order:
# durability gate (dud if used up), boom sound, raycast beam, then durability wear.
scoreboard players set #horn_dmg horn_aux 0
execute store result score #horn_dmg horn_aux run data get entity @s SelectedItem.components."minecraft:damage"
execute if score #horn_dmg horn_aux matches 16.. run return run playsound minecraft:block.dispenser.fail player @s ~ ~ ~ 0.6 1
tag @s add sonic_shooter
execute at @s run playsound minecraft:entity.warden.sonic_boom player @a ~ ~ ~ 4 1
scoreboard players set @s horn_ray 30
execute at @s anchored eyes positioned ^ ^ ^0.5 run function jakarta:horn/ray
tag @e[tag=sonic_hit] remove sonic_hit
tag @s remove sonic_shooter
function jakarta:horn/wear
