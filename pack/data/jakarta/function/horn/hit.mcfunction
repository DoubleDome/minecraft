# A struck entity: tag it so the beam hits it only once, then deal warden-grade sonic_boom damage
# (10, armor/shield/resistance-piercing via the vanilla damage type's tags), credited to the shooter.
tag @s add sonic_hit
damage @s 10 minecraft:sonic_boom by @e[tag=sonic_shooter,limit=1]
