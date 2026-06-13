# Run AS a player wearing the Wings of Icarus, AT their position (from icarus/tick).
# "Do not fly too close to the sun." High altitude melts the wax.
#   y >= 256  -> wings melt away
#   y 224-256 -> warning band (wax softening)
execute if predicate madagascar:icarus/too_high run function madagascar:icarus/melt
execute if predicate madagascar:icarus/softening unless predicate madagascar:icarus/too_high run function madagascar:icarus/warn
