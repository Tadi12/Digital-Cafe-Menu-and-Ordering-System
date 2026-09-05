# Digital Café Menu — start server + client (Windows PowerShell)
$Root = $PSScriptRoot

Write-Host "Starting Digital Cafe Menu..." -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "$Root\server\node_modules")) {
    Write-Host "Installing server dependencies..." -ForegroundColor Yellow
    Set-Location "$Root\server"
    npm install
}

if (-not (Test-Path "$Root\client\node_modules")) {
    Write-Host "Installing client dependencies..." -ForegroundColor Yellow
    Set-Location "$Root\client"
    npm install
}

Set-Location $Root

if (-not (Test-Path "$Root\node_modules\concurrently")) {
    Write-Host "Installing root dev tools..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "Client: http://localhost:5173" -ForegroundColor Green
Write-Host "Admin:  http://localhost:5173/admin/login" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop both." -ForegroundColor Gray
Write-Host ""

npm run dev
