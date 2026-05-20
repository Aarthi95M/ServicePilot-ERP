using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Leave
{
    public class PagedLeaveRequest : LeaveFilterDto
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string? SortBy { get; set; } = "createdat";
        public string? SortDir { get; set; } = "desc";
    }
}
