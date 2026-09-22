using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Attendance.Requests
{
    /// <summary>
    /// Request DTO for taking attendance in bulk.
    /// </summary>
    public class BulkAttendanceRequest
    {
        /// <summary>
        /// Gets or sets the date of the attendance.
        /// </summary>
        public DateTime AttendanceDate { get; set; }

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
        /// Gets or sets the faculty identifier.
        /// </summary>
        public int FacultyId { get; set; }

        /// <summary>
        /// Gets or sets the list of students with their attendance details.
        /// </summary>
        public List<AttendanceStudentRequest> Students { get; set; } = new();

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
        public CollegeManagement.API.Enums.StudentAttendanceSession? Session { get; set; }
    }
}
