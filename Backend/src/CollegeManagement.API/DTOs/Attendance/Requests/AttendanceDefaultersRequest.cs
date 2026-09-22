
using System;

namespace CollegeManagement.API.DTOs.Attendance.Requests
{
    public class AttendanceDefaultersRequest
    {
        public int? BoardId { get; set; }
        public int? AcademicYearId { get; set; }
        public int? AcademicLevelId { get; set; }
        public int? GroupId { get; set; }
        public int? ProgramId { get; set; }
        public int? SectionId { get; set; }
        public int? Month { get; set; }
        public int? Year { get; set; }
        public double Threshold { get; set; } = 75.0;
    }
}
