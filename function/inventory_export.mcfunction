data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:netherite_sword"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:bow"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:shield"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:netherite_pickaxe"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:netherite_axe"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:netherite_shovel"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:netherite_hoe"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:netherite_helmet"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:netherite_chestplate"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:netherite_leggings"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:netherite_boots"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:arrow"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:elytra"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:ender_chest"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:scaffolding"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:golden_carrot"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:torch"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:bucket"}]
data modify storage minecraft:madagascar inventory insert 0 from entity @s Inventory[{id:"minecraft:firework_rocket"}]
data modify storage minecraft:madagascar inventory[0] merge value {Slot:0b}
data modify storage minecraft:madagascar inventory[1] merge value {Slot:1b}
data modify storage minecraft:madagascar inventory[2] merge value {Slot:2b}
data modify storage minecraft:madagascar inventory[3] merge value {Slot:3b}
data modify storage minecraft:madagascar inventory[4] merge value {Slot:4b}
data modify storage minecraft:madagascar inventory[5] merge value {Slot:5b}
data modify storage minecraft:madagascar inventory[6] merge value {Slot:6b}
data modify storage minecraft:madagascar inventory[7] merge value {Slot:7b}
data modify storage minecraft:madagascar inventory[8] merge value {Slot:8b}
data modify storage minecraft:madagascar inventory[9] merge value {Slot:9b}
data modify storage minecraft:madagascar inventory[10] merge value {Slot:10b}
data modify storage minecraft:madagascar inventory[11] merge value {Slot:11b}
data modify storage minecraft:madagascar inventory[12] merge value {Slot:12b}
data modify storage minecraft:madagascar inventory[13] merge value {Slot:13b}
data modify storage minecraft:madagascar inventory[14] merge value {Slot:14b}
data modify storage minecraft:madagascar inventory[15] merge value {Slot:15b}
data modify storage minecraft:madagascar inventory[16] merge value {Slot:16b}
data modify storage minecraft:madagascar inventory[17] merge value {Slot:17b}
data modify storage minecraft:madagascar inventory[18] merge value {Slot:18b}
execute in minecraft:overworld run setblock -17 60 -1 shulker_box
execute in minecraft:overworld run data modify block -17 60 -1 Items set value []
execute in minecraft:overworld run data modify block -17 60 -1 Items set from storage minecraft:madagascar inventory
data remove storage minecraft:madagascar inventory
clear
function madagascar:god_book
gamemode creative @s
