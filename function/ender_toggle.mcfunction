execute unless entity @e[nbt={CustomName:"{\"text\":\"EnderMarker\"}"},limit=1] run function madagascar:ender_gate
execute if entity @e[nbt={CustomName:"{\"text\":\"EnderMarker\"}"},limit=1] run function madagascar:ender_destroy
