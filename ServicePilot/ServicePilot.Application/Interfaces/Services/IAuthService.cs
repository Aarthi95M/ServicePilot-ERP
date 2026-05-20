using ServicePilot.Application.DTOs.Auth;
using ServicePilot.Domain.Entities;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Services
{
    public interface IAuthService
    {
        Task<ApiResponse<LoginResponseDto>> LoginAsync(
            LoginRequestDto request);

        // ── Role checks ───────────────────────────────────────────────
        bool IsAdmin();
        bool IsSupervisor();
        bool IsHRManager();      // ← NEW
        bool IsDispatcher();     // ← already existed, now used
        bool IsTechnician();         // ← NEW — useful for field-only checks

        // ── Permission checks ─────────────────────────────────────────
        bool CanManageEmployee(Employee employee);

        /// <summary>
        /// HR Manager and Admin can edit HR documents (visa, passport, Emirates ID).
        /// Supervisor cannot.
        /// </summary>
        bool CanEditHRDocuments();   // ← NEW
    }
}
