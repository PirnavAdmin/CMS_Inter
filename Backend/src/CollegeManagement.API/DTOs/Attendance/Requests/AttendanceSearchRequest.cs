using System;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.Attendance.Requests
{
    /// <summary>
    /// Request DTO for searching and filtering attendance records.
    /// </summary>
    public class AttendanceSearchRequest
    {
        #region Academic Filters

        /// <summary>
        /// Gets or sets the optional date string (e.g. "25-08-2026" or "2026-08-25").
        /// </summary>
        public string? Date { get; set; }

        /// <summary>
        /// Gets or sets the optional attendance date string.
        /// </summary>
        public string? AttendanceDate { get; set; }

        /// <summary>
        /// Gets or sets the board identifier.
        /// </summary>
        public int? BoardId { get; set; }

        /// <summary>
        /// Gets or sets the academic year identifier.
        /// </summary>
        public int? AcademicYearId { get; set; }

        /// <summary>
        /// Gets or sets the academic level identifier.
        /// </summary>
        public int? AcademicLevelId { get; set; }

        /// <summary>
        /// Gets or sets the group identifier.
        /// </summary>
        public int? GroupId { get; set; }

        /// <summary>
        /// Gets or sets the program identifier.
        /// </summary>
        public int? ProgramId { get; set; }

        /// <summary>
        /// Gets or sets the section identifier.
        /// </summary>
        public int? SectionId { get; set; }

        /// <summary>
        /// Gets or sets the subject identifier.
        /// </summary>
        public int? SubjectId { get; set; }

        /// <summary>
        /// Gets or sets the faculty identifier.
        /// </summary>
        public int? FacultyId { get; set; }

        /// <summary>
        /// Gets or sets the optional period identifier.
        /// </summary>
        public int? PeriodId { get; set; }

        /// <summary>
        /// Gets or sets the optional timetable slot identifier.
        /// </summary>
        public int? TimetableId { get; set; }

        /// <summary>
        /// Gets or sets the session identifier (Morning=1, Afternoon=2).
        /// </summary>
        public StudentAttendanceSession? Session { get; set; }

        #endregion

        #region Student Filters

        /// <summary>
        /// Gets or sets the optional student identifier to filter attendance for a specific student.
        /// </summary>
        public int? StudentId { get; set; }

        /// <summary>
        /// Gets or sets the optional attendance status to filter records.
        /// </summary>
        public AttendanceStatus? Status { get; set; }

        #endregion

        #region Date Filters

        /// <summary>
        /// Gets or sets the optional start date to filter attendance records.
        /// </summary>
        public DateTime? FromDate { get; set; }

        /// <summary>
        /// Gets or sets the optional end date to filter attendance records.
        /// </summary>
        public DateTime? ToDate { get; set; }

        #endregion

        #region Pagination

        /// <summary>
        /// Gets or sets the page number for pagination. Defaults to 1.
        /// </summary>
        public int PageNumber { get; set; } = 1;

        /// <summary>
        /// Gets or sets the page size for pagination. Defaults to 10.
        /// </summary>
        public int PageSize { get; set; } = 10;

        #endregion

        #region Search

        /// <summary>
        /// Gets or sets the optional search text to filter by student name or roll number.
        /// </summary>
        public string? SearchText { get; set; }

        #endregion
    }
}
