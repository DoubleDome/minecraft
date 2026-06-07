# Reroll the clicked villager (runs as @s = the villager).
# Bail on villagers with nothing to reroll — unemployed/nitwit (babies are unemployed too).
execute if data entity @s {VillagerData:{profession:"minecraft:none"}} run return fail
execute if data entity @s {VillagerData:{profession:"minecraft:nitwit"}} run return fail
# Beat the vanilla "traded once = trades locked" rule the lectern trick can't: zero earned trade XP
# and clear the offer list, then force-unemploy. The adjacent job site re-hires it next and vanilla
# rolls a FRESH level-1 trade list — exactly like a never-traded villager. (Xp/Offers/VillagerData
# keys verified from server-26.1.2.jar.)
data modify entity @s Xp set value 0
data remove entity @s Offers
data modify entity @s VillagerData.profession set value "minecraft:none"
# Feedback so the player sees the reroll landed.
particle minecraft:happy_villager ~ ~1 ~ 0.4 0.5 0.4 0.1 14
playsound minecraft:block.enchantment_table.use master @a ~ ~ ~ 0.8 1.3
