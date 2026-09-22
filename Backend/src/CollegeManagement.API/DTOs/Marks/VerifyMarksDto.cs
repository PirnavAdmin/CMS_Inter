namespace CollegeManagement.API.DTOs.Marks
{
    public class VerifyMarksDto
    {
        public int ExaminationId { get; set; }
        public int? SubjectId { get; set; }
        public int? SectionId { get; set; }
        public string VerifiedBy { get; set; } = string.Empty;
    }
}