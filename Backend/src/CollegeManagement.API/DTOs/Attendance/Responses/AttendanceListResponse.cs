using System;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.Attendance.Responses
{
    /// <summary>
    /// Response DTO representing an item in an attendance list representation.
    /// </summary>
    public class AttendanceListResponse
    {
        /// <summary>
        /// Gets or sets the unique identifier of the attendance record.
        /// </summary>
        public int AttendanceId { get; set; }

        /// <summary>
        /// Gets or sets the date and time of the attendance.
        /// </summary>
        public DateTime AttendanceDate { get; set; }

        /// <summary>
        /// Gets or sets the unique identifier of the student.
        /// </summary>
        public int StudentId { get; set; }

        /// <summary>
        /// Gets or sets the roll number of the student.
        /// </summary>
        public string RollNumber { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the name of the student.
        /// </summary>
        public string StudentName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the name of the faculty member.
        /// </summary>
        public string FacultyName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the name of the subject.
        /// </summary>
        public string SubjectName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the attendance status.
        /// </summary>
        public AttendanceStatus Status { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the attendance record is active.
        /// </summary>
        public bool IsActive { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the attendance session is locked.
        /// </summary>
        public bool IsLocked { get; set; }
    }
}
