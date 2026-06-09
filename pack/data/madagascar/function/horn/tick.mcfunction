# Sonic Horn edge-detect upkeep. While blowing, horn/sonic re-sets horn_grace=3 every tick, so it
# never reaches 0 mid-blow. A few ticks after the blow ends it decays to 0 and we clear horn_blowing,
# re-arming the player for the next blow. (Re-blow spacing is the goat horn's own 7 s cooldown.)
scoreboard players remove @a[scores={horn_grace=1..}] horn_grace 1
execute as @a[tag=horn_blowing,scores={horn_grace=..0}] run tag @s remove horn_blowing
