# Reward of madagascar:sonic_horn — runs as the player who blew the horn. using_item fires every tick
# of the blow, so fire only on the EDGE: when the player is not already tagged horn_blowing and the
# Sonic Horn is in the MAIN hand. Then mark blowing, refresh the grace timer (horn/tick clears the tag
# a few ticks after the blow ends), and revoke so the advancement can re-grant next blow.
execute unless entity @s[tag=horn_blowing] if items entity @s weapon.mainhand minecraft:goat_horn[minecraft:custom_data~{sonic_horn:1b}] run function madagascar:horn/fire
tag @s add horn_blowing
scoreboard players set @s horn_grace 3
advancement revoke @s only madagascar:sonic_horn
