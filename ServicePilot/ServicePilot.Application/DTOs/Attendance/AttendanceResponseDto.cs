using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Attendance
{
    public class AttendanceResponseDto
    {
        public Guid Id { get; set; }
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;

        public DateTime CheckInTime { get; set; }
        public decimal? CheckInLat { get; set; }
        public decimal? CheckInLng { get; set; }

        public DateTime? CheckOutTime { get; set; }
        public decimal? CheckOutLat { get; set; }
        public decimal? CheckOutLng { get; set; }

        /// <summary>Present | Late | Absent</summary>
        public string Status { get; set; } = string.Empty;

        /// <summary>
        /// Computed on read: CheckOutTime - CheckInTime in hours.
        /// Null if employee has not checked out yet.
        /// NOT stored in DB - always derived.
        /// </summary>
        public double? HoursWorked { get; set; }

        public bool IsOfflineSync { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
