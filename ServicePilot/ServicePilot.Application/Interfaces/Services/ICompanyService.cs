using ServicePilot.Application.DTOs.Companies;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Services
{
    public interface ICompanyService
    {
        Task<ApiResponse<CompanyResponseDto>> GetMyCompanyAsync();
        Task<ApiResponse<CompanyResponseDto>> UpdateMyCompanyAsync(UpdateCompanyDto dto);
        Task<ApiResponse<CompanyConfigDto>> GetConfigAsync();
        Task<ApiResponse<CompanyConfigDto>> UpdateConfigAsync(CompanyConfigDto dto);
    }
}
