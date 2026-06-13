# Bomb Arrow — detonate on contact. Runs every tick via the minecraft:tick tag.
# The item is a TIPPED arrow, so every bow (Infinity included) consumes it natively, like
# a potion arrow — no manual ammo accounting needed. Tipped arrows still fire as the
# minecraft:arrow entity, so detection is unchanged: find landed arrows carrying the marker.
execute as @e[type=minecraft:arrow,nbt={inGround:1b,item:{components:{"minecraft:custom_data":{bomb:1b}}}}] at @s run function madagascar:arrow/bomb

# Direct entity hit: a non-piercing arrow that strikes a mob/player is absorbed (becomes a stuck
# arrow) and never goes inGround — so the detector above misses it. Instead the bomb arrow is a
# tipped arrow carrying a hidden marker effect (weakness amp100) that vanilla's own arrow collision
# applies to whatever it strikes — reliable, no proximity/tunneling guesswork, and it can't fire at
# the muzzle since an arrow never hits its own shooter on release. Detonate at the marked victim;
# bomb_hit clears the marker (fires once) and does NOT kill @s — the blast deals the damage.
execute as @e[nbt={active_effects:[{id:"minecraft:weakness",amplifier:100b}]}] at @s run function madagascar:arrow/bomb_hit

# Torch Arrow: landed marked arrows place their torch on a real adjacent support (probes the
# blocks around the landing point — no shot-angle guessing). See arrow/torch + util/place_mounted.
execute as @e[type=minecraft:arrow,nbt={inGround:1b,item:{components:{"minecraft:custom_data":{torch:1b}}}}] at @s run function madagascar:arrow/torch

# Lightning Arrow — strike on contact. Two detectors: a landed marked arrow (block hit), plus a
# direct entity hit. Absorbed arrows never set inGround, so the hit is caught the reliable way — the
# tipped arrow carries a hidden marker effect (mining_fatigue amp100) applied by vanilla collision
# on a direct hit. lightning_hit strikes the victim, clears the marker, and never kills @s.
execute as @e[type=minecraft:arrow,nbt={inGround:1b,item:{components:{"minecraft:custom_data":{lightning:1b}}}}] at @s run function madagascar:arrow/lightning
execute as @e[nbt={active_effects:[{id:"minecraft:mining_fatigue",amplifier:100b}]}] at @s run function madagascar:arrow/lightning_hit

# Charged Bomb Arrow — charged-creeper blast on contact. Two detectors: a landed marked arrow (block
# hit), plus a direct entity hit. Absorbed arrows never set inGround, so the hit is caught the
# reliable way — the tipped arrow carries a hidden marker effect (unluck amp100) applied by vanilla
# collision on a direct hit. charged_bomb_hit detonates at the victim, clears the marker, never kills @s.
execute as @e[type=minecraft:arrow,nbt={inGround:1b,item:{components:{"minecraft:custom_data":{charged_bomb:1b}}}}] at @s run function madagascar:arrow/charged_bomb
execute as @e[nbt={active_effects:[{id:"minecraft:unluck",amplifier:100b}]}] at @s run function madagascar:arrow/charged_bomb_hit

# Frost Arrow — works like a flame arrow: the tipped arrow applies its effect on a DIRECT HIT via
# vanilla's own collision detection (no custom hitbox math). The effect is a hidden marker Slowness
# (amplifier 100) that doubles as the timer — vanilla counts its duration down, so the effect length
# IS the freeze length (ice 4s / packed 8s / blue 16s, set per recipe).
# Freeze: a mob carrying the marker that isn't frozen yet -> NoAI (can't move or attack, killable).
execute as @e[type=!minecraft:player,nbt={active_effects:[{id:"minecraft:slowness",amplifier:100b}]},tag=!mada_frozen] run function madagascar:arrow/apply_freeze
# Thaw: a frozen mob whose marker effect has expired (vanilla ran the timer out) -> restore AI, drop
# the glow/team, untag (arrow/thaw).
execute as @e[tag=mada_frozen,nbt=!{active_effects:[{id:"minecraft:slowness",amplifier:100b}]}] run function madagascar:arrow/thaw
