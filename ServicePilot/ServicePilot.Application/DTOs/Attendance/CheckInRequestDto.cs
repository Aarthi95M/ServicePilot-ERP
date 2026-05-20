using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Attendance
{
    public class CheckInRequestDto
    {
        /// <summary>GPS latitude from device. Required.</summary>
        public decimal Latitude { get; set; }

        /// <summary>GPS longitude from device. Required.</summary>
        public decimal Longitude { get; set; }

        /// <summary>
        /// Set true when the mobile was offline at event time.
        /// Triggers CheckInTimeOverride validation.
        /// </summary>
        public bool IsOfflineSync { get; set; }

        /// <summary>
        /// Real device timestamp of the check-in event.
        /// REQUIRED when IsOfflineSync = true.
        /// Allows recording when the event actually happened, not when it synced.
        /// </summary>
        public DateTime? CheckInTimeOverride { get; set; }

        /// <summary>GPS accuracy in metres from device sensor. Optional.</summary>
        public decimal? Accuracy { get; set; }
    }
}
