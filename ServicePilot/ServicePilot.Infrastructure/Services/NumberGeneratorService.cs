using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Infrastructure.Persistence.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Infrastructure.Services
{
    public class NumberGeneratorService : INumberGeneratorService
    {
        private readonly AppDbContext _context;

        public NumberGeneratorService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<string> GenerateEmployeeCodeAsync(Guid companyId)
        {
            var year = DateTime.UtcNow.Year;

            var lastCode = await _context.Employees
                .Where(x => x.CompanyId == companyId &&
                             x.EmployeeCode != null &&
                             x.EmployeeCode.StartsWith($"EMP-{year}-"))
                .OrderByDescending(x => x.EmployeeCode)
                .Select(x => x.EmployeeCode)
                .FirstOrDefaultAsync();

            int nextNumber = 1;

            if (!string.IsNullOrEmpty(lastCode))
            {
                var parts = lastCode.Split('-');
                // EMP - 2026 - 000001

                if (parts.Length == 3 && int.TryParse(parts[2], out int num))
                {
                    nextNumber = num + 1;
                }
            }

            return $"EMP-{year}-{nextNumber.ToString("D6")}";
        }
    }
}
