using System;

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
        public int? CampusId { get; set; }
        public int? GroupId { get; set; }
        public int? SectionId { get; set; }
        public int? AcademicYearId { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? FatherName { get; set; }
        public string? MotherName { get; set; }
        public string? ParentGuardianEmail { get; set; }
    }
}
