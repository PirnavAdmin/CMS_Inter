namespace CollegeManagement.API.DTOs.Examination.Responses
{
    public class AvailableInvigilatorDto
    {
        public int FacultyId { get; set; }
        public int Id { get => FacultyId; set => FacultyId = value; }
        public string EmployeeId { get; set; } = string.Empty;
        public string FacultyName { get; set; } = string.Empty;
        public string FullName { get => FacultyName; set => FacultyName = value; }
        public string Name { get => FacultyName; set => FacultyName = value; }
        public string Designation { get; set; } = string.Empty;
        public string FacultyType { get; set; } = "TEACHING";
        public string StaffType { get => FacultyType; set => FacultyType = value; }
        public bool IsActive { get; set; } = true;
        public bool IsAvailable { get; set; } = true;
    }
}
