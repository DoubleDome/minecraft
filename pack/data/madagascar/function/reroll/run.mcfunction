# Trade Reroller — advancement reward, runs as the player who right-clicked a villager with the
# marked stick. Re-arm the one-shot trigger (revoke so it can fire again), then reroll the villager
# they clicked: the nearest one within interaction reach (the interact packet guarantees it's close
# and in front, so nearest is reliable; clustered villagers are the only edge case).
advancement revoke @s only madagascar:reroll/use
execute as @e[type=minecraft:villager,limit=1,sort=nearest,distance=..4.5] run function madagascar:reroll/wipe
