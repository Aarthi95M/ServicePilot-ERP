# ==============================================================================
# ServicePilot - Sample Master Data Seeder
# ==============================================================================
# Populates the brand-new "servicepilot_new" database with realistic sample
# data via the running API (no direct DB writes - fully respects validation,
# uniqueness checks, password hashing, etc.)
#
# Creates:
#   - 2 Branches (Dubai, Abu Dhabi)
#   - 4 Departments (HVAC, Electrical, Plumbing, General Maintenance)
#   - 4 Positions (Technician, Senior Technician, Supervisor, Team Lead)
#   - 4 Leave Types (Annual, Sick, Emergency, Unpaid)
#   - 5 Job Types (AC Repair, AC Installation, AC Maintenance, Plumbing, Electrical)
#   - 5 Job Statuses (Pending, Assigned, In Progress, Completed, Cancelled)
#   - 4 Employees w/ mobile login (1 Supervisor + 3 Technicians)
#   - 5 Jobs (3 assigned, 2 unassigned/pending)
#   - 1 sample Leave Request (pending approval)
#
# PREREQUISITES:
#   - ServicePilot.API must be running locally (dotnet run), default port 5113
#   - Run this AFTER the company/admin onboarding step (admin@techforce.ae)
#
# USAGE:
#   powershell -ExecutionPolicy Bypass -File seed-sample-data.ps1
# ==============================================================================

$ErrorActionPreference = "Stop"

$baseUrl    = "http://localhost:5113/api"
$adminEmail = "admin@techforce.ae"
$adminPass  = "Admin@123456"

# -- Helper: call the API and surface errors without stopping the script -----
function Invoke-Api {
    param(
        [Parameter(Mandatory)] [string]$Method,
        [Parameter(Mandatory)] [string]$Path,
        [hashtable]$Headers = @{},
        $Body = $null
    )

    $uri = "$baseUrl$Path"
    try {
        if ($null -ne $Body) {
            $json = $Body | ConvertTo-Json -Depth 6
            return Invoke-RestMethod -Uri $uri -Method $Method -Headers $Headers -ContentType "application/json" -Body $json
        }
        else {
            return Invoke-RestMethod -Uri $uri -Method $Method -Headers $Headers
        }
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
        Write-Host "  -> FAILED ($Method $Path): $msg" -ForegroundColor Yellow
        return $null
    }
}

# -- 0. Login as Admin --------------------------------------------------------
Write-Host "==> Logging in as $adminEmail ..." -ForegroundColor Cyan
$login = Invoke-Api -Method Post -Path "/auth/login" -Body @{ email = $adminEmail; password = $adminPass }

if (-not $login -or -not $login.success) {
    Write-Host "Login failed. Make sure the API is running on port 5113 and the" -ForegroundColor Red
    Write-Host "admin@techforce.ae account exists (created during company onboarding)." -ForegroundColor Red
    exit 1
}

$token   = $login.data.token
$headers = @{ Authorization = "Bearer $token" }
Write-Host "    Logged in. Company: $($login.data.companyId)" -ForegroundColor Green

# -- 1. Branches ---------------------------------------------------------------
Write-Host "`n==> Creating branches ..." -ForegroundColor Cyan

$branchDubai = Invoke-Api -Method Post -Path "/org/branches" -Headers $headers -Body @{
    name      = "Dubai - Al Quoz"
    address   = "Al Quoz Industrial Area 3, Dubai, UAE"
    latitude  = 25.1412
    longitude = 55.2278
}
$branchAbuDhabi = Invoke-Api -Method Post -Path "/org/branches" -Headers $headers -Body @{
    name      = "Abu Dhabi - Mussafah"
    address   = "Mussafah Industrial Area, Abu Dhabi, UAE"
    latitude  = 24.3473
    longitude = 54.5089
}

$branchDubaiId    = $branchDubai.data.id
$branchAbuDhabiId = $branchAbuDhabi.data.id
Write-Host "    Dubai - Al Quoz       : $branchDubaiId"
Write-Host "    Abu Dhabi - Mussafah  : $branchAbuDhabiId"

# -- 2. Departments -------------------------------------------------------------
Write-Host "`n==> Creating departments ..." -ForegroundColor Cyan

$deptNames = @("HVAC", "Electrical", "Plumbing", "General Maintenance")
$departments = @{}
foreach ($name in $deptNames) {
    $resp = Invoke-Api -Method Post -Path "/org/departments" -Headers $headers -Body @{ name = $name }
    if ($resp -and $resp.success) {
        $departments[$name] = $resp.data.id
        Write-Host "    $name : $($resp.data.id)"
    }
}

# -- 3. Positions -----------------------------------------------------------------
Write-Host "`n==> Creating positions ..." -ForegroundColor Cyan

$positionDefs = @(
    @{ name = "Technician";        description = "Field service technician" },
    @{ name = "Senior Technician";  description = "Experienced technician, mentors junior staff" },
    @{ name = "Supervisor";         description = "Oversees field teams and job assignments" },
    @{ name = "Team Lead";          description = "Leads a small crew on multi-day jobs" }
)
$positions = @{}
foreach ($p in $positionDefs) {
    $resp = Invoke-Api -Method Post -Path "/org/positions" -Headers $headers -Body $p
    if ($resp -and $resp.success) {
        $positions[$p.name] = $resp.data.id
        Write-Host "    $($p.name) : $($resp.data.id)"
    }
}

# -- 4. Leave Types -----------------------------------------------------------------
Write-Host "`n==> Creating leave types ..." -ForegroundColor Cyan

$leaveTypeDefs = @(
    @{ name = "Annual Leave";    maxDaysPerYear = 30; isPaid = $true  },
    @{ name = "Sick Leave";      maxDaysPerYear = 15; isPaid = $true  },
    @{ name = "Emergency Leave"; maxDaysPerYear = 5;  isPaid = $true  },
    @{ name = "Unpaid Leave";    maxDaysPerYear = 0;  isPaid = $false }
)
$leaveTypes = @{}
foreach ($lt in $leaveTypeDefs) {
    $resp = Invoke-Api -Method Post -Path "/master/leave-types" -Headers $headers -Body $lt
    if ($resp -and $resp.success) {
        $leaveTypes[$lt.name] = $resp.data.id
        Write-Host "    $($lt.name) : $($resp.data.id)"
    }
}

# -- 5. Job Types -----------------------------------------------------------------
Write-Host "`n==> Creating job types ..." -ForegroundColor Cyan

$jobTypeDefs = @(
    @{ name = "AC Repair";              estimatedDurationMins = 90  },
    @{ name = "AC Installation";        estimatedDurationMins = 180 },
    @{ name = "AC Maintenance/Service"; estimatedDurationMins = 60  },
    @{ name = "Plumbing Repair";        estimatedDurationMins = 60  },
    @{ name = "Electrical Repair";      estimatedDurationMins = 90  }
)
$jobTypes = @{}
foreach ($jt in $jobTypeDefs) {
    $resp = Invoke-Api -Method Post -Path "/master/job-types" -Headers $headers -Body $jt
    if ($resp -and $resp.success) {
        $jobTypes[$jt.name] = $resp.data.id
        Write-Host "    $($jt.name) : $($resp.data.id)"
    }
}

# -- 6. Job Statuses (order matters - first = default "Pending", must include
#       one containing "Assigned" for auto-assign on job creation) -------------
Write-Host "`n==> Creating job statuses ..." -ForegroundColor Cyan

$jobStatusDefs = @(
    @{ name = "Pending";     colorCode = "#94a3b8" },
    @{ name = "Assigned";    colorCode = "#3b82f6" },
    @{ name = "In Progress"; colorCode = "#f59e0b" },
    @{ name = "Completed";   colorCode = "#22c55e" },
    @{ name = "Cancelled";   colorCode = "#ef4444" }
)
foreach ($js in $jobStatusDefs) {
    $resp = Invoke-Api -Method Post -Path "/master/job-statuses" -Headers $headers -Body $js
    if ($resp -and $resp.success) {
        Write-Host "    $($js.name) : $($resp.data.id) (order $($resp.data.displayOrder))"
    }
}

# -- 7. Employees (Technicians + Supervisor, with mobile login) ----------------
Write-Host "`n==> Creating employees ..." -ForegroundColor Cyan

$employeeDefs = @(
    @{
        role         = "Supervisor"
        fullName     = "Rashid Al Maktoum"
        email        = "rashid.supervisor@techforce.ae"
        loginEmail   = "rashid.supervisor@techforce.ae"
        phoneNumber  = "+971501112233"
        branchId     = $branchDubaiId
        departmentId = $departments["General Maintenance"]
        positionId   = $positions["Supervisor"]
        joiningDate  = "2024-01-15"
        basicSalary  = 9000
        password     = "Tech@12345"
    },
    @{
        role         = "Technician"
        fullName     = "Faisal Ahmed"
        email        = "faisal.tech@techforce.ae"
        loginEmail   = "faisal.tech@techforce.ae"
        phoneNumber  = "+971502223344"
        branchId     = $branchDubaiId
        departmentId = $departments["HVAC"]
        positionId   = $positions["Technician"]
        joiningDate  = "2024-03-01"
        basicSalary  = 4500
        password     = "Tech@12345"
    },
    @{
        role         = "Technician"
        fullName     = "Mohammed Riyas"
        email        = "riyas.tech@techforce.ae"
        loginEmail   = "riyas.tech@techforce.ae"
        phoneNumber  = "+971503334455"
        branchId     = $branchDubaiId
        departmentId = $departments["Electrical"]
        positionId   = $positions["Senior Technician"]
        joiningDate  = "2023-11-10"
        basicSalary  = 5500
        password     = "Tech@12345"
    },
    @{
        role         = "Technician"
        fullName     = "Pradeep Kumar"
        email        = "pradeep.tech@techforce.ae"
        loginEmail   = "pradeep.tech@techforce.ae"
        phoneNumber  = "+971504445566"
        branchId     = $branchAbuDhabiId
        departmentId = $departments["Plumbing"]
        positionId   = $positions["Technician"]
        joiningDate  = "2024-05-20"
        basicSalary  = 4500
        password     = "Tech@12345"
    }
)

$employees = @{}
foreach ($e in $employeeDefs) {
    $resp = Invoke-Api -Method Post -Path "/employees/create-technician" -Headers $headers -Body $e
    if ($resp -and $resp.success) {
        $employees[$e.fullName] = $resp.data.employeeId
        Write-Host "    $($e.fullName) ($($e.role)) -> employeeId=$($resp.data.employeeId), login=$($resp.data.loginEmail)"
    }
}

# -- 8. Jobs ------------------------------------------------------------------------
Write-Host "`n==> Creating jobs ..." -ForegroundColor Cyan

$jobDefs = @(
    @{
        jobTypeId          = $jobTypes["AC Repair"]
        customerName       = "Ahmed Al Falasi"
        customerPhone      = "+971559876543"
        address            = "Villa 12, Jumeirah 1, Dubai, UAE"
        latitude           = 25.2285
        longitude          = 55.2593
        priority           = 2
        scheduledAt        = "2026-06-10T10:00:00Z"
        scheduledEndAt     = "2026-06-10T11:30:00Z"
        assignedEmployeeId = $employees["Faisal Ahmed"]
        notes              = "Customer reports AC unit not cooling - check refrigerant levels."
    },
    @{
        jobTypeId          = $jobTypes["AC Maintenance/Service"]
        customerName       = "Dubai Mall Management"
        customerPhone      = "+97144567890"
        address            = "The Dubai Mall, Downtown Dubai, UAE"
        latitude           = 25.1972
        longitude          = 55.2796
        priority           = 3
        scheduledAt        = "2026-06-11T05:00:00Z"
        scheduledEndAt     = "2026-06-11T06:00:00Z"
        assignedEmployeeId = $null
        notes              = "Routine quarterly AC service for food court units."
    },
    @{
        jobTypeId          = $jobTypes["Electrical Repair"]
        customerName       = "Khalid Trading LLC"
        customerPhone      = "+971521234567"
        address            = "Warehouse 5, Al Quoz Industrial 3, Dubai, UAE"
        latitude           = 25.1340
        longitude          = 55.2280
        priority           = 1
        scheduledAt        = "2026-06-10T12:00:00Z"
        scheduledEndAt     = "2026-06-10T13:30:00Z"
        assignedEmployeeId = $employees["Mohammed Riyas"]
        notes              = "Urgent: warehouse lighting circuit tripping repeatedly."
    },
    @{
        jobTypeId          = $jobTypes["Plumbing Repair"]
        customerName       = "Sara Khan"
        customerPhone      = "+971567654321"
        address            = "Marina Heights Tower, Dubai Marina, UAE"
        latitude           = 25.0805
        longitude          = 55.1403
        priority           = 4
        scheduledAt        = "2026-06-11T06:00:00Z"
        scheduledEndAt     = "2026-06-11T07:00:00Z"
        assignedEmployeeId = $employees["Pradeep Kumar"]
        notes              = "Slow drainage in kitchen sink, apt 304."
    },
    @{
        jobTypeId          = $jobTypes["AC Installation"]
        customerName       = "Etisalat Facilities"
        customerPhone      = "+97125556677"
        address            = "Etisalat Tower, Mussafah, Abu Dhabi, UAE"
        latitude           = 24.3473
        longitude          = 54.5089
        priority           = 3
        scheduledAt        = "2026-06-11T09:00:00Z"
        scheduledEndAt     = "2026-06-11T12:00:00Z"
        assignedEmployeeId = $null
        notes              = "New split AC unit installation, 2nd floor server room."
    }
)

foreach ($j in $jobDefs) {
    $resp = Invoke-Api -Method Post -Path "/jobs" -Headers $headers -Body $j
    if ($resp -and $resp.success) {
        Write-Host "    $($resp.data.jobNumber) - $($j.customerName) -> status=$($resp.data.jobStatusName)"
    }
}

# -- 9. Sample Leave Request (pending approval) --------------------------------
Write-Host "`n==> Creating sample leave request ..." -ForegroundColor Cyan

$leaveResp = Invoke-Api -Method Post -Path "/leave" -Headers $headers -Body @{
    employeeId  = $employees["Faisal Ahmed"]
    leaveTypeId = $leaveTypes["Annual Leave"]
    startDate   = "2026-06-20"
    endDate     = "2026-06-22"
    reason      = "Family vacation - pre-approved travel"
}
if ($leaveResp -and $leaveResp.success) {
    Write-Host "    Annual Leave for Faisal Ahmed (2026-06-20 to 2026-06-22) -> status=$($leaveResp.data.status)"
}

# -- Summary -------------------------------------------------------------------
Write-Host "`n================================================================" -ForegroundColor Green
Write-Host " Sample data seeding complete!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Mobile app login credentials (all use password: Tech@12345)"
Write-Host "  Supervisor : rashid.supervisor@techforce.ae"
Write-Host "  Technician : faisal.tech@techforce.ae   (HVAC, Dubai)"
Write-Host "  Technician : riyas.tech@techforce.ae    (Electrical, Dubai - Senior)"
Write-Host "  Technician : pradeep.tech@techforce.ae  (Plumbing, Abu Dhabi)"
Write-Host ""
Write-Host "Dashboard admin login (unchanged):"
Write-Host "  Admin      : admin@techforce.ae / Admin@123456"
Write-Host ""
Write-Host "Try a complete round:"
Write-Host "  1. Log into the mobile app as faisal.tech@techforce.ae and check in"
Write-Host "     (his job 'AC Repair' for Ahmed Al Falasi is already assigned)."
Write-Host "  2. On the dashboard, watch the live map / attendance page show his check-in."
Write-Host "  3. From the mobile app, move the AC Repair job through"
Write-Host "     Assigned -> In Progress -> Completed (with a photo)."
Write-Host "  4. On the dashboard Jobs page, assign one of the two unassigned"
Write-Host "     jobs ('AC Maintenance/Service' or 'AC Installation') to a technician."
Write-Host "  5. On the dashboard Leave page, approve/reject Faisal's pending"
Write-Host "     Annual Leave request (20-22 Jun 2026)."
Write-Host "  6. Check in/out a couple of times, then export an Attendance"
Write-Host "     report from the Reports page."
