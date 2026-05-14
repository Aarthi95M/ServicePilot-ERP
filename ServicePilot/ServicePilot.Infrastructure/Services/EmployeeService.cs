using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Distributed;
using ServicePilot.Application.DTOs.Employees;
using ServicePilot.Application.Interfaces.Repositories;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Entities;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace ServicePilot.Infrastructure.Services
{
    public class EmployeeService : IEmployeeService
    {
        private readonly IEmployeeRepository _repository;

        private readonly ICurrentUserService _currentUser;

        private readonly IMapper _mapper;

        private readonly INumberGeneratorService _numberGeneratorService;

        private readonly IDistributedCache _distributedCache;

        private readonly IAuditRepository _auditRepository;

        private readonly IAuthService _authorization;

        public EmployeeService(
            IEmployeeRepository repository,
            ICurrentUserService currentUser,
            IMapper mapper,
            INumberGeneratorService numberGenerator,
            IDistributedCache distributedCache,
            IAuditRepository auditRepository,
            IAuthService authorization)
        {
            _repository = repository;
            _currentUser = currentUser;
            _mapper = mapper;
            _numberGeneratorService = numberGenerator;
            _distributedCache = distributedCache;
            _auditRepository = auditRepository;
            _authorization = authorization;

        }

        public async Task<ApiResponse<IEnumerable<EmployeeDto>>> GetAllAsync(
            EmployeeFilterDto filter)
        {
            var employees = await _repository.GetAllAsync(
                _currentUser.CompanyId,
                filter);

            return new ApiResponse<IEnumerable<EmployeeDto>>
            {
                Success = true,
                Data = _mapper.Map<IEnumerable<EmployeeDto>>(employees)
            };
        }

        public async Task<ApiResponse<EmployeeDto>> CreateAsync(CreateEmployeeDto dto)
        {
            var employeeCode = await _numberGeneratorService.GenerateEmployeeCodeAsync(_currentUser.CompanyId);

            var employee = new Employee
            {
                Id = Guid.NewGuid(),
                CompanyId = _currentUser.CompanyId,

                EmployeeCode = employeeCode,

                FullName = dto.FullName,
                PhoneNumber = dto.Phone,
                Email = dto.Email,

                BranchId = dto.BranchId,
                PositionId = dto.PositionId,
                DepartmentId = dto.DepartmentId,

                VisaExpiryDate = dto.VisaExpiryDate,
                PassportExpiryDate = dto.PassportExpiryDate,
                EmiratesIdExpiryDate = dto.EmiratesIdExpiryDate,
                JoiningDate = dto.JoiningDate,

                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            
            await _repository.AddAsync(employee);
            await _repository.SaveChangesAsync();

            await _distributedCache.RemoveAsync($"employees_dropdown_{_currentUser.CompanyId}");

            var newData = JsonSerializer.Serialize(employee);

            await _auditRepository.AddAsync(new AuditLog
            {
                Id = Guid.NewGuid(),
                TableName = "Employees",
                RecordId = employee.Id,
                Action = "CREATE",
                OldValues = null,
                NewValues = newData,
                UserId = _currentUser.UserId,
                CreatedAt = DateTime.UtcNow
            });

            await _auditRepository.SaveChangesAsync();

            return new ApiResponse<EmployeeDto>
            {
                Success = true,
                Message = "Employee created successfully",
                Data = _mapper.Map<EmployeeDto>(employee)
            };
        }

        public async Task<ApiResponse<EmployeeDto>> UpdateAsync(Guid id, UpdateEmployeeDto dto)
        {
            var employee = await _repository.GetByIdAsync(id, _currentUser.CompanyId);

            if (!_authorization.CanManageEmployee(employee))
            {
                return new ApiResponse<EmployeeDto>
                {
                    Success = false,
                    Message = "Access denied"
                };
            }

            //Dispatcher → blocked
            if (_authorization.IsDispatcher())
            {
                return new ApiResponse<EmployeeDto>
                {
                    Success = false,
                    Message = "Read-only access"
                };
            }

            if (employee == null)
            {
                return new ApiResponse<EmployeeDto>
                {
                    Success = false,
                    Message = "Employee not found"
                };
            }

            if (_authorization.IsSupervisor())
            {
                // cannot move employee across branches
                dto.BranchId = employee.BranchId;

                // cannot edit HR documents
                dto.PassportExpiryDate
                    = employee.PassportExpiryDate;

                dto.VisaExpiryDate
                    = employee.VisaExpiryDate;

                dto.EmiratesIdExpiryDate
                    = employee.EmiratesIdExpiryDate;
            }

            var oldData = JsonSerializer.Serialize(employee);
            
            // Basic info
            employee.FullName = dto.FullName;
            employee.PhoneNumber = dto.Phone;
            employee.Email = dto.Email;

            // Assignments
            employee.BranchId = dto.BranchId;
            employee.DepartmentId = dto.DepartmentId;
            employee.PositionId = dto.PositionId;

            // Documents
            employee.VisaExpiryDate = dto.VisaExpiryDate;
            employee.PassportExpiryDate = dto.PassportExpiryDate;
            employee.EmiratesIdExpiryDate = dto.EmiratesIdExpiryDate;

            employee.IsActive = dto.IsActive;
            employee.UpdatedAt = DateTime.UtcNow;

            _repository.Update(employee);
            
            await _repository.SaveChangesAsync();
            //clear cache
            await _distributedCache.RemoveAsync($"employees_dropdown_{_currentUser.CompanyId}");

            //add audit logs
            var newData = JsonSerializer.Serialize(employee);

            await _auditRepository.AddAsync(new AuditLog
            {
                Id = Guid.NewGuid(),
                TableName = "Employees",
                RecordId = employee.Id,
                Action = "UPDATE",
                OldValues = oldData,
                NewValues = newData,
                UserId = _currentUser.UserId,
                CreatedAt = DateTime.UtcNow
            });

            await _auditRepository.SaveChangesAsync();

            return new ApiResponse<EmployeeDto>
            {
                Success = true,
                Message = "Employee updated successfully",
                Data = _mapper.Map<EmployeeDto>(employee)
            };
        }

        public async Task<ApiResponse<bool>> DeleteAsync(Guid id)
        {
            var employee = await _repository.GetByIdAsync(id, _currentUser.CompanyId);

            if (employee == null)
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Employee not found"
                };
            }

            var oldData = JsonSerializer.Serialize(employee);

            employee.IsActive = false;
            employee.UpdatedAt = DateTime.UtcNow;

            _repository.Update(employee);
            
            await _repository.SaveChangesAsync();
            await _distributedCache.RemoveAsync($"employees_dropdown_{_currentUser.CompanyId}");

            var newData = JsonSerializer.Serialize(employee);

            await _auditRepository.AddAsync(new AuditLog
            {
                Id = Guid.NewGuid(),
                TableName = "Employees",
                RecordId = employee.Id,
                Action = "DELETE",
                OldValues = oldData,
                NewValues = newData,
                UserId = _currentUser.UserId,
                CreatedAt = DateTime.UtcNow
            });

            await _auditRepository.SaveChangesAsync();

            return new ApiResponse<bool>
            {
                Success = true,
                Message = "Employee deactivated successfully",
                Data = true
            };
        }

        public async Task<ApiResponse<PagedResult<EmployeeDto>>> GetPagedAsync(
    PagedEmployeeRequest filter)
        {
            var result = await _repository.GetPagedAsync(
                _currentUser.CompanyId,
                filter);

            return new ApiResponse<PagedResult<EmployeeDto>>
            {
                Success = true,
                Data = new PagedResult<EmployeeDto>
                {
                    Items = _mapper.Map<List<EmployeeDto>>(result.Items),
                    TotalCount = result.TotalCount,
                    Page = result.Page,
                    PageSize = result.PageSize
                }
            };
        }
    }
}
