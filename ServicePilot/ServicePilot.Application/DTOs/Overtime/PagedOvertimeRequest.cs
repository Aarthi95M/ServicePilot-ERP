using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Overtime
{
    public class PagedOvertimeRequest : OvertimeFilterDto
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string? SortBy { get; set; } = "requestdate";
        public string? SortDir { get; set; } = "desc";
    }
}
