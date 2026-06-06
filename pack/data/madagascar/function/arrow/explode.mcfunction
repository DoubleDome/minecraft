# Explosive Arrow blast: ghast fireball with ExplosionPower 2 -> fire + block damage.
# Summoned at the lodged arrow with a small downward nudge so it collides and detonates
# within a tick. Requires gamerule mobGriefing=true (default) for the blocks/fire to apply.
summon minecraft:fireball ~ ~ ~ {ExplosionPower:2,Motion:[0.0,-0.1,0.0]}
kill @s
