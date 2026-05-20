using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Attendance
{
    public class CheckOutRequestDto
    {
        public decimal Latitude { get; set; }
        public decimal Longitude { get; set; }
        public bool IsOfflineSync { get; set; }

        /// <summary>Real device timestamp. Required when IsOfflineSync = true.</summary>
        public DateTime? CheckOutTimeOverride { get; set; }

        public decimal? Accuracy { get; set; }
    }
}
