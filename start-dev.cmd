@echo off
echo.
echo ========================================
echo   WhatsUp Development Server Startup
echo ========================================
echo.

echo [0/4] Updating .env with current LAN IP...
powershell -NoProfile -Command ^
  "$r = Get-NetRoute -DestinationPrefix '0.0.0.0/0' ^| Sort-Object RouteMetric,IfMetric ^| Select-Object -First 1; " ^
  "$ifx = $r.ifIndex; " ^
  "$ip = (Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object { $_.InterfaceIndex -eq $ifx -and $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -notlike '127.*' } ^| Select-Object -First 1).IPAddress; " ^
  "if ($ip) { (Get-Content .env) -replace 'EXPO_PUBLIC_API_URL=http://[0-9.]+:4000', ('EXPO_PUBLIC_API_URL=http://' + $ip + ':4000') ^| Set-Content .env; Write-Host ('Updated EXPO_PUBLIC_API_URL -> http://' + $ip + ':4000'); } else { Write-Host 'Could not detect IP; leaving .env unchanged.' }"
echo.

echo [1/4] Checking for existing Node processes...
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

echo [2/4] Starting Backend API Server on port 4000...
start "WhatsUp API Server" cmd /k "npm run dev:api"
timeout /t 5 /nobreak >NUL

echo [3/4] Starting Expo Development Server on port 8081 (clearing cache)...
start "WhatsUp Expo Server" cmd /k "npx expo start -c"

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
