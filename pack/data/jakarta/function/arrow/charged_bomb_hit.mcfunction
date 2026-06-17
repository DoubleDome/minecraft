# Direct-hit detonation, run AS the struck entity (called from arrow/tick on the unluck amp100
# marker that vanilla collision applied). Powered-creeper blast centered on the victim; do NOT kill
# @s — the explosion deals the damage. Clear the marker so it detonates exactly once.
summon minecraft:creeper ~ ~ ~ {powered:1b,ignited:1b,Fuse:0,ExplosionRadius:3,Invisible:1b}
effect clear @s minecraft:unluck
