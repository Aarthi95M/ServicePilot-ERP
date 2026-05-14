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

        bool IsAdmin();

        bool IsSupervisor();

        bool IsDispatcher();

        bool CanManageEmployee(Employee employee);
    }
}
