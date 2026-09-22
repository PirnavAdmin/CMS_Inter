using System;

namespace CollegeManagement.API.DTOs.Students
{
    public class StudentExportFilterDto
    {
        public int? BoardId { get; set; }
        public int? AcademicLevelId { get; set; }
        public int? AcademicYearId { get; set; }
        public int? GroupId { get; set; }
        public int? ProgramId { get; set; }
        public int? SectionId { get; set; }
        public string? Status { get; set; }
        public bool? IsActive { get; set; }
    }
}