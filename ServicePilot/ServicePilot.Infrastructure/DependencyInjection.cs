using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ServicePilot.Application.Interfaces.Repositories;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Infrastructure.Repositories;
using ServicePilot.Infrastructure.Services;

namespace ServicePilot.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            // NOTE: DbContext is registered in Program.cs with MigrationsAssembly.
            // Do NOT add a second AddDbContext here — it would shadow the migration config.

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
            services.AddScoped<INotificationService, NotificationService>();

            return services;
        }
    }
}
