@echo off
echo.
echo ========================================
echo   WhatsUp Development Environment
echo   One-Command Startup
echo ========================================
echo.

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0dev-start.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Startup failed. Check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo Startup complete! Check the new windows that opened.
echo.
