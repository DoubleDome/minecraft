# Torch Arrow: called at a landed Torch Arrow (see arrow/tick). Read the floor/wall block ids the
# recipe baked into the marker (default to a normal torch if absent / for old arrows), then hand off
# to the reusable mounted-block placer. See docs/torch_arrow.md.
data modify storage madagascar:place floor set value "minecraft:torch"
data modify storage madagascar:place wall set value "minecraft:wall_torch"
data modify storage madagascar:place floor set from entity @s item.components."minecraft:custom_data".f
data modify storage madagascar:place wall set from entity @s item.components."minecraft:custom_data".w
function madagascar:util/place_mounted with storage madagascar:place
kill @s
