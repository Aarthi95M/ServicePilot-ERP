using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using ServicePilot.Application.DTOs.Employees;
using ServicePilot.Application.Interfaces.Repositories;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Constants;
using ServicePilot.Domain.Entities;
using ServicePilot.Infrastructure.Persistence.Models;
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

        private readonly AppDbContext _context;

        private readonly IPasswordService _passwordService;

        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles,
            WriteIndented = false
        };

        public EmployeeService(
            IEmployeeRepository repository,
            ICurrentUserService currentUser,
            IMapper mapper,
            INumberGeneratorService numberGenerator,
            IDistributedCache distributedCache,
            IAuditRepository auditRepository,
            IAuthService authorization,
            AppDbContext context,
            IPasswordService passwordService)
        {
            _repository = repository;
            _currentUser = currentUser;
            _mapper = mapper;
            _numberGeneratorService = numberGenerator;
            _distributedCache = distributedCache;
            _auditRepository = auditRepository;
            _authorization = authorization;
            _context = context;
            _passwordService = passwordService;
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
                PhoneNumber = dto.PhoneNumber,
                Email = dto.Email,

                BranchId = dto.BranchId,
                PositionId = dto.PositionId,
                DepartmentId = dto.DepartmentId,

                VisaExpiryDate = dto.VisaExpiryDate,
                PassportExpiryDate = dto.PassportExpiryDate,
                EmiratesIdExpiryDate = dto.EmiratesIdExpiryDate,
                JoiningDate = dto.JoiningDate,
                BasicSalary = dto.BasicSalary,

                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            
            await _repository.AddAsync(employee);
            await _repository.SaveChangesAsync();

            await _distributedCache.RemoveAsync($"employees_dropdown_{_currentUser.CompanyId}");

            var newData = JsonSerializer.Serialize(employee, _jsonOptions);

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
            // ✅ STEP 1: Check employee exists first
            var employee = await _repository.GetByIdAsync(id, _currentUser.CompanyId);

            if (employee == null)
            {
                return new ApiResponse<EmployeeDto>
                {
                    Success = false,
                    Message = "Employee not found"
                };
            }

            // ✅ STEP 2: Then check authorization (now safe — employee is not null)
            if (!_authorization.CanManageEmployee(employee))
            {
                return new ApiResponse<EmployeeDto>
                {
                    Success = false,
                    Message = "Access denied"
                };
            }

            // ✅ STEP 3: Supervisor restrictions (branch lock + no HR document edits)
            //Admin = full edit, HRManager = full edit, Supervisor = locked.
            if (!_authorization.CanEditHRDocuments())
            {
                // Supervisor cannot edit HR documents or move employees between branches
                dto.BranchId = employee.BranchId;
                dto.PassportExpiryDate = employee.PassportExpiryDate;
                dto.VisaExpiryDate = employee.VisaExpiryDate;
                dto.EmiratesIdExpiryDate = employee.EmiratesIdExpiryDate;
            }

            var oldData = JsonSerializer.Serialize(employee, _jsonOptions);

            // Apply updates
            employee.FullName = dto.FullName;
            employee.PhoneNumber = dto.PhoneNumber;
            employee.Email = dto.Email;
            employee.BranchId = dto.BranchId;
            employee.DepartmentId = dto.DepartmentId;
            employee.PositionId = dto.PositionId;
            employee.VisaExpiryDate = dto.VisaExpiryDate;
            employee.PassportExpiryDate = dto.PassportExpiryDate;
            employee.EmiratesIdExpiryDate = dto.EmiratesIdExpiryDate;
            employee.JoiningDate = dto.JoiningDate;
            employee.BasicSalary = dto.BasicSalary;
            employee.IsActive = dto.IsActive;
            employee.UpdatedAt = DateTime.UtcNow;

            _repository.Update(employee);
            await _repository.SaveChangesAsync();

            await _distributedCache.RemoveAsync($"employees_dropdown_{_currentUser.CompanyId}");

            var newData = JsonSerializer.Serialize(employee, _jsonOptions);

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

            var oldData = JsonSerializer.Serialize(employee, _jsonOptions);

            employee.IsActive = false;
            employee.UpdatedAt = DateTime.UtcNow;

            _repository.Update(employee);
            
            await _repository.SaveChangesAsync();
            await _distributedCache.RemoveAsync($"employees_dropdown_{_currentUser.CompanyId}");

            var newData = JsonSerializer.Serialize(employee, _jsonOptions);

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

        public async Task<ApiResponse<EmployeeDetailDto>> GetByIdAsync(Guid id)
        {
            // Use Include to load nav properties in a single query
            var employee = await _repository.GetByIdWithDetailsAsync(id, _currentUser.CompanyId);

            if (employee == null)
            {
                return new ApiResponse<EmployeeDetailDto>
                {
                    Success = false,
                    Message = "Employee not found"
                };
            }

            // Supervisor can only see employees in their own branch
            if (_authorization.IsSupervisor() &&
                employee.BranchId != _currentUser.BranchId)
            {
                return new ApiResponse<EmployeeDetailDto>
                {
                    Success = false,
                    Message = "Access denied"
                };
            }

            var dto = MapToDetailDto(employee);

            return new ApiResponse<EmployeeDetailDto>
            {
                Success = true,
                Data = dto
            };
        }

        // Private helper — keeps mapping out of the repository
        private static EmployeeDetailDto MapToDetailDto(Employee e)
        {
            return new EmployeeDetailDto
            {
                Id = e.Id,
                EmployeeCode = e.EmployeeCode,
                FullName = e.FullName,
                Email = e.Email ?? string.Empty,
                PhoneNumber = e.PhoneNumber ?? string.Empty,
                IsActive = e.IsActive,

                BranchId = e.BranchId,
                BranchName = e.Branch?.Name,

                DepartmentId = e.DepartmentId,
                DepartmentName = e.Department?.Name,

                PositionId = e.PositionId,
                PositionName = e.Position?.Name,

                BasicSalary = e.BasicSalary,
                JoiningDate = e.JoiningDate,
                VisaExpiryDate = e.VisaExpiryDate,
                PassportExpiryDate = e.PassportExpiryDate,
                EmiratesIdExpiryDate = e.EmiratesIdExpiryDate,

                VisaStatus = GetDocumentStatus(e.VisaExpiryDate),
                PassportStatus = GetDocumentStatus(e.PassportExpiryDate),
                EmiratesIdStatus = GetDocumentStatus(e.EmiratesIdExpiryDate),

                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt
            };
        }

        private static DocumentStatus GetDocumentStatus(DateOnly? expiryDate)
        {
            if (expiryDate == null) return DocumentStatus.NotProvided;

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var daysLeft = expiryDate.Value.DayNumber - today.DayNumber;

            return daysLeft switch
            {
                < 0 => DocumentStatus.Expired,
                <= 60 => DocumentStatus.ExpiringSoon,
                _ => DocumentStatus.Valid
            };
        }
        public async Task<ApiResponse<EmployeeDetailDto>> GetMyProfileAsync()
        {
            var employee = await _repository.GetByUserIdAsync(
                _currentUser.UserId,
                _currentUser.CompanyId);

            if (employee == null)
            {
                return new ApiResponse<EmployeeDetailDto>
                {
                    Success = false,
                    Message = "Employee profile not found for this account."
                };
            }

            return new ApiResponse<EmployeeDetailDto>
            {
                Success = true,
                Data = MapToDetailDto(employee)
            };
        }

        public async Task<ApiResponse<IEnumerable<ExpiringDocumentDto>>> GetExpiringDocumentsAsync(int days)
        {
            // Clamp to sensible range — no one needs "expiring in 3 years"
            if (days < 1) days = 1;
            if (days > 365) days = 365;

            var threshold = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(days));
            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            var employees = await _repository.GetExpiringDocumentsAsync(
                _currentUser.CompanyId,
                threshold);

            var result = employees.Select(e => new ExpiringDocumentDto
            {
                EmployeeId = e.Id,
                EmployeeCode = e.EmployeeCode,
                FullName = e.FullName,
                BranchName = e.Branch?.Name,
                PhoneNumber = e.PhoneNumber,

                Visa = e.VisaExpiryDate.HasValue && e.VisaExpiryDate <= threshold
                    ? new ExpiringDocument
                    {
                        ExpiryDate = e.VisaExpiryDate.Value,
                        DaysLeft = e.VisaExpiryDate.Value.DayNumber - today.DayNumber,
                        Status = GetDocumentStatus(e.VisaExpiryDate)
                    }
                    : null,

                Passport = e.PassportExpiryDate.HasValue && e.PassportExpiryDate <= threshold
                    ? new ExpiringDocument
                    {
                        ExpiryDate = e.PassportExpiryDate.Value,
                        DaysLeft = e.PassportExpiryDate.Value.DayNumber - today.DayNumber,
                        Status = GetDocumentStatus(e.PassportExpiryDate)
                    }
                    : null,

                EmiratesId = e.EmiratesIdExpiryDate.HasValue && e.EmiratesIdExpiryDate <= threshold
                    ? new ExpiringDocument
                    {
                        ExpiryDate = e.EmiratesIdExpiryDate.Value,
                        DaysLeft = e.EmiratesIdExpiryDate.Value.DayNumber - today.DayNumber,
                        Status = GetDocumentStatus(e.EmiratesIdExpiryDate)
                    }
                    : null
            });

            return new ApiResponse<IEnumerable<ExpiringDocumentDto>>
            {
                Success = true,
                Data = result
            };
        }

        /// <summary>
        /// Atomically creates an Employee record + a linked Technician User account
        /// in a single database transaction. Rolls back completely if either step fails.
        /// </summary>
        public async Task<ApiResponse<TechnicianCreatedDto>> CreateTechnicianAsync(
            CreateTechnicianDto dto)
        {
            // Resolve the login email — prefer dedicated LoginEmail, fall back to Email
            var loginEmail = (dto.LoginEmail?.Trim() ?? dto.Email?.Trim() ?? string.Empty)
                             .ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(loginEmail))
                return new ApiResponse<TechnicianCreatedDto>
                {
                    Success = false,
                    Message = "A login email is required. Provide LoginEmail or Email."
                };

            if (string.IsNullOrWhiteSpace(dto.Password))
                return new ApiResponse<TechnicianCreatedDto>
                {
                    Success = false,
                    Message = "A password is required for the new account."
                };

            // Only Technician and Supervisor can be created here — these are
            // the two field roles that need both an Employee profile AND
            // mobile app access. Other roles (Admin/HRManager/Dispatcher)
            // don't need an Employee profile and are created via User Management.
            var requestedRole = (dto.Role ?? "Technician").Trim();
            if (!string.Equals(requestedRole, Roles.Technician, StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(requestedRole, Roles.Supervisor, StringComparison.OrdinalIgnoreCase))
            {
                return new ApiResponse<TechnicianCreatedDto>
                {
                    Success = false,
                    Message = "Role must be either 'Technician' or 'Supervisor'."
                };
            }

            // Email must be unique within the company
            var emailTaken = await _context.Users.AnyAsync(u =>
                u.CompanyId == _currentUser.CompanyId &&
                u.Email == loginEmail);

            if (emailTaken)
                return new ApiResponse<TechnicianCreatedDto>
                {
                    Success = false,
                    Message = $"A user account with email '{loginEmail}' already exists."
                };

            // Resolve the requested role (Technician or Supervisor)
            var techRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == requestedRole);

            if (techRole == null)
                return new ApiResponse<TechnicianCreatedDto>
                {
                    Success = false,
                    Message = $"The '{requestedRole}' role does not exist in the database."
                };

            // Validate branch if supplied
            if (dto.BranchId.HasValue)
            {
                var branchOk = await _context.Branches.AnyAsync(b =>
                    b.Id == dto.BranchId &&
                    b.CompanyId == _currentUser.CompanyId &&
                    b.IsActive);

                if (!branchOk)
                    return new ApiResponse<TechnicianCreatedDto>
                    {
                        Success = false,
                        Message = "Branch not found or inactive."
                    };
            }

            // Generate employee code BEFORE opening the transaction
            var employeeCode = await _numberGeneratorService
                .GenerateEmployeeCodeAsync(_currentUser.CompanyId);

            // ── Atomic create ─────────────────────────────────────────
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Employee record
                var employee = new Employee
                {
                    Id = Guid.NewGuid(),
                    CompanyId = _currentUser.CompanyId,
                    EmployeeCode = employeeCode,
                    FullName = dto.FullName.Trim(),
                    Email = dto.Email?.Trim(),
                    PhoneNumber = dto.PhoneNumber?.Trim(),
                    BranchId = dto.BranchId,
                    DepartmentId = dto.DepartmentId,
                    PositionId = dto.PositionId,
                    VisaExpiryDate = dto.VisaExpiryDate,
                    PassportExpiryDate = dto.PassportExpiryDate,
                    EmiratesIdExpiryDate = dto.EmiratesIdExpiryDate,
                    JoiningDate = dto.JoiningDate,
                    BasicSalary = dto.BasicSalary,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                await _repository.AddAsync(employee);
                await _repository.SaveChangesAsync();

                // 2. User account linked to the employee
                var user = new User
                {
                    Id = Guid.NewGuid(),
                    CompanyId = _currentUser.CompanyId,
                    FullName = dto.FullName.Trim(),
                    Email = loginEmail,
                    PhoneNumber = dto.PhoneNumber?.Trim(),
                    RoleId = techRole.Id,
                    Role = techRole,
                    BranchId = dto.BranchId,
                    EmployeeId = employee.Id,
                    PasswordHash = _passwordService.HashPassword(dto.Password),
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                await _context.Users.AddAsync(user);
                await _context.SaveChangesAsync();

                await tx.CommitAsync();

                // Invalidate employee dropdown cache
                await _distributedCache.RemoveAsync(
                    $"employees_dropdown_{_currentUser.CompanyId}");

                // Audit log (best-effort — don't fail the whole call if this errors)
                try
                {
                    await _auditRepository.AddAsync(new AuditLog
                    {
                        Id = Guid.NewGuid(),
                        TableName = "Employees",
                        RecordId = employee.Id,
                        Action = $"CREATE_{techRole.Name.ToUpperInvariant()}",
                        OldValues = null,
                        NewValues = JsonSerializer.Serialize(
                            new { employee.Id, employee.EmployeeCode, UserId = user.Id },
                            _jsonOptions),
                        UserId = _currentUser.UserId,
                        CreatedAt = DateTime.UtcNow
                    });
                    await _auditRepository.SaveChangesAsync();
                }
                catch { /* non-critical */ }

                return new ApiResponse<TechnicianCreatedDto>
                {
                    Success = true,
                    Message = $"{techRole.Name} created successfully.",
                    Data = new TechnicianCreatedDto
                    {
                        EmployeeId   = employee.Id,
                        EmployeeCode = employee.EmployeeCode,
                        FullName     = employee.FullName,
                        UserId       = user.Id,
                        LoginEmail   = user.Email,
                        Role         = techRole.Name
                    }
                };
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return new ApiResponse<TechnicianCreatedDto>
                {
                    Success = false,
                    Message = $"Failed to create {requestedRole.ToLowerInvariant()}: {ex.Message}"
                };
            }
        }

    }
}
