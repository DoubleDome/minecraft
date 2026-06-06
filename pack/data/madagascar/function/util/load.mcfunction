# Shared scratch for util functions.
# madagascar.place  — "already placed" flag for util/place_mounted (stops after first placement).
# madagascar.lw     — per-marker countdown for the Lava Walker temporary path (lava_walker/revert).
# madagascar.recall — minecraft.used:popped_chorus_fruit; ticks when a Recall Fruit is eaten.
scoreboard objectives add madagascar.place dummy
scoreboard objectives add madagascar.lw dummy
scoreboard objectives add madagascar.recall minecraft.used:minecraft.popped_chorus_fruit
