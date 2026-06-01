using ServicePilot.Application.DTOs.SuperAdmin;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Services
{
    public interface ISuperAdminService
    {
        Task<ApiResponse<CompanyOnboardingResponseDto>> OnboardCompanyAsync(CreateCompanyDto dto);
        Task<ApiResponse<bool>> DeactivateCompanyAsync(Guid companyId);
        Task<ApiResponse<List<CompanySummaryDto>>> ListCompaniesAsync();
    }
}
