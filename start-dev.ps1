# KLTN - RestoHub Dev Starter for PowerShell
$rootDir = $PSScriptRoot
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "     Starting KLTN - RestoHub Project...           " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Directory: $rootDir" -ForegroundColor DarkGray
Write-Host ""

if (-not (Test-Path "$rootDir\server")) {
    Write-Host "[ERROR] Khong tim thay thu muc 'server' tai: $rootDir\server" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "$rootDir\client")) {
    Write-Host "[ERROR] Khong tim thay thu muc 'client' tai: $rootDir\client" -ForegroundColor Red
    exit 1
}

Write-Host "[1/2] Dang khoi chay Backend Server (Port 8080)..." -ForegroundColor Green
Start-Process cmd -ArgumentList "/k", "cd /d `"$rootDir\server`" && npm run dev"

Write-Host "[2/2] Dang khoi chay Frontend Client (Port 5173)..." -ForegroundColor Green
Start-Process cmd -ArgumentList "/k", "cd /d `"$rootDir\client`" && npm run dev"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Cac dich vu dang khoi dong:" -ForegroundColor Yellow
Write-Host "  - Backend:  http://localhost:8080" -ForegroundColor White
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Cyan
