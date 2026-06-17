# Durability: only the MAIN-hand horn wears. Roll Unbreaking — chance to take damage is 1/(level+1),
# so level 0 always wears, level III wears ~1 in 4 blows. Mending repairs it for free (vanilla, via
# #minecraft:enchantable/durability). denom must be passed through storage because macros can't read
# scores directly.
scoreboard players set #horn_unb horn_aux 0
execute store result score #horn_unb horn_aux run data get entity @s SelectedItem.components."minecraft:enchantments"."minecraft:unbreaking"
scoreboard players operation #horn_denom horn_aux = #horn_unb horn_aux
scoreboard players add #horn_denom horn_aux 1
execute store result storage jakarta:horn roll.denom int 1 run scoreboard players get #horn_denom horn_aux
function jakarta:horn/roll with storage jakarta:horn roll
execute if score #horn_roll horn_aux matches 1 run function jakarta:horn/apply_wear
