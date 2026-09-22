using System;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.Attendance.Responses
{
    /// <summary>
    /// Response DTO representing an entry in an attendance report.
    /// </summary>
    public class AttendanceReportResponse
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
        /// Gets or sets the name of the board.
        /// </summary>
        public string BoardName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the name of the academic year.
        /// </summary>
        public string AcademicYearName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the name of the academic level.
        /// </summary>
        public string AcademicLevelName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the name of the group.
        /// </summary>
        public string GroupName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the name of the section.
        /// </summary>
        public string SectionName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the name of the subject.
        /// </summary>
        public string SubjectName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the name of the faculty member who took the attendance.
        /// </summary>
        public string FacultyName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the roll number of the student.
        /// </summary>
        public string RollNumber { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the name of the student.
        /// </summary>
        public string StudentName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the attendance status.
        /// </summary>
        public AttendanceStatus Status { get; set; }

        /// <summary>
        /// Gets or sets any remarks or notes for the attendance.
        /// </summary>
        public string? Remarks { get; set; }

        /// <summary>
        /// Gets or sets the unique identifier of the student.
        /// </summary>
        public int StudentId { get; set; }
    }
}
