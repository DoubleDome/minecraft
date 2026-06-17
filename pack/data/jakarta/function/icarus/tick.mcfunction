# Icarus wings — registered in the minecraft:tick tag. Each tick, find players
# wearing the Icarus Wings and run the altitude check as/at them.
execute as @a at @s if items entity @s armor.chest minecraft:elytra[minecraft:custom_data={jakarta:{icarus_wings:true}}] run function jakarta:icarus/check
