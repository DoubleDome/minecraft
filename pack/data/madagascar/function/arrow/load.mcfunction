# Frost Arrow timer objective. Frozen mobs hold their remaining freeze ticks on this score; the
# loop in arrow/tick counts each one down and restores AI (NoAI:0b) when it reaches 0. Registered
# via the minecraft:load tag (see pack/data/minecraft/tags/function/load.json).
scoreboard objectives add madagascar.freeze dummy
