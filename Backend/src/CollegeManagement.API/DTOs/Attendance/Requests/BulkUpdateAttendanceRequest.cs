using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Attendance.Requests
{
    /// <summary>
    /// Request DTO for bulk updating attendance records.
    /// </summary>
    public class BulkUpdateAttendanceRequest
    {
        /// <summary>
        /// Gets or sets the attendance session identifier. Null for Admin session-based updates.
        /// </summary>
        public int? AttendanceSessionId { get; set; }

        /// <summary>
        /// Gets or sets the list of student attendance updates.
        /// </summary>
        public List<BulkUpdateStudentRequest> Updates { get; set; } = new();
    }
}
