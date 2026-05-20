using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.GPS
{
    /// <summary>
    /// Sent by mobile app periodically while employee is on duty.
    /// Stores GPS breadcrumb for job/route tracking.
    /// </summary>
    public class GpsLogRequestDto
    {
        public decimal Latitude { get; set; }
        public decimal Longitude { get; set; }
        public decimal? Accuracy { get; set; }

        /// <summary>
        /// UTC time location was captured on device.
        /// May differ from server receive time for offline sync.
        /// </summary>
        public DateTime RecordedAt { get; set; }
    }
}
