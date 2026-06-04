# Stop anything on port 4000 and start the API with latest code.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Stopping processes on port 4000..."
node scripts/kill-port.mjs 4000

Write-Host "Starting backend..."
npm run dev:keep
