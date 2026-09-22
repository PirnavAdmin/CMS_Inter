namespace CollegeManagement.API.DTOs.Attendance.Responses
{
    /// <summary>
    /// Response DTO providing summary statistics of an attendance session.
    /// </summary>
    public class AttendanceSummaryResponse
    {
        /// <summary>
        /// Gets or sets the total number of students.
        /// </summary>
        public int TotalStudents { get; set; }

        /// <summary>
        /// Gets or sets the number of students who were present.
        /// </summary>
        public int PresentCount { get; set; }

        /// <summary>
        /// Gets or sets the number of students who were absent.
        /// </summary>
        public int AbsentCount { get; set; }

        /// <summary>
        /// Gets or sets the number of students who were late.
        /// </summary>
        public int LateCount { get; set; }

        /// <summary>
        /// Gets or sets the number of students who were on leave.
        /// </summary>
        public int LeaveCount { get; set; }

        /// <summary>
        /// Gets or sets the attendance percentage for the selected attendance session.
        /// </summary>
        public decimal AttendancePercentage { get; set; }

        /// <summary>
        /// Gets or sets the date of the attendance.
        /// </summary>
        public DateTime AttendanceDate { get; set; }
    }
}
