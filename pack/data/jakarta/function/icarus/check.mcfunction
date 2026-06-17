# Run AS a player wearing the Icarus Wings, AT their position (from icarus/tick).
# "Do not fly too close to the sun." High altitude melts the wax.
#   y >= 256  -> wings melt away
#   y 224-256 -> warning band (wax softening)
execute if predicate jakarta:icarus/too_high run function jakarta:icarus/melt
execute if predicate jakarta:icarus/softening unless predicate jakarta:icarus/too_high run function jakarta:icarus/warn
