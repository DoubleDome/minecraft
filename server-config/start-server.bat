@echo off
REM Intel N100 (4 cores), 16GB single-channel, ~1GB pagefile. This box is
REM CPU-bound, NOT memory-bound: live working set is ~2GB (see crash report,
REM heap used 1936MiB of 6144MiB). A bigger heap does NOT help here and HURTS
REM -- larger heap = longer G1 pauses on weak cores = bigger tick spikes.
REM 8G is generous headroom over the 2GB working set. Do NOT raise toward
REM 12-16G: with only 1GB swap that starves Windows and lengthens GC pauses.
REM Flag set = Aikar's flags, <12GB G1 heap variant.

java -Xms8G -Xmx8G ^
 --add-modules=jdk.incubator.vector ^
 -XX:+UseG1GC ^
 -XX:+ParallelRefProcEnabled ^
 -XX:MaxGCPauseMillis=200 ^
 -XX:+UnlockExperimentalVMOptions ^
 -XX:+DisableExplicitGC ^
 -XX:+AlwaysPreTouch ^
 -XX:G1NewSizePercent=30 ^
 -XX:G1MaxNewSizePercent=40 ^
 -XX:G1HeapRegionSize=8M ^
 -XX:G1ReservePercent=20 ^
 -XX:G1HeapWastePercent=5 ^
 -XX:G1MixedGCCountTarget=4 ^
 -XX:InitiatingHeapOccupancyPercent=15 ^
 -XX:G1MixedGCLiveThresholdPercent=90 ^
 -XX:G1RSetUpdatingPauseTimePercent=5 ^
 -XX:SurvivorRatio=32 ^
 -XX:+PerfDisableSharedMem ^
 -XX:MaxTenuringThreshold=1 ^
 -jar server.jar nogui
