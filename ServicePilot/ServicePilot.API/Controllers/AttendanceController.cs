using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServicePilot.Application.DTOs.Attendance;
using ServicePilot.Application.DTOs.GPS;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Constants;

namespace ServicePilot.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly IAttendanceService _service;

        public AttendanceController(IAttendanceService service)
        {
            _service = service;
        }

        // ── EMPLOYEE-FACING (mobile app) ─────────────────────────────────

        /// <summary>
        /// GPS check-in. Admin and Supervisor can also check in as field employees.
        /// HR Manager and Dispatcher are office roles — no check-in.
        /// </summary>
        [HttpPost("checkin")]
        [Authorize(Roles = Roles.CheckInAccess)]       // Admin,Supervisor,Employee
        public async Task<IActionResult> CheckIn([FromBody] CheckInRequestDto dto)
        {
            var response = await _service.CheckInAsync(dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>GPS check-out.</summary>
        [HttpPost("checkout")]
        [Authorize(Roles = Roles.CheckInAccess)]       // Admin,Supervisor,Employee
        public async Task<IActionResult> CheckOut([FromBody] CheckOutRequestDto dto)
        {
            var response = await _service.CheckOutAsync(dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Today's record for the logged-in employee.
        /// HR Manager can view their own attendance too if they have an employee profile.
        /// </summary>
        [HttpGet("today")]
        [Authorize(Roles = Roles.CheckInAccess)]       // Admin,Supervisor,Employee
        public async Task<IActionResult> GetTodayForEmployee()
        {
            var response = await _service.GetTodayForEmployeeAsync();
            return Ok(response);
        }

        /// <summary>
        /// Employee's own attendance history (paged). Accessible by the same roles as check-in.
        /// Each employee sees only their own records.
        /// </summary>
        [HttpGet("my-history")]
        [Authorize(Roles = Roles.CheckInAccess)]       // Admin,Supervisor,Employee
        public async Task<IActionResult> GetMyHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var response = await _service.GetMyHistoryAsync(page, pageSize);
            return Ok(response);
        }

        /// <summary>Periodic GPS breadcrumb from mobile.</summary>
        [HttpPost("gps-log")]
        [Authorize(Roles = Roles.CheckInAccess)]       // Admin,Supervisor,Employee
        public async Task<IActionResult> LogGps([FromBody] GpsLogRequestDto dto)
        {
            var response = await _service.LogGpsAsync(dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        // ── ADMIN / HR MANAGER / SUPERVISOR ──────────────────────────────

        /// <summary>
        /// Today's real-time attendance dashboard.
        /// HR Manager added — they monitor attendance daily for payroll/leave purposes.
        /// Supervisor still sees their branch only (enforced in service layer).
        /// </summary>
        [HttpGet("dashboard")]
        [Authorize(Roles = Roles.AttendanceReadAccess)] // Admin,HRManager,Supervisor
        public async Task<IActionResult> GetDashboard()
        {
            var response = await _service.GetDashboardAsync();
            return Ok(response);
        }

        /// <summary>
        /// Paged attendance list.
        /// HR Manager is the primary user — they need this for payroll calculations.
        /// </summary>
        [HttpGet]
        [Authorize(Roles = Roles.AttendanceReadAccess)] // Admin,HRManager,Supervisor
        public async Task<IActionResult> GetPaged([FromQuery] PagedAttendanceRequest filter)
        {
            var response = await _service.GetPagedAsync(filter);
            return Ok(response);
        }

        /// <summary>
        /// Live locations: latest GPS ping + check-in status per active employee.
        /// </summary>
        [HttpGet("live-locations")]
        [Authorize(Roles = Roles.AttendanceReadAccess)] // Admin,HRManager,Supervisor
        public async Task<IActionResult> GetLiveLocations()
        {
            var response = await _service.GetLiveLocationsAsync();
            return Ok(response);
        }

        /// <summary>
        /// Manual attendance adjustment by a Supervisor, HR Manager, or Admin.
        /// Allows correcting check-in / check-out times, or clearing a check-out
        /// so the employee can re-checkout via the mobile app.
        /// Supervisor access is automatically scoped to their branch.
        /// </summary>
        [HttpPut("{id:guid}/adjust")]
        [Authorize(Roles = Roles.AttendanceReadAccess)] // Admin, HRManager, Supervisor
        public async Task<IActionResult> AdjustRecord(
            Guid id, [FromBody] AdjustAttendanceRequestDto dto)
        {
            var response = await _service.AdjustAttendanceAsync(id, dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Monthly summary report.
        /// HR Manager primary user. Supervisor sees their branch only.
        /// </summary>
        [HttpGet("summary")]
        [Authorize(Roles = Roles.AttendanceReadAccess)] // Admin,HRManager,Supervisor
        public async Task<IActionResult> GetSummary(
            [FromQuery] DateOnly from,
            [FromQuery] DateOnly to,
            [FromQuery] Guid? branchId = null,
            [FromQuery] Guid? departmentId = null)
        {
            var response = await _service.GetSummaryAsync(from, to, branchId, departmentId);
            return response.Success ? Ok(response) : BadRequest(response);
        }
    }
}

// ============================================================
// API ENDPOINTS QUICK REFERENCE
// ============================================================
/*
METHOD  ROUTE                            ROLES                    DESCRIPTION
──────  ───────────────────────────────  ───────────────────────  ──────────────────────────────────────
POST    /api/attendance/checkin          Employee,Supervisor,Admin GPS check-in (live or offline sync)
POST    /api/attendance/checkout         Employee,Supervisor,Admin GPS check-out (live or offline sync)
GET     /api/attendance/today            Employee,Supervisor,Admin Today's record for logged-in employee
POST    /api/attendance/gps-log          Employee,Supervisor,Admin Periodic GPS breadcrumb ping
GET     /api/attendance/dashboard        Admin,Supervisor          Real-time today's overview
GET     /api/attendance                  Admin,Supervisor          Paged list (filters: date,branch,status)
GET     /api/attendance/summary          Admin,Supervisor          Per-employee summary (max 90 days)
*/


// ============================================================
// BUSINESS RULES SUMMARY
// ============================================================
/*
CHECK-IN:
  - One open check-in per employee per UTC calendar day
  - Status = Present if checkInTime.TimeOfDay <= 08:15
  - Status = Late    if checkInTime.TimeOfDay >  08:15
  - GPS written to attendance_logs AND gps_logs atomically
  - IsOfflineSync = true → use CheckInTimeOverride as real event time

CHECK-OUT:
  - Must have an open check-in for today first
  - CheckOutTime must be strictly after CheckInTime
  - HoursWorked is COMPUTED on read, never stored in DB
  - GPS written atomically with checkout update

ABSENCE:
  - NEVER stored as a row. Derived in reporting:
    Absent = TotalActiveEmployees - EmployeesWithCheckInForDate
  - Avoids need for nightly scheduled job

OFFLINE SYNC:
  - Max 7 days old, cannot be future-dated
  - Device timestamp stored as real event time
  - is_offline_sync = true flags record for audit

ROLE ACCESS:
  - Employee:   can only check in/out/view for themselves
  - Supervisor: dashboard + list scoped to their branch only
  - Admin:      full company access
  - Dispatcher: no attendance access
*/


