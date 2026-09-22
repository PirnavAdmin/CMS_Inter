namespace CollegeManagement.API.DTOs.Attendance.Responses
{
    /// <summary>
    /// Response DTO showing attendance statistics and calculation details for a student.
    /// </summary>
    public class AttendancePercentageResponse
    {
        /// <summary>
        /// Gets or sets the student identifier.
        /// </summary>
        public int StudentId { get; set; }

        /// <summary>
        /// Gets or sets the name of the student.
        /// </summary>
        public string StudentName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the roll number of the student.
        /// </summary>
        public string RollNumber { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the total number of classes held.
        /// </summary>
        public int TotalClasses { get; set; }

        /// <summary>
        /// Gets or sets the number of classes where the student was present.
        /// </summary>
        public int PresentClasses { get; set; }

        /// <summary>
        /// Gets or sets the number of classes where the student was absent.
        /// </summary>
        public int AbsentClasses { get; set; }

        /// <summary>
        /// Gets or sets the number of classes where the student was late.
        /// </summary>
        public int LateClasses { get; set; }

        /// <summary>
        /// Gets or sets the number of classes where the student was on leave.
        /// </summary>
        public int LeaveClasses { get; set; }

        /// <summary>
        /// Gets or sets the overall attendance percentage of the student.
        /// </summary>
        public decimal AttendancePercentage { get; set; }
    }
}
