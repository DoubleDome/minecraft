# Direct-hit detonation, run AS the struck entity (called from arrow/tick on the weakness amp100
# marker that vanilla collision applied). Blast centered on the victim; do NOT kill @s — let the
# creeper explosion deal the damage. Clear the marker so it detonates exactly once.
summon minecraft:creeper ~ ~ ~ {ExplosionRadius:2,Fuse:0,ignited:1b,Invisible:1b}
effect clear @s minecraft:weakness
