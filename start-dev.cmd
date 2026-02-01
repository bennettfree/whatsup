@echo off
echo.
echo ========================================
echo   WhatsUp Development Server Startup
echo ========================================
echo.

echo [1/3] Checking for existing Node processes...
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo WARNING: Node processes are already running.
    echo These may conflict with the dev servers.
    echo.
    choice /C YN /M "Kill all Node processes and restart? (Y/N)"
    if errorlevel 2 goto :skip_kill
    if errorlevel 1 (
        echo Killing all Node processes...
        taskkill /F /IM node.exe >NUL 2>&1
        timeout /t 2 /nobreak >NUL
        echo Done.
        echo.
    )
)
:skip_kill

echo [2/3] Starting Backend API Server on port 4000...
start "WhatsUp API Server" cmd /k "npm run dev:api"
timeout /t 5 /nobreak >NUL

echo [3/3] Starting Expo Development Server on port 8081...
start "WhatsUp Expo Server" cmd /k "npx expo start"

echo.
echo ========================================
echo   Servers Starting...
echo ========================================
echo.
echo Backend API:  http://localhost:4000
echo Expo Server:  http://localhost:8081
echo.
echo Check the opened terminal windows for QR codes and logs.
echo.
echo IMPORTANT:
echo - Look for "LIVE DATA" badge on the map (green = real data, orange = mock)
echo - Check console logs for connection status
echo.
pause
