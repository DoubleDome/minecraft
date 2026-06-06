# REUSABLE: place a floor-or-wall-mounted block where a projectile landed.
#
# Run positioned at the landed projectile, called `with storage madagascar:place` carrying:
#   floor = block id to use when support is below      (e.g. "minecraft:torch")
#   wall  = block id to use when support is to a side  (e.g. "minecraft:wall_torch"); [facing] added
#
# Why a probe (not the shot angle): the arrow's position sits ON the hit face, so `align xyz` may
# round into EITHER the open cell or the solid block it hit. We handle both: first as if our cell
# is open (support = a neighbour), then as if our cell is the solid block (open cell = a neighbour).
# Floor (support below) is preferred, then the four walls. Ceiling / no support places nothing.
# #minecraft:replaceable (air, water, grass, ...) = "open / not a support". First placement wins
# via the #done flag (set by store success on the setblock).
#
# wall_torch[facing=F] attaches to the block opposite F, so: support north -> facing south, etc.
scoreboard players set #done madagascar.place 0

# --- our cell is OPEN: the torch goes in it, support is a neighbour ---
$execute align xyz if score #done madagascar.place matches 0 if block ~ ~ ~ #minecraft:replaceable unless block ~ ~-1 ~ #minecraft:replaceable store success score #done madagascar.place run setblock ~ ~ ~ $(floor)
$execute align xyz if score #done madagascar.place matches 0 if block ~ ~ ~ #minecraft:replaceable unless block ~ ~ ~-1 #minecraft:replaceable store success score #done madagascar.place run setblock ~ ~ ~ $(wall)[facing=south]
$execute align xyz if score #done madagascar.place matches 0 if block ~ ~ ~ #minecraft:replaceable unless block ~ ~ ~1 #minecraft:replaceable store success score #done madagascar.place run setblock ~ ~ ~ $(wall)[facing=north]
$execute align xyz if score #done madagascar.place matches 0 if block ~ ~ ~ #minecraft:replaceable unless block ~1 ~ ~ #minecraft:replaceable store success score #done madagascar.place run setblock ~ ~ ~ $(wall)[facing=west]
$execute align xyz if score #done madagascar.place matches 0 if block ~ ~ ~ #minecraft:replaceable unless block ~-1 ~ ~ #minecraft:replaceable store success score #done madagascar.place run setblock ~ ~ ~ $(wall)[facing=east]

# --- our cell is the SOLID block hit: the torch goes in an adjacent open cell, attached to us ---
$execute align xyz if score #done madagascar.place matches 0 unless block ~ ~ ~ #minecraft:replaceable if block ~ ~1 ~ #minecraft:replaceable store success score #done madagascar.place run setblock ~ ~1 ~ $(floor)
$execute align xyz if score #done madagascar.place matches 0 unless block ~ ~ ~ #minecraft:replaceable if block ~ ~ ~-1 #minecraft:replaceable store success score #done madagascar.place run setblock ~ ~ ~-1 $(wall)[facing=north]
$execute align xyz if score #done madagascar.place matches 0 unless block ~ ~ ~ #minecraft:replaceable if block ~ ~ ~1 #minecraft:replaceable store success score #done madagascar.place run setblock ~ ~ ~1 $(wall)[facing=south]
$execute align xyz if score #done madagascar.place matches 0 unless block ~ ~ ~ #minecraft:replaceable if block ~1 ~ ~ #minecraft:replaceable store success score #done madagascar.place run setblock ~1 ~ ~ $(wall)[facing=east]
$execute align xyz if score #done madagascar.place matches 0 unless block ~ ~ ~ #minecraft:replaceable if block ~-1 ~ ~ #minecraft:replaceable store success score #done madagascar.place run setblock ~-1 ~ ~ $(wall)[facing=west]
