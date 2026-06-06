# Throwable Fire Charge — convert marked snowballs into real ghast fireballs on their first tick,
# so vanilla handles the straight flight, impact, explosion, and deflection for free. Runs every
# tick via the minecraft:tick tag.
# The thrown stack rides on the snowball's Item NBT (CamelCase) — same idea as the arrow's `item`.
execute as @e[type=minecraft:snowball,nbt={Item:{components:{"minecraft:custom_data":{ghast:1b}}}}] at @s run function madagascar:fireball/launch
