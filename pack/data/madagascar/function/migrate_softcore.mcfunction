scoreboard objectives add madagascar.softcore.deaths dummy "Softcore Deaths"
scoreboard objectives add madagascar.softcore.health health
scoreboard objectives add madagascar.softcore.death_dimension dummy
scoreboard players operation * madagascar.softcore.deaths = * madagascar.hardcore.deaths
scoreboard players operation * madagascar.softcore.death_dimension = * madagascar.hardcore.death_dimension
tag @a[tag=hardcore] add softcore
tag @a[tag=hardcore] remove hardcore
scoreboard objectives remove madagascar.hardcore.deaths
scoreboard objectives remove madagascar.hardcore.health
scoreboard objectives remove madagascar.hardcore.death_dimension
tellraw @a {"text":"[Madagascar] Softcore migration complete.","color":"green"}
