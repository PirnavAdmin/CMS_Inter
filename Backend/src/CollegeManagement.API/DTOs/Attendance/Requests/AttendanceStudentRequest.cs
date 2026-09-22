using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.Attendance.Requests
{
    /// <summary>
    /// Request DTO representing a student's attendance details.
    /// </summary>
    public class AttendanceStudentRequest
    {
        /// <summary>
        /// Gets or sets the student identifier.
        /// </summary>
        public int StudentId { get; set; }

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
