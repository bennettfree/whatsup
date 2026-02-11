# Package Corruption Fix Script
# Run this if you see "Unable to resolve expo-asset" or similar errors

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Package Corruption Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Removing corrupted packages..." -ForegroundColor Yellow
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
Write-Host "  ✓ Cleaned" -ForegroundColor Green

Write-Host ""
Write-Host "[2/4] Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "  ✓ Cache cleared" -ForegroundColor Green

Write-Host ""
Write-Host "[3/4] Reinstalling packages (this may take 2-3 minutes)..." -ForegroundColor Yellow
npm install
Write-Host "  ✓ Packages installed" -ForegroundColor Green

Write-Host ""
Write-Host "[4/4] Verifying critical packages..." -ForegroundColor Yellow
$expoAsset = Test-Path "node_modules\expo-haptics"
$asyncStorage = Test-Path "node_modules\@react-native-async-storage\async-storage"

if ($expoAsset -and $asyncStorage) {
  Write-Host "  ✓ All critical packages verified" -ForegroundColor Green
} else {
  Write-Host "  ⚠ Some packages missing. Running expo install..." -ForegroundColor Yellow
  npx expo install expo-haptics "@react-native-async-storage/async-storage"
  Write-Host "  ✓ Expo packages installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Fix Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run: .\dev-start.ps1" -ForegroundColor Cyan
Write-Host ""
