# Icarus wings — registered in the minecraft:tick tag. Each tick, find players
# wearing the Wings of Icarus and run the altitude check as/at them.
execute as @a at @s if items entity @s armor.chest minecraft:elytra[minecraft:custom_data={madagascar:{icarus_wings:true}}] run function madagascar:icarus/check
