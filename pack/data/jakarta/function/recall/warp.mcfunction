# Run as/at a player with a personal spawn set. Play the departure effect, read the spawn from the
# `respawn` compound into storage, macro-teleport (cross-dimension aware), then the arrival effect.
playsound minecraft:entity.enderman.teleport master @a ~ ~ ~ 1 1
particle minecraft:reverse_portal ~ ~1 ~ 0.3 0.6 0.3 0.1 40

data modify storage jakarta:recall dim set from entity @s respawn.dimension
data modify storage jakarta:recall x set from entity @s respawn.pos[0]
data modify storage jakarta:recall y set from entity @s respawn.pos[1]
data modify storage jakarta:recall z set from entity @s respawn.pos[2]
function jakarta:recall/teleport with storage jakarta:recall

# Arrival effect at the new position (re-anchor with `at @s` since the tp moved us).
execute at @s run playsound minecraft:entity.enderman.teleport master @a ~ ~ ~ 1 1
execute at @s run particle minecraft:portal ~ ~1 ~ 0.3 0.6 0.3 0.1 60
