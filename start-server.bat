@echo off
title American Mah Jong Server
echo.
echo  ==========================================
echo   American Mah Jong - Multiplayer Server
echo  ==========================================
echo.
echo  Building latest code...
echo.
call npm run build
if errorlevel 1 (
    echo.
    echo  BUILD FAILED. See errors above.
    pause
    exit /b 1
)
echo.
echo  ==========================================
echo   Build complete. Starting server...
echo   Open this address in your browser:
echo.
echo     http://localhost:5174
echo.
echo   Share with others on your wifi — the
echo   exact LAN address is shown below.
echo  ==========================================
echo.
npm run server
pause
