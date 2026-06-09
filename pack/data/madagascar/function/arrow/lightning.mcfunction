# Lightning Arrow strike: summon a lightning bolt at the lodged/contacting arrow, then remove it.
# Called from arrow/tick on the same two triggers as the bomb arrow (block landing + direct entity
# hit / proximity fuse). The bolt deals its vanilla shock damage and mob conversions; any fire it
# starts is gated by gamerule mobGriefing=true (default), same as the bomb arrow's blast.
summon minecraft:lightning_bolt ~ ~ ~
kill @s
