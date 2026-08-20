# KPI Management System - Quick Start Script
# Usage: .\run.ps1

$ErrorActionPreference = "Continue"

$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  KPI Management System - Starting..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path (Join-Path $projectRoot ".env"))) {
    Write-Host "[WARNING] .env not found. Copy from .env.example" -ForegroundColor Yellow
    Write-Host ""
}

# Start Vite dev server
Write-Host "[INFO] Starting Vite dev server..." -ForegroundColor Green
Write-Host "[INFO] Open http://localhost:5173" -ForegroundColor Green
Write-Host ""

# Use node directly to avoid PATH issues with special characters in path
Set-Location $projectRoot
npm run dev
