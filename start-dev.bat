@echo off
setlocal enabledelayedexpansion
title KLTN - RestoHub Starter
cd /d "%~dp0"

echo ===================================================
echo     Starting KLTN - RestoHub Project...
echo ===================================================
echo Directory: %~dp0
echo.

:: Kiem tra thu muc server
if not exist "%~dp0server" (
    echo [ERROR] Khong tim thay thu muc "server" tai: %~dp0server
    pause
    exit /b 1
)

:: Kiem tra thu muc client
if not exist "%~dp0client" (
    echo [ERROR] Khong tim thay thu muc "client" tai: %~dp0client
    pause
    exit /b 1
)

:: Kiem tra node_modules server
if not exist "%~dp0server\node_modules" (
    echo [INFO] Thu muc node_modules cua server chua co, dang cai dat dependencies...
    cmd /c "cd /d ""%~dp0server"" && npm install"
)

:: Kiem tra node_modules client
if not exist "%~dp0client\node_modules" (
    echo [INFO] Thu muc node_modules cua client chua co, dang cai dat dependencies...
    cmd /c "cd /d ""%~dp0client"" && npm install"
)

echo [1/2] Dang khoi chay Backend Server (Port 8080)...
start "KLTN Backend Server (Port 8080)" /D "%~dp0server" cmd /k "npm run dev"

echo [2/2] Dang khoi chay Frontend Client (Port 5173)...
start "KLTN Frontend Client (Port 5173)" /D "%~dp0client" cmd /k "npm run dev"

echo.
echo ===================================================
echo   Cac dich vu dang khoi dong:
echo   - Backend:  http://localhost:8080
echo   - Frontend: http://localhost:5173
echo ===================================================
echo.
echo Nhan phim bat ky de dong cua so nay (Backend va Frontend van tiep tuc chay)...
pause >nul
