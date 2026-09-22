using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Attendance.Requests
{
    /// <summary>
    /// Request filter model for generating Student Monthly Calendar Matrix Report.
    /// </summary>
    public class StudentMonthlyReportRequest
    {
        public string? Date { get; set; }

        public int? Month { get; set; }

        public int? Year { get; set; }

        public int? BoardId { get; set; }

        public int? AcademicYearId { get; set; }

        public int? AcademicLevelId { get; set; }

        public int? GroupId { get; set; }

        public int? ProgramId { get; set; }

        public int? SectionId { get; set; }

        public int? SubjectId { get; set; }

        public int? PeriodId { get; set; }

        public int? FacultyId { get; set; }

        public int? ClassTeacherId { get; set; }

        public int? StudentId { get; set; }
    }
}
