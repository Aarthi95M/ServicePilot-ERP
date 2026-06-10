# ==============================================================================
# ServicePilot - Company Onboarding (SuperAdmin)
# ==============================================================================
# Calls POST /api/superadmin/onboard to create the first Company + Admin user
# on a fresh database (e.g. the production DB on Render, which currently has
# no companies/users yet).
#
# This MUST be run once before anyone can log in to the dashboard/mobile app,
# and before running seed-sample-data.ps1 (which logs in as this admin).
#
# PREREQUISITES:
#   - SuperAdmin__ApiKey environment variable must be set on the API server
#     (Render -> servicepilot-api -> Environment). If it isn't set yet, add
#     it there first (any strong random string), wait for the redeploy to
#     finish, then pass that same value to -ApiKey below.
#
# USAGE (production):
#   powershell -ExecutionPolicy Bypass -File onboard-company.ps1 `
#     -ApiKey "<value of SuperAdmin__ApiKey on Render>" `
#     -BaseUrl "https://servicepilot-api.onrender.com/api"
#
# USAGE (local dev, API running on localhost:5113):
#   powershell -ExecutionPolicy Bypass -File onboard-company.ps1 `
#     -ApiKey "<value of SuperAdmin:ApiKey in appsettings.Development.json>"
#
# Defaults create the same TechForce company/admin that seed-sample-data.ps1
# and the dashboard login screen expect:
#   Admin login: admin@techforce.ae / Admin@123456
# ==============================================================================

param(
    [Parameter(Mandatory)] [string]$ApiKey,
    [string]$BaseUrl = "http://localhost:5113/api",

    [string]$CompanyName   = "TechForce Field Services",
    [string]$CompanyEmail  = "info@techforce.ae",
    [string]$CompanyPhone  = "+971500000000",
    [string]$Address       = "Dubai, UAE",
    [string]$Timezone      = "Asia/Dubai",

    [string]$AdminFullName = "System Admin",
    [string]$AdminEmail    = "admin@techforce.ae",
    [string]$AdminPassword = "Admin@123456",
    [string]$AdminPhone    = "+971500000001"
)

$ErrorActionPreference = "Stop"

$body = @{
    companyName   = $CompanyName
    companyEmail  = $CompanyEmail
    companyPhone  = $CompanyPhone
    address       = $Address
    timezone      = $Timezone
    adminFullName = $AdminFullName
    adminEmail    = $AdminEmail
    adminPassword = $AdminPassword
    adminPhone    = $AdminPhone
} | ConvertTo-Json

$headers = @{ "X-Api-Key" = $ApiKey }

Write-Host "==> Onboarding '$CompanyName' at $BaseUrl ..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/superadmin/onboard" -Method Post -Headers $headers -ContentType "application/json" -Body $body

    if (-not $response.success) {
        Write-Host "  -> FAILED: $($response.message)" -ForegroundColor Red
        exit 1
    }

    Write-Host "    Success!" -ForegroundColor Green
    Write-Host "    Company ID : $($response.data.companyId)"
    Write-Host "    Admin Email: $($response.data.adminEmail)"
    Write-Host ""
    Write-Host "You can now log in with:" -ForegroundColor Cyan
    Write-Host "  Email   : $AdminEmail"
    Write-Host "  Password: $AdminPassword"
}
catch {
    $msg = $_.Exception.Message
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
        try {
            $err = $_.ErrorDetails.Message | ConvertFrom-Json
            if ($err.message) { $msg = $err.message }
            elseif ($err.errors) { $msg = ($err.errors | Out-String) }
        } catch {}
    }
    Write-Host "  -> FAILED: $msg" -ForegroundColor Red
    exit 1
}
