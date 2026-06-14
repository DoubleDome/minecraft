# Lava Walker — makes the magma path temporary. The enchantment itself places the magma (its
# replace_disk effect); this just tracks and reverts it. Runs every tick via the minecraft:tick tag.

# Drop a trail marker under each Lava Walker player standing on ENCHANT-placed magma — i.e. magma
# with lava directly beneath it (filters out natural magma blocks, which sit on stone/etc).
execute as @a at @s if predicate jakarta:has_lava_walker if block ~ ~-1 ~ minecraft:magma_block if block ~ ~-2 ~ minecraft:lava run function jakarta:lava_walker/mark

# Age every trail marker; melt its disk back to lava when the countdown runs out.
execute as @e[type=minecraft:marker,tag=lw_trail] at @s run function jakarta:lava_walker/revert
