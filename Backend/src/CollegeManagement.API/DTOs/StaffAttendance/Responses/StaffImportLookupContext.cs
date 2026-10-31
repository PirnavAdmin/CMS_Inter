using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.StaffAttendance.Responses
{
    public class StaffImportStaffItem
    {
        public int FacultyId { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public int? DepartmentId { get; set; }
        public int? CampusId { get; set; }
        public int StaffType { get; set; }
    }

    public class StaffImportAttendanceItem
    {
        public int FacultyId { get; set; }
        public DateTime AttendanceDate { get; set; }
    }

    public class StaffImportLookupContext
    {
        public List<StaffImportStaffItem> StaffList { get; set; } = new();
        public HashSet<string> ExistingAttendanceKeys { get; set; } = new();
    }
}
