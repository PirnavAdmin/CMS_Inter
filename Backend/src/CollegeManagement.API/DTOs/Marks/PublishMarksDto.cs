namespace CollegeManagement.API.DTOs.Marks
{
    public class PublishMarksDto
    {
        public int ExaminationId { get; set; }
        public int? SubjectId { get; set; }
        public int? SectionId { get; set; }
    }
}
