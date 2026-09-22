namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class ExaminationSearchRequestDto
    {
        public int? BoardId { get; set; }
        public int? AcademicYearId { get; set; }
        public int? AcademicLevelId { get; set; }
        public int? GroupId { get; set; }
        public int? ProgramId { get; set; }
        public string? ExamType { get; set; }
        public int? AssessmentTypeId { get; set; }
        public string? Status { get; set; }
        public string? SearchTerm { get; set; }
    }
}
