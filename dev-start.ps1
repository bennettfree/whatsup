# WhatsUp Bulletproof Development Startup Script
# Ensures backend connection and clean app state every time

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WhatsUp Development Environment" -ForegroundColor Cyan
Write-Host "  Bulletproof Startup System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Detect and update IP
Write-Host "Step 1 of 7: Detecting network IP..." -ForegroundColor Yellow

$defaultRoute = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
  Sort-Object -Property RouteMetric, IfMetric |
  Select-Object -First 1

$ipCandidates = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.InterfaceAlias -notlike "*Loopback*" } |
  Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -notlike "127.*" } |
  Where-Object { $_.InterfaceAlias -notmatch "vEthernet|WSL|Hyper-V|Virtual|VPN|Tailscale|ZeroTier|Hamachi" }

$preferred = $null
if ($defaultRoute) {
  $preferred = $ipCandidates | Where-Object { $_.InterfaceIndex -eq $defaultRoute.ifIndex } | Select-Object -First 1
}
if (-not $preferred) {
  $preferred = $ipCandidates | Where-Object { $_.InterfaceAlias -match "Wi-?Fi|Ethernet" } | Select-Object -First 1
}
if (-not $preferred) {
  $preferred = $ipCandidates | Select-Object -First 1
}

$currentIP = $preferred.IPAddress
$currentInterface = $preferred.InterfaceAlias

if (-not $currentIP) {
  Write-Host "  ERROR: Could not detect IP. Using localhost." -ForegroundColor Red
  $currentIP = "localhost"
}

Write-Host "  Success: IP = $currentIP on $currentInterface" -ForegroundColor Green

# Step 2: Update .env
Write-Host ""
Write-Host "Step 2 of 7: Updating .env file..." -ForegroundColor Yellow

$envContent = Get-Content .env -Raw
$newEnvContent = $envContent -replace 'EXPO_PUBLIC_API_URL=http://[^\r\n]*', "EXPO_PUBLIC_API_URL=http://${currentIP}:4000"
$newEnvContent | Set-Content .env -NoNewline

Write-Host "  Success: EXPO_PUBLIC_API_URL set to http://${currentIP}:4000" -ForegroundColor Green

# Step 3: Kill existing processes and clear caches
Write-Host ""
Write-Host "Step 3 of 7: Cleaning up old processes and caches..." -ForegroundColor Yellow

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Clear Metro and Expo caches
if (Test-Path ".expo") {
  try {
    Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
  } catch {
    Write-Host "  Note: Some cache files locked (will be overwritten)" -ForegroundColor Gray
  }
}
if (Test-Path "node_modules\.cache") {
  Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
}

Write-Host "  Success: Old processes and caches cleaned" -ForegroundColor Green

# Step 4: Clean npm cache and reinstall dependencies if needed
Write-Host ""
Write-Host "Step 4 of 7: Checking dependencies..." -ForegroundColor Yellow

if (-not (Test-Path "node_modules\expo-asset")) {
  Write-Host "  Missing dependencies detected. Running npm install..." -ForegroundColor Yellow
  npm install
  Write-Host "  Success: Dependencies installed" -ForegroundColor Green
} else {
  Write-Host "  Success: Dependencies OK" -ForegroundColor Green
}

# Step 5: Start Backend
Write-Host ""
Write-Host "Step 5 of 7: Starting backend server..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; Write-Host 'WhatsUp Backend Server' -ForegroundColor Cyan; npm run dev:api"

Start-Sleep -Seconds 6

# Step 6: Verify backend health
Write-Host ""
Write-Host "Step 6 of 7: Verifying backend health..." -ForegroundColor Yellow

$maxAttempts = 15
$attempt = 0
$backendHealthy = $false

while ($attempt -lt $maxAttempts -and -not $backendHealthy) {
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
      $backendHealthy = $true
      Write-Host "  Success: Backend healthy at http://localhost:4000" -ForegroundColor Green
    }
  } catch {
    $attempt++
    if ($attempt -lt $maxAttempts) {
      Write-Host "  Waiting for backend (attempt $attempt of $maxAttempts)..." -ForegroundColor Gray
      Start-Sleep -Seconds 2
    }
  }
}

if (-not $backendHealthy) {
  Write-Host "  ERROR: Backend failed to start after $maxAttempts attempts" -ForegroundColor Red
  Write-Host "  Check the backend terminal window for errors" -ForegroundColor Red
  exit 1
}

# Test network accessibility
if ($currentIP -ne "localhost") {
  try {
    $netResponse = Invoke-WebRequest -Uri "http://${currentIP}:4000/api/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    Write-Host "  Success: Backend accessible from network at http://${currentIP}:4000" -ForegroundColor Green
  } catch {
    Write-Host "  Warning: Backend NOT accessible from network IP" -ForegroundColor Yellow
    Write-Host "  This means your phone cannot connect" -ForegroundColor Yellow
    Write-Host "  Fix: Run as Administrator and execute:" -ForegroundColor Gray
    Write-Host "  New-NetFirewallRule -DisplayName 'WhatsUp Dev' -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow -Profile Private" -ForegroundColor Gray
  }
}

# Step 7: Start Expo
Write-Host ""
Write-Host "Step 7 of 7: Starting Expo with cache clear..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; Write-Host 'WhatsUp Expo Server' -ForegroundColor Cyan; npx expo start -c"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   STARTUP COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://${currentIP}:4000 (verified)" -ForegroundColor Green
Write-Host "Frontend: Starting in new window..." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Wait for Expo QR code (in new window)" -ForegroundColor White
Write-Host "  2. Scan QR with Expo Go app" -ForegroundColor White
Write-Host "  3. Look for BLUE 'LIVE DATA' badge" -ForegroundColor White
Write-Host ""
Write-Host "To stop: Close both PowerShell windows" -ForegroundColor Gray
Write-Host ""
