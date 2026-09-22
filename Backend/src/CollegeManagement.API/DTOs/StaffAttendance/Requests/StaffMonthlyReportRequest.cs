using System;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.StaffAttendance.Requests
{
    public class StaffMonthlyReportRequest
    {
        public DateTime? Date { get; set; }

        public int? Month { get; set; }

        public int? Year { get; set; }

        public int? AcademicYearId { get; set; }

        public int? BoardId { get; set; }

        public int? DepartmentId { get; set; }

        public StaffType? StaffType { get; set; }

        public int? FacultyId { get; set; }
    }
}
