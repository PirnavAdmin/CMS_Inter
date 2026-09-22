namespace CollegeManagement.API.DTOs.Staff
{
    public class StaffDropdownDto
    {
        public int Id { get; set; }
        public int StaffId => Id;
        public int FacultyId => Id;
        public string EmployeeId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public int? DesignationId { get; set; }
        public string? Department { get; set; }
        public int? DepartmentId { get; set; }
        public int? BoardId { get; set; }
        public string? BoardName { get; set; }
        public string? Board => BoardName;
        public string StaffType { get; set; } = "Teaching";
        public string FacultyType => StaffType;
    }
}
