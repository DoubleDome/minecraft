execute if entity @s[y_rotation=135..-134] run setblock ~0 ~ ~-2 minecraft:ender_chest[facing=south]
execute if entity @s[y_rotation=135..-134] align xyz run summon minecraft:armor_stand ~0 ~ ~-2 {CustomName:"{\"text\":\"EnderMarker\"}",Invisible:1,NoGravity:1b}
execute if entity @s[y_rotation=-135..-44] run setblock ~2 ~ ~0 minecraft:ender_chest[facing=west]
execute if entity @s[y_rotation=-135..-44] align xyz run summon minecraft:armor_stand ~2 ~ ~0 {CustomName:"{\"text\":\"EnderMarker\"}",Invisible:1,NoGravity:1b}
execute if entity @s[y_rotation=-45..44] run setblock ~0 ~ ~2 minecraft:ender_chest[facing=north]
execute if entity @s[y_rotation=-45..44] align xyz run summon minecraft:armor_stand ~0 ~ ~2 {CustomName:"{\"text\":\"EnderMarker\"}",Invisible:1,NoGravity:1b}
execute if entity @s[y_rotation=45..134] run setblock ~-2 ~ ~0 minecraft:ender_chest[facing=east]
execute if entity @s[y_rotation=45..134] align xyz run summon minecraft:armor_stand ~-2 ~ ~0 {CustomName:"{\"text\":\"EnderMarker\"}",Invisible:1,NoGravity:1b}
