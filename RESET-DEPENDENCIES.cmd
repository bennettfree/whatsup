@echo off
echo.
echo ========================================
echo   WhatsUp Dependency Reset Tool
echo   Use this if you get module errors
echo ========================================
echo.

echo Step 1: Stopping all Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo   Done!
echo.

echo Step 2: Removing node_modules...
rmdir /s /q node_modules 2>nul
rmdir /s /q .expo 2>nul
echo   Done!
echo.

echo Step 3: Clearing npm cache...
call npm cache clean --force
echo   Done!
echo.

echo Step 4: Installing fresh dependencies with Expo...
call npm install
echo   Done!
echo.

echo Step 5: Installing Expo packages with correct versions...
call npx expo install expo-asset expo-constants expo-font expo-keep-awake expo-splash-screen
echo   Done!
echo.

echo.
echo ========================================
echo   RESET COMPLETE
echo ========================================
echo.
echo You can now run: START.cmd
echo.
pause
