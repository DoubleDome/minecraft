# Sonic Horn — scoreboard setup. horn_grace: short edge-detect timer (kept alive while the player is
# mid-blow, so the boom fires once per blow not once per tick); horn_ray: raycast step counter;
# horn_aux: fake-player scratch for durability/Unbreaking math.
scoreboard objectives add horn_grace dummy
scoreboard objectives add horn_ray dummy
scoreboard objectives add horn_aux dummy
