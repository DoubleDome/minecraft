# Macro placement for Torch Arrow. $(t) = torch block-id prefix ("" / "soul_" / "redstone_").
# Place in the air block 0.5 back along the arrow's travel (always the open side); variant by
# pitch: floor (down) = standing torch, walls = wall_torch facing back at the shooter, ceiling
# (x_rotation < -45) = no match = no effect. setblock ... keep only fills air, so a precision
# miss never overwrites the block the arrow hit.
$execute if entity @s[x_rotation=45..90] positioned ^ ^ ^-0.5 align xyz run setblock ~ ~ ~ minecraft:$(t)torch keep
$execute if entity @s[x_rotation=-45..45,y_rotation=-45..45] positioned ^ ^ ^-0.5 align xyz run setblock ~ ~ ~ minecraft:$(t)wall_torch[facing=north] keep
$execute if entity @s[x_rotation=-45..45,y_rotation=45..135] positioned ^ ^ ^-0.5 align xyz run setblock ~ ~ ~ minecraft:$(t)wall_torch[facing=east] keep
$execute if entity @s[x_rotation=-45..45,y_rotation=135..180] positioned ^ ^ ^-0.5 align xyz run setblock ~ ~ ~ minecraft:$(t)wall_torch[facing=south] keep
$execute if entity @s[x_rotation=-45..45,y_rotation=-180..-135] positioned ^ ^ ^-0.5 align xyz run setblock ~ ~ ~ minecraft:$(t)wall_torch[facing=south] keep
$execute if entity @s[x_rotation=-45..45,y_rotation=-135..-45] positioned ^ ^ ^-0.5 align xyz run setblock ~ ~ ~ minecraft:$(t)wall_torch[facing=west] keep
