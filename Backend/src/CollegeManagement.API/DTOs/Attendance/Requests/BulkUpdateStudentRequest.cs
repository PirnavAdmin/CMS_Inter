using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.Attendance.Requests
{
    /// <summary>
    /// Request DTO representing a student's attendance update details.
    /// </summary>
    public class BulkUpdateStudentRequest
    {
        /// <summary>
        /// Gets or sets the attendance record identifier.
        /// </summary>
        public int AttendanceId { get; set; }

        /// <summary>
        /// Gets or sets the attendance status.
        /// </summary>
        public AttendanceStatus Status { get; set; }

        /// <summary>
        /// Gets or sets any remarks or notes for the attendance.
        /// </summary>
        public string? Remarks { get; set; }
    }
}
