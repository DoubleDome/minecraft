# Spawn a real ghast fireball at the snowball and aim it. A minecraft:fireball flies by
# accelerating along its `direction` field each tick (scaled by acceleration_power) — NOT by Motion.
# So copy the snowball's Motion into `direction` (sustains the aim) and `Motion` (initial velocity).
# Verified from server-26.1.2.jar: AbstractHurtingProjectile NBT keys are `direction` +
# `acceleration_power` (the old 1.21.x `power` list is gone). ExplosionPower 1 = a real ghast;
# bump to 2 for harder craters. Block damage + fire require gamerule mobGriefing=true (default).
summon minecraft:fireball ~ ~ ~ {ExplosionPower:3,acceleration_power:0.1,Tags:["mada_fb_new"]}
data modify entity @e[type=minecraft:fireball,tag=mada_fb_new,limit=1,sort=nearest] direction set from entity @s Motion
data modify entity @e[type=minecraft:fireball,tag=mada_fb_new,limit=1,sort=nearest] Motion set from entity @s Motion
tag @e[type=minecraft:fireball,tag=mada_fb_new] remove mada_fb_new
kill @s
