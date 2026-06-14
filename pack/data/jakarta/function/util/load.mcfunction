# Shared scratch for util functions.
# jakarta.place  — "already placed" flag for util/place_mounted (stops after first placement).
# jakarta.lw     — per-marker countdown for the Lava Walker temporary path (lava_walker/revert).
# jakarta.recall — minecraft.used:popped_chorus_fruit; ticks when a Recall Fruit is eaten.
scoreboard objectives add jakarta.place dummy
scoreboard objectives add jakarta.lw dummy
scoreboard objectives add jakarta.recall minecraft.used:minecraft.popped_chorus_fruit
