using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Lookup
{
    public class PositionDropdownDto
    {
        public Guid Id { get; set; }

        public string Label { get; set; } = string.Empty;
    }
}
