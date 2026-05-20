using ServicePilot.Application.DTOs.Users;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Services
{
    public interface IUserManagementService
    {
        Task<ApiResponse<IEnumerable<UserResponseDto>>> GetAllAsync();
        Task<ApiResponse<UserResponseDto>> GetByIdAsync(Guid id);
        Task<ApiResponse<UserResponseDto>> CreateAsync(CreateUserDto dto);
        Task<ApiResponse<UserResponseDto>> UpdateAsync(Guid id, UpdateUserDto dto);
        Task<ApiResponse<bool>> ResetPasswordAsync(Guid id, ResetPasswordDto dto);
        Task<ApiResponse<bool>> DeactivateAsync(Guid id);
    }
}
