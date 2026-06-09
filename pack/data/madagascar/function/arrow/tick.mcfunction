# Bomb Arrow — detonate on contact. Runs every tick via the minecraft:tick tag.
# The item is a TIPPED arrow, so every bow (Infinity included) consumes it natively, like
# a potion arrow — no manual ammo accounting needed. Tipped arrows still fire as the
# minecraft:arrow entity, so detection is unchanged: find landed arrows carrying the marker.
execute as @e[type=minecraft:arrow,nbt={inGround:1b,item:{components:{"minecraft:custom_data":{bomb:1b}}}}] at @s run function madagascar:arrow/bomb

# Direct entity hit: a non-piercing arrow that strikes a mob/player is absorbed (becomes a stuck
# arrow) and never goes inGround — so the line above misses it. Tag the shooter first so a
# point-blank shot doesn't detonate at the muzzle, then blow up any bomb arrow that has a
# damageable entity (not in #bomb_ignore, not the shooter) within ~2 blocks. Acts as a contact/
# proximity fuse. Then clear the tag.
# NB: the shooter is reached via `on origin` (projectile's spawner), NOT `on owner` (that's a
# tamed pet's owner and matches nothing on an arrow — using it leaves the shooter untagged, so
# the fuse detects them at the muzzle and detonates on release).
execute as @e[type=minecraft:arrow,nbt={item:{components:{"minecraft:custom_data":{bomb:1b}}}}] on origin run tag @s add bomb_owner
execute as @e[type=minecraft:arrow,nbt={item:{components:{"minecraft:custom_data":{bomb:1b}}}}] at @s if entity @e[distance=..2,tag=!bomb_owner,type=!#madagascar:bomb_ignore] run function madagascar:arrow/bomb
tag @e[tag=bomb_owner] remove bomb_owner

# Torch Arrow: landed marked arrows place their torch on a real adjacent support (probes the
# blocks around the landing point — no shot-angle guessing). See arrow/torch + util/place_mounted.
execute as @e[type=minecraft:arrow,nbt={inGround:1b,item:{components:{"minecraft:custom_data":{torch:1b}}}}] at @s run function madagascar:arrow/torch

# Lightning Arrow — strike on contact. Same two detectors as the bomb arrow: a landed marked arrow,
# plus a direct entity hit (absorbed arrows never set inGround) via a ~2-block proximity fuse. Tag
# the shooter first (via `on origin`, not `on owner` — see the bomb note above) so a point-blank
# shot doesn't strike at the muzzle, reuse #bomb_ignore to skip projectiles/markers/etc, then clear.
execute as @e[type=minecraft:arrow,nbt={inGround:1b,item:{components:{"minecraft:custom_data":{lightning:1b}}}}] at @s run function madagascar:arrow/lightning
execute as @e[type=minecraft:arrow,nbt={item:{components:{"minecraft:custom_data":{lightning:1b}}}}] on origin run tag @s add lightning_owner
execute as @e[type=minecraft:arrow,nbt={item:{components:{"minecraft:custom_data":{lightning:1b}}}}] at @s if entity @e[distance=..2,tag=!lightning_owner,type=!#madagascar:bomb_ignore] run function madagascar:arrow/lightning
tag @e[tag=lightning_owner] remove lightning_owner

# Charged Bomb Arrow — charged-creeper blast on contact. Same two detectors as the bomb/lightning
# arrows: a landed marked arrow, plus a direct entity hit via the ~2-block proximity fuse. Shooter
# is tagged via `on origin` (not `on owner`) so a point-blank shot doesn't blow at the muzzle.
execute as @e[type=minecraft:arrow,nbt={inGround:1b,item:{components:{"minecraft:custom_data":{charged_bomb:1b}}}}] at @s run function madagascar:arrow/charged_bomb
execute as @e[type=minecraft:arrow,nbt={item:{components:{"minecraft:custom_data":{charged_bomb:1b}}}}] on origin run tag @s add charged_bomb_owner
execute as @e[type=minecraft:arrow,nbt={item:{components:{"minecraft:custom_data":{charged_bomb:1b}}}}] at @s if entity @e[distance=..2,tag=!charged_bomb_owner,type=!#madagascar:bomb_ignore] run function madagascar:arrow/charged_bomb
tag @e[tag=charged_bomb_owner] remove charged_bomb_owner

# Frost Arrow — freeze the struck mob: NoAI (can't move or attack, still killable) for a timed
# duration, then auto-thaw. DIRECT HIT only: the target is selected by hitbox overlap (a zero-size
# `dx=0,dy=0,dz=0` volume at the arrow's position = the mob whose bounding box contains the arrow),
# not by proximity — so near-misses don't freeze, and it works regardless of mob height. Shooter
# tagged via `on origin` so the arrow spawning inside the firer at launch doesn't freeze them; reuse
# #bomb_ignore to skip projectiles/markers/etc. freeze_hit reads the per-tier duration, consumes the arrow.
execute as @e[type=minecraft:arrow,nbt={item:{components:{"minecraft:custom_data":{freeze:1b}}}}] on origin run tag @s add freeze_owner
execute as @e[type=minecraft:arrow,nbt={item:{components:{"minecraft:custom_data":{freeze:1b}}}}] at @s if entity @e[dx=0,dy=0,dz=0,tag=!freeze_owner,type=!#madagascar:bomb_ignore] run function madagascar:arrow/freeze_hit
tag @e[tag=freeze_owner] remove freeze_owner

# Frozen-mob timer: tick each frozen mob down; thaw (restore AI) and untag when it reaches 0.
# The madagascar.freeze objective is created in arrow/load.
scoreboard players remove @e[tag=mada_frozen] madagascar.freeze 1
execute as @e[tag=mada_frozen,scores={madagascar.freeze=..0}] run data merge entity @s {NoAI:0b}
tag @e[tag=mada_frozen,scores={madagascar.freeze=..0}] remove mada_frozen
