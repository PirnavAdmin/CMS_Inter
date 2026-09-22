using System;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.Attendance.Requests
{
    /// <summary>
    /// Request DTO for creating an attendance record.
    /// </summary>
    public class CreateAttendanceRequest
    {
        /// <summary>
        /// Gets or sets the date of the attendance.
        /// </summary>
        public DateTime AttendanceDate { get; set; }

        /// <summary>
        /// Gets or sets the student identifier.
        /// </summary>
        public int StudentId { get; set; }

        /// <summary>
        /// Gets or sets the faculty identifier.
        /// </summary>
        public int FacultyId { get; set; }

        /// <summary>
        /// Gets or sets the board identifier.
        /// </summary>
        public int BoardId { get; set; }

        /// <summary>
        /// Gets or sets the academic year identifier.
        /// </summary>
        public int AcademicYearId { get; set; }

        /// <summary>
        /// Gets or sets the academic level identifier.
        /// </summary>
        public int AcademicLevelId { get; set; }

        /// <summary>
        /// Gets or sets the group identifier.
        /// </summary>
        public int GroupId { get; set; }

        /// <summary>
        /// Gets or sets the program identifier.
        /// </summary>
        public int ProgramId { get; set; }

        /// <summary>
        /// Gets or sets the section identifier.
        /// </summary>
        public int SectionId { get; set; }

        /// <summary>
        /// Gets or sets the subject identifier.
        /// </summary>
        public int SubjectId { get; set; }

        /// <summary>
        /// Gets or sets the status of the attendance (1 = Present, 2 = Absent, 3 = Late, 4 = Leave).
        /// </summary>
        public AttendanceStatus Status { get; set; }

        /// <summary>
        /// Gets or sets any remarks or notes for the attendance.
        /// </summary>
        public string? Remarks { get; set; }

        /// <summary>
        /// Gets or sets the period identifier.
        /// </summary>
        public int PeriodId { get; set; }

        /// <summary>
        /// Gets or sets the timetable slot identifier.
        /// </summary>
        public int? TimetableId { get; set; }

        /// <summary>
        /// Gets or sets the session for admin attendance.
        /// </summary>
        public StudentAttendanceSession? Session { get; set; }
    }
}
