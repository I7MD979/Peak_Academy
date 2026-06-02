@echo off
cd /d "%~dp0backend"
echo Stopping ALL processes on port 4000...
call npm run kill-port
echo.
echo Starting Peak Academy API (v5)...
start "Peak API" cmd /k npm run dev
echo.
echo Open http://localhost:4000/api/health — api_version must contain sessions-v5
pause
