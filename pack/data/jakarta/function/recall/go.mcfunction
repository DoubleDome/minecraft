# Run as a player who just ate a Golden Chorus Fruit. Warp to their personal spawn if one is set;
# else refund the fruit and tell them. 26.x stores the spawn in the `respawn` compound (pos/dimension).
execute if data entity @s respawn.pos run function jakarta:recall/warp
execute unless data entity @s respawn.pos run tellraw @s [{"text":"☄ ","color":"light_purple"},{"text":"No spawn point set — sleep in a bed or set a respawn anchor first.","color":"red"}]
execute unless data entity @s respawn.pos run give @s minecraft:popped_chorus_fruit[minecraft:consumable={consume_seconds:1.6f,animation:"eat",sound:"minecraft:entity.generic.eat",has_consume_particles:true},minecraft:custom_data={recall:true},minecraft:item_name={text:"Golden Chorus Fruit",color:"gold"},minecraft:item_model="jakarta:golden_chorus_fruit",minecraft:enchantment_glint_override=true] 1
