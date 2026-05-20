using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;
using ServicePilot.Application.Interfaces.Repositories;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Infrastructure.Persistence.Models;
using ServicePilot.Infrastructure.Repositories;
using ServicePilot.Infrastructure.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(
                    configuration.GetConnectionString("DefaultConnection")));

            services.AddScoped<IJwtService, JwtService>();
            services.AddScoped<IPasswordService, PasswordService>();
            services.AddScoped<IAuthService, AuthService>();
            services.AddHttpContextAccessor();

            services.AddScoped<ICurrentUserService,
                CurrentUserService>();

            services.AddScoped<IEmployeeRepository, EmployeeRepository>();

            services.AddScoped<IEmployeeService, EmployeeService>();

            services.AddScoped<INumberGeneratorService, NumberGeneratorService>();

            services.AddScoped<ILookupService, LookupService>();

            services.AddScoped<IAuditRepository, AuditRepository>();

            services.AddScoped<IAttendanceRepository, AttendanceRepository>();
            services.AddScoped<IAttendanceService, AttendanceService>();

            services.AddScoped<IJobRepository, JobRepository>();
            services.AddScoped<IJobService, JobService>();
            services.AddScoped<ILeaveRepository, LeaveRepository>();
            services.AddScoped<ILeaveService, LeaveService>();
            services.AddScoped<IOvertimeRepository, OvertimeRepository>();
            services.AddScoped<IOvertimeService, OvertimeService>();

            services.AddScoped<IDashboardService, DashboardService>();
            services.AddScoped<IReportService, ReportService>();

            services.AddScoped<ICompanyService, CompanyService>();
            services.AddScoped<IUserManagementService, UserManagementService>();
            services.AddScoped<IOrgStructureService, OrgStructureService>();
            services.AddScoped<ISuperAdminService, SuperAdminService>();

            return services;
        }
    }
}
