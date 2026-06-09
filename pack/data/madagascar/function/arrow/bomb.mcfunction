# Bomb Arrow blast: creeper-style explosion, power 2 -> block damage, NO fire.
# A creeper (unlike a ghast fireball) starts no fires. ExplosionRadius:2 matches the old
# fireball's power; Fuse:0 + ignited:1b detonate within a tick with no collision needed (so no
# Motion nudge). Block destruction needs gamerule mobGriefing=true (default); entity damage applies
# regardless. To bring fire back: summon minecraft:fireball ~ ~ ~ {ExplosionPower:2,Motion:[0.0,-0.1,0.0]}
# Invisible:1b hides the one-tick creeper flash before it detonates; the explosion still renders.
summon minecraft:creeper ~ ~ ~ {ExplosionRadius:2,Fuse:0,ignited:1b,Invisible:1b}
kill @s
