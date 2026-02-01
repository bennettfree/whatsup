# WhatsUp Development Server Startup Script
# Automatically updates IP address and starts both servers

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WhatsUp Development Server Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get current IP address
$currentIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*"} | Select-Object -First 1).IPAddress

if ($currentIP) {
    Write-Host "[1/4] Detected IP Address: $currentIP" -ForegroundColor Green
    
    # Update .env file with current IP
    $envContent = Get-Content .env
    $newEnvContent = $envContent -replace 'EXPO_PUBLIC_API_URL=http://[0-9.]+:4000', "EXPO_PUBLIC_API_URL=http://$currentIP:4000"
    $newEnvContent | Set-Content .env
    
    Write-Host "[2/4] Updated .env with current IP" -ForegroundColor Green
} else {
    Write-Host "[!] Could not detect IP address, using existing .env" -ForegroundColor Yellow
}

Write-Host ""

# Check for existing Node processes
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "[3/4] Found existing Node processes. Cleaning up..." -ForegroundColor Yellow
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "      Cleanup complete." -ForegroundColor Green
} else {
    Write-Host "[3/4] No existing Node processes found." -ForegroundColor Green
}

Write-Host ""
Write-Host "[4/4] Starting servers in new windows..." -ForegroundColor Green
Write-Host ""

# Start Backend API in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; Write-Host 'Backend API Server' -ForegroundColor Cyan; npm run dev:api"

# Wait for backend to start
Start-Sleep -Seconds 3

# Start Expo in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; Write-Host 'Expo Development Server' -ForegroundColor Cyan; npx expo start"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Servers Starting!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend API:  http://$currentIP:4000" -ForegroundColor Green
Write-Host "Expo Server:  http://localhost:8081" -ForegroundColor Green
Write-Host ""
Write-Host "Check the new terminal windows for:" -ForegroundColor White
Write-Host "  - API server status and logs" -ForegroundColor Gray
Write-Host "  - Expo QR code to scan with your device" -ForegroundColor Gray
Write-Host ""
Write-Host "Look for the GREEN 'LIVE DATA' badge in your app!" -ForegroundColor Green
Write-Host ""
