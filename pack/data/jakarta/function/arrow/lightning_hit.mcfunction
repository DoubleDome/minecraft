# Direct-hit strike, run AS the struck entity (called from arrow/tick on the mining_fatigue amp100
# marker that vanilla collision applied). Bolt at the victim; do NOT kill @s — the bolt deals its
# own shock damage. Clear the marker so it strikes exactly once.
summon minecraft:lightning_bolt ~ ~ ~
effect clear @s minecraft:mining_fatigue
