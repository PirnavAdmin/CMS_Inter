namespace CollegeManagement.API.DTOs.Examination.Responses
{
    public class InvigilatorAssignmentResponse
    {
        public int Id { get; set; }
        public int ExamScheduleId { get; set; }
        public int InvigilatorId { get; set; }
        public string InvigilatorName { get; set; } = string.Empty;
        public string HallNumber { get; set; } = string.Empty;
    }
}