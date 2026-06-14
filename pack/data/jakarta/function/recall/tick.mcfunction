# Golden Chorus Fruit — warp the player to their spawn when they finish eating one. Runs every tick via
# the minecraft:tick tag. jakarta.recall is a minecraft.used:popped_chorus_fruit objective, so it
# only ticks for our item (vanilla popped chorus fruit isn't consumable). See docs/features/recall_fruit.md.
execute as @a[scores={jakarta.recall=1..}] at @s run function jakarta:recall/go
scoreboard players reset @a[scores={jakarta.recall=1..}] jakarta.recall
