# Run at a Lava Walker player standing on enchant-placed magma. Drop one tracking marker per magma
# cell (deduped — skip if this cell already has one) with an ~8s countdown (160 ticks).
execute positioned ~ ~-1 ~ unless entity @e[type=minecraft:marker,tag=lw_trail,dx=0,dy=0,dz=0] run summon minecraft:marker ~ ~ ~ {Tags:["lw_trail","lw_new"]}
scoreboard players set @e[type=minecraft:marker,tag=lw_new] madagascar.lw 160
tag @e[type=minecraft:marker,tag=lw_new] remove lw_new
