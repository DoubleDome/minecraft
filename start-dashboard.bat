@echo off
REM ===========================================================================
REM  Madagascar web dashboard  (server.js)
REM  Serves http://localhost:3000  -> server status, /add-location, /stats,
REM  /stats/compare, and the Rebuild button.
REM
REM  Runs on the LIVE target, so the Rebuild button and /add-location deploy to
REM  the live world (D:\jakarta-vanilla-26.1.2\...\jakarta_pack). For a safe
REM  sandbox run that only writes to .temp, change "live" to "test" below.
REM  Leave this window open; closing it stops the dashboard.
REM ===========================================================================
cd /d "%~dp0"
node server.js live

echo.
echo Dashboard stopped.
pause
