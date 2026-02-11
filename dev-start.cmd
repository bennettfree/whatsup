@echo off
echo.
echo ========================================
echo   WhatsUp Bulletproof Startup
echo ========================================
echo.

echo [1/4] Updating .env with current IP...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$r = Get-NetRoute -DestinationPrefix '0.0.0.0/0' ^| Sort-Object RouteMetric,IfMetric ^| Select-Object -First 1; " ^
  "$ip = (Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object { $_.InterfaceIndex -eq $r.ifIndex -and $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -notlike '127.*' } ^| Select-Object -First 1).IPAddress; " ^
  "if ($ip) { (Get-Content .env -Raw) -replace 'EXPO_PUBLIC_API_URL=http://[^\r\n]*', ('EXPO_PUBLIC_API_URL=http://' + $ip + ':4000') ^| Set-Content .env -NoNewline; Write-Host 'Updated to: http://' $ip ':4000' -ForegroundColor Green } else { Write-Host 'Using localhost' -ForegroundColor Yellow }"

echo.
echo [2/4] Cleaning old processes...
taskkill /F /IM node.exe >NUL 2>&1
timeout /t 2 /nobreak >NUL
echo   Done.

echo.
echo [3/4] Starting backend server...
start "WhatsUp Backend" cmd /k "npm run dev:api"
timeout /t 8 /nobreak >NUL

echo.
echo [4/4] Verifying backend and starting Expo...
powershell -NoProfile -Command ^
  "$healthy = $false; " ^
  "for ($i = 0; $i -lt 10; $i++) { " ^
  "  try { " ^
  "    $r = Invoke-WebRequest -Uri 'http://localhost:4000/api/health' -TimeoutSec 2 -UseBasicParsing; " ^
  "    if ($r.StatusCode -eq 200) { $healthy = $true; break; } " ^
  "  } catch { Start-Sleep -Seconds 2; } " ^
  "} " ^
  "if ($healthy) { " ^
  "  Write-Host 'Backend healthy!' -ForegroundColor Green; " ^
  "  Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd ''%CD%''; npx expo start -c'; " ^
  "} else { " ^
  "  Write-Host 'Backend failed to start!' -ForegroundColor Red; " ^
  "  exit 1; " ^
  "}"

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Check the opened windows for:
echo   - Backend logs
echo   - Expo QR code
echo.
pause
