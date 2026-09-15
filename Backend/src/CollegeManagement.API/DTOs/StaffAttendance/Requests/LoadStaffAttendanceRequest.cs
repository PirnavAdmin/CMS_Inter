using System;
using System.ComponentModel.DataAnnotations;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.StaffAttendance.Requests
{
    public class LoadStaffAttendanceRequest
    {
        public string? Date { get; set; }

        public DateTime? AttendanceDate { get; set; }

        public int? BoardId { get; set; }

        public int? AcademicYearId { get; set; }

        public int? DepartmentId { get; set; }

        public StaffType? StaffType { get; set; }

        public AttendanceStatus? Status { get; set; }

        public int? FacultyId { get; set; }
    }
}
