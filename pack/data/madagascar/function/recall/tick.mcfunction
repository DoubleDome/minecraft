# Recall Fruit — warp the player to their spawn when they finish eating one. Runs every tick via
# the minecraft:tick tag. madagascar.recall is a minecraft.used:popped_chorus_fruit objective, so it
# only ticks for our item (vanilla popped chorus fruit isn't consumable). See docs/recall_fruit.md.
execute as @a[scores={madagascar.recall=1..}] at @s run function madagascar:recall/go
scoreboard players reset @a[scores={madagascar.recall=1..}] madagascar.recall
