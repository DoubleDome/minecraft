# Charged Bomb Arrow blast: a charged-creeper-strength explosion (power 6 = block damage, no fire).
# Summon a primed, POWERED creeper at the arrow: the powered flag doubles the creeper's default
# ExplosionRadius 3 -> 6 at detonation, exactly a charged creeper. Fuse:0 + ignited:1b makes it
# blow within a tick (no collision needed, unlike the bomb arrow's fireball). Block destruction is
# gated by gamerule mobGriefing=true (default); the power-6 entity damage applies regardless.
summon minecraft:creeper ~ ~ ~ {powered:1b,ignited:1b,Fuse:0,ExplosionRadius:3}
kill @s
