# Macro: teleport @s to their spawn. dim/x/y/z come from the `respawn` compound via storage.
# Centered on the block (+0.5 x/z). Cross-dimension via `execute in`.
$execute in $(dim) run tp @s $(x).5 $(y) $(z).5
