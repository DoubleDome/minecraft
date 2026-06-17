scoreboard objectives add jakarta.softcore.deaths dummy "Softcore Deaths"
scoreboard objectives add jakarta.softcore.health health
scoreboard objectives add jakarta.softcore.death_dimension dummy
scoreboard players operation * jakarta.softcore.deaths = * jakarta.hardcore.deaths
scoreboard players operation * jakarta.softcore.death_dimension = * jakarta.hardcore.death_dimension
tag @a[tag=hardcore] add softcore
tag @a[tag=hardcore] remove hardcore
scoreboard objectives remove jakarta.hardcore.deaths
scoreboard objectives remove jakarta.hardcore.health
scoreboard objectives remove jakarta.hardcore.death_dimension
tellraw @a {"text":"[Madagascar] Softcore migration complete.","color":"green"}
