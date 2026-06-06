# Bomb Arrow — detonate on contact. Runs every tick via the minecraft:tick tag.
# The item is a TIPPED arrow, so every bow (Infinity included) consumes it natively, like
# a potion arrow — no manual ammo accounting needed. Tipped arrows still fire as the
# minecraft:arrow entity, so detection is unchanged: find landed arrows carrying the marker.
execute as @e[type=minecraft:arrow,nbt={inGround:1b,item:{components:{"minecraft:custom_data":{explosive:1b}}}}] at @s run function madagascar:arrow/explode

# Torch Arrow: landed marked arrows place their torch on a real adjacent support (probes the
# blocks around the landing point — no shot-angle guessing). See arrow/torch + util/place_mounted.
execute as @e[type=minecraft:arrow,nbt={inGround:1b,item:{components:{"minecraft:custom_data":{torch:1b}}}}] at @s run function madagascar:arrow/torch
