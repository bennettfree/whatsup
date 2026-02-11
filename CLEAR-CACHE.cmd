@echo off
echo.
echo ========================================
echo   WhatsUp Cache Clearer
echo ========================================
echo.

echo Step 1: Stopping all Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo   Done!
echo.

echo Step 2: Removing Expo cache...
rmdir /s /q .expo 2>nul
echo   Done!
echo.

echo Step 3: Removing Metro cache...
rmdir /s /q node_modules\.cache 2>nul
echo   Done!
echo.

echo Step 4: Clearing npm cache...
call npm cache clean --force
echo   Done!
echo.

echo.
echo ========================================
echo   CACHE CLEARED
echo ========================================
echo.
echo You can now run: START.cmd
echo.
pause
