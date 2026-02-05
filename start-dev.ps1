# WhatsUp Development Server Startup Script
# Automatically updates IP address and starts both servers

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WhatsUp Development Server Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get current IP address.
# Prefer the interface used for the default IPv4 route, then filter out virtual/VPN adapters.
$defaultRoute = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
  Sort-Object -Property RouteMetric, IfMetric |
  Select-Object -First 1

$defaultIfIndex = $defaultRoute.ifIndex

$ipCandidates = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.InterfaceAlias -notlike "*Loopback*" } |
  Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -notlike "127.*" } |
  Where-Object { $_.InterfaceAlias -notmatch "vEthernet|WSL|Hyper-V|Virtual|VPN|Tailscale|ZeroTier|Hamachi" }

$preferred = $null
if ($defaultIfIndex) {
  $preferred = $ipCandidates |
    Where-Object { $_.InterfaceIndex -eq $defaultIfIndex } |
    Select-Object -First 1
}

if (-not $preferred) {
  $preferred = $ipCandidates |
    Where-Object { $_.InterfaceAlias -match "Wi-?Fi|Ethernet" } |
    Select-Object -First 1
}

if (-not $preferred) {
  $preferred = $ipCandidates | Select-Object -First 1
}

$currentIP = $preferred.IPAddress
$currentInterface = $preferred.InterfaceAlias

if ($currentIP) {
    Write-Host "[1/4] Detected IP Address: $currentIP ($currentInterface)" -ForegroundColor Green

    # Warn if using a private LAN IP (won't work for hosted/public access).
    $isPrivate =
      $currentIP -like "10.*" -or
      $currentIP -like "192.168.*" -or
      ($currentIP -match "^172\.(1[6-9]|2[0-9]|3[0-1])\.")

    if ($isPrivate) {
      Write-Host "      Note: This is a private LAN IP. It will only work if your phone is on the SAME Wi-Fi/LAN and port 4000 is allowed through the firewall." -ForegroundColor Yellow
      Write-Host "      For a hosted backend, set EXPO_PUBLIC_API_URL to your public https://... URL and the script will leave it unchanged." -ForegroundColor Yellow
    }
    
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

# Wait briefly for backend to start, then probe health from this machine.
Start-Sleep -Seconds 3
try {
  $localOk = $false
  $ipOk = $false

  try {
    Invoke-WebRequest -UseBasicParsing -TimeoutSec 4 "http://localhost:4000/api/health" | Out-Null
    $localOk = $true
  } catch {}

  if ($currentIP) {
    try {
      Invoke-WebRequest -UseBasicParsing -TimeoutSec 4 "http://$currentIP:4000/api/health" | Out-Null
      $ipOk = $true
    } catch {}
  }

  if ($localOk -and -not $ipOk) {
    Write-Host "[!] Backend is running on localhost, but NOT reachable via http://$currentIP:4000 from this machine." -ForegroundColor Yellow
    Write-Host "    Likely cause: Windows Firewall inbound rule blocking port 4000, or the chosen IP is on a non-reachable adapter." -ForegroundColor Yellow
    Write-Host "    Fix: allow inbound TCP 4000 on Private networks, then rerun start-dev.ps1." -ForegroundColor Yellow
  }
} catch {}

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
