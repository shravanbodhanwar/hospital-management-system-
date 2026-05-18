# Smart Hospital — full stack deploy (frontend + backend + Ollama)
# Usage: .\deploy.ps1

Set-Location $PSScriptRoot

function Invoke-Docker {
    param([string[]]$Args)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & docker @Args 2>&1 | ForEach-Object {
        if ($_ -is [System.Management.Automation.ErrorRecord]) { Write-Host $_.ToString() }
        else { Write-Host $_ }
    }
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) { throw "docker $($Args -join ' ') failed (exit $code)" }
}

Write-Host "Building and starting Smart Hospital stack..." -ForegroundColor Cyan

Invoke-Docker @("compose", "down")
Invoke-Docker @("compose", "build")
Invoke-Docker @("compose", "up", "-d", "ollama")

Write-Host "Waiting for Ollama..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        Invoke-RestMethod -Uri "http://localhost:11434/" -TimeoutSec 2 | Out-Null
        $ready = $true
        break
    } catch { Start-Sleep -Seconds 2 }
}
if (-not $ready) { Write-Warning "Ollama slow to start; continuing anyway." }

Write-Host "Pulling llama3 model (first run may take several minutes)..." -ForegroundColor Yellow
Invoke-Docker @("compose", "run", "--rm", "ollama-init")

Invoke-Docker @("compose", "up", "-d", "backend", "frontend")

Write-Host ""
Write-Host "Deployed!" -ForegroundColor Green
Write-Host "  App:     http://localhost" -ForegroundColor White
Write-Host "  API:     http://localhost:8001/api/health" -ForegroundColor White
Write-Host "  Ollama:  http://localhost:11434" -ForegroundColor White
Write-Host "  Login:   patient@demo.com / password123" -ForegroundColor White
