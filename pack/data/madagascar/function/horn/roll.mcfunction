# Macro: roll an integer in 1..denom into #horn_roll. denom = Unbreaking level + 1, so a result of 1
# means "this blow consumes durability" (1/denom probability). With denom 1 (no Unbreaking) it is
# always 1.
$execute store result score #horn_roll horn_aux run random value 1..$(denom)
