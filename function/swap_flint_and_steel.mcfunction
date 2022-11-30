data remove storage minecraft:madagascar inbound
data remove storage minecraft:madagascar outbound
setblock ~ 250 ~ shulker_box
setblock ~ 251 ~ shulker_box
data modify block ~ 250 ~ Items prepend from entity @s EnderItems[{Slot:0b}]
data modify storage minecraft:madagascar inbound set from block ~ 250 ~ Items[{Slot:0b}].tag.BlockEntityTag.Items[{id:"minecraft:flint_and_steel"}]
data modify storage minecraft:madagascar slot set from storage minecraft:madagascar inbound.Slot
data modify storage minecraft:madagascar inbound.Slot set value 0b
data modify block ~ 251 ~ Items prepend from storage minecraft:madagascar inbound
data modify storage minecraft:madagascar outbound set from entity @s Inventory[{Slot:2b}]
data modify storage minecraft:madagascar outbound.Slot set from storage minecraft:madagascar slot
data remove block ~ 250 ~ Items[{Slot:0b}].tag.BlockEntityTag.Items[{id:"minecraft:flint_and_steel"}]
data modify block ~ 250 ~ Items[{Slot:0b}].tag.BlockEntityTag.Items append from storage minecraft:madagascar outbound
loot replace entity @s hotbar.2 1 mine ~ 251 ~ air
loot replace entity @s enderchest.0 1 mine ~ 250 ~ air
data remove storage minecraft:madagascar inbound
data remove storage minecraft:madagascar outbound
setblock ~ 250 ~ air
setblock ~ 251 ~ air
