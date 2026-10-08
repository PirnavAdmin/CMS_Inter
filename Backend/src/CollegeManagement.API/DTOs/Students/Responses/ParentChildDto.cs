namespace CollegeManagement.API.DTOs.Students.Responses
{
    public class ParentChildDto
    {
        public int StudentId { get; set; }
        public string? StudentName { get; set; }
        public string? RollNo { get; set; }
        public string? AdmissionNo { get; set; }
        public string? ClassName { get; set; }
        public string? SectionName { get; set; }
        public string? PhotoUrl { get; set; }
        public string? Status { get; set; }
    }
}
