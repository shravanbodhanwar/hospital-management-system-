# Start Smart Hospital (run this whenever Docker/containers were stopped)
Set-Location $PSScriptRoot
Write-Host "Starting containers..." -ForegroundColor Cyan
docker compose up -d
Start-Sleep -Seconds 5
docker compose ps
Write-Host ""
Write-Host "App:  http://localhost" -ForegroundColor Green
Write-Host "API:  http://localhost:8001/api/health" -ForegroundColor Green
Write-Host "If STATUS is not 'running', run: docker compose logs backend frontend" -ForegroundColor Yellow
