using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Students
{
    public class StudentCredentialPdfFilterDto
    {
        public int? BoardId { get; set; }
        public int? AcademicYearId { get; set; }
        public int? AcademicLevelId { get; set; }
        public int? GroupId { get; set; }
        public int? SectionId { get; set; }
        public string? AdmissionNo { get; set; }
        public List<int>? StudentIds { get; set; }
    }
}
