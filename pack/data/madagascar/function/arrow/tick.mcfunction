# Bomb Arrow — detonate on contact. Runs every tick via the minecraft:tick tag.
# The item is a TIPPED arrow, so every bow (Infinity included) consumes it natively, like
# a potion arrow — no manual ammo accounting needed. Tipped arrows still fire as the
# minecraft:arrow entity, so detection is unchanged: find landed arrows carrying the marker.
execute as @e[type=minecraft:arrow,nbt={inGround:1b,item:{components:{"minecraft:custom_data":{bomb:1b}}}}] at @s run function madagascar:arrow/bomb

# Direct entity hit: a non-piercing arrow that strikes a mob/player is absorbed (becomes a stuck
# arrow) and never goes inGround — so the line above misses it. Tag the shooter first so a
# point-blank shot doesn't detonate at the muzzle, then blow up any bomb arrow that has a
# damageable entity (not in #bomb_ignore, not the shooter) within ~2 blocks. Acts as a contact/
# proximity fuse. Then clear the owner tag.
execute as @e[type=minecraft:arrow,nbt={item:{components:{"minecraft:custom_data":{bomb:1b}}}}] on owner run tag @s add bomb_owner
execute as @e[type=minecraft:arrow,nbt={item:{components:{"minecraft:custom_data":{bomb:1b}}}}] at @s if entity @e[distance=..2,tag=!bomb_owner,type=!#madagascar:bomb_ignore] run function madagascar:arrow/bomb
tag @e[tag=bomb_owner] remove bomb_owner

# Torch Arrow: landed marked arrows place their torch on a real adjacent support (probes the
# blocks around the landing point — no shot-angle guessing). See arrow/torch + util/place_mounted.
execute as @e[type=minecraft:arrow,nbt={inGround:1b,item:{components:{"minecraft:custom_data":{torch:1b}}}}] at @s run function madagascar:arrow/torch
