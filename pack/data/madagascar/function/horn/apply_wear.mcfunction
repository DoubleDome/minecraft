# Consume 1 durability (set_damage add of -1/16 of remaining), then check for break. The horn is not
# removed at 0 — it goes "dud" (the gate in horn/fire blocks firing at damage >= 16) until Mending
# repairs it, which keeps the item recoverable. Play the vanilla break sound the moment it hits 0.
item modify entity @s weapon.mainhand madagascar:horn_wear
scoreboard players set #horn_dmg horn_aux 0
execute store result score #horn_dmg horn_aux run data get entity @s SelectedItem.components."minecraft:damage"
execute if score #horn_dmg horn_aux matches 16.. run playsound minecraft:entity.item.break player @a ~ ~ ~ 1 1
