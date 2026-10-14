@echo off
REM ============================================================
REM  SmartPass - start all three dev services
REM
REM  Double-click this file. It opens three windows:
REM    - Laravel API      :8000
REM    - Vite frontend    :5173 (or the next free port)
REM    - Voice service    :5001
REM
REM  Vite binds all network interfaces (host: true in vite.config.ts),
REM  so it prints a "Network:" URL that any device on the same Wi-Fi
REM  can open. Use that URL on a phone; use localhost on this machine.
REM
REM  Close the three windows to stop everything.
REM ============================================================

cd /d "%~dp0"

echo.
echo  Starting SmartPass...
echo.

REM Show the LAN address up front so the phone URL is easy to find.
echo  This machine's network addresses:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do echo    http://%%a:5173
echo.
echo  (If Vite reports a different port, use that one instead.)
echo.

start "SmartPass API"   cmd /k "cd /d "%~dp0backend" && C:\xampp\php\php.exe artisan serve --port=8000"
start "SmartPass Web"   cmd /k "cd /d "%~dp0frontend" && npm run dev"
start "SmartPass Voice" cmd /k "cd /d "%~dp0voice_service" && python -u voice_api.py"

echo  Three windows opened. Give them a few seconds, then check the
echo  "SmartPass Web" window for the exact Local and Network URLs.
echo.
pause
