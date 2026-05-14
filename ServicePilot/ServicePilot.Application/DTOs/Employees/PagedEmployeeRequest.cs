using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Employees
{
    public class PagedEmployeeRequest
    {
        public int Page { get; set; } = 1;

        public int PageSize { get; set; } = 20;

        public string? SortBy { get; set; } = "fullName";

        public string? SortDir { get; set; } = "asc";

        public Guid? BranchId { get; set; }

        public Guid? DepartmentId { get; set; }

        public bool? IsActive { get; set; }

        public string? Search { get; set; }
    }
}
