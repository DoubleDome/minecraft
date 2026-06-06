# Run as a trail marker at its block. Count down; when expired, melt the disk of magma back to lava
# — unless a player is still standing right here (re-arm so it never reverts out from under anyone;
# they'd fall in the lava). The ±4 fill covers the enchant's max disk radius (level 2 = 4).
scoreboard players remove @s madagascar.lw 1
execute if score @s madagascar.lw matches ..0 if entity @a[distance=..4] run scoreboard players set @s madagascar.lw 40
execute if score @s madagascar.lw matches ..0 unless entity @a[distance=..4] run fill ~-4 ~ ~-4 ~4 ~ ~4 minecraft:lava replace minecraft:magma_block
execute if score @s madagascar.lw matches ..0 unless entity @a[distance=..4] run kill @s
