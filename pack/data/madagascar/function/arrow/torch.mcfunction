# Torch Arrow placement. Called rotated+positioned at a landed Torch Arrow (see arrow/tick).
# The marker's "t" field is the torch block-id prefix ("" normal / "soul_" / "redstone_") set by
# the recipe; the macro builds minecraft:<t>torch / minecraft:<t>wall_torch from it. Default to ""
# first so any arrow missing the field falls back to a normal torch (and so a stale value from a
# previous arrow can't leak in — command storage persists). See docs/TORCH_ARROW.md.
data modify storage madagascar:arrow t set value ""
data modify storage madagascar:arrow t set from entity @s item.components."minecraft:custom_data".t
function madagascar:arrow/torch_place with storage madagascar:arrow
kill @s
