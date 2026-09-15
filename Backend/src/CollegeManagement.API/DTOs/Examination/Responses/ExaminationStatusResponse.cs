namespace CollegeManagement.API.DTOs.Examination.Responses
{
    public class ExaminationStatusResponse
    {
        public int ExaminationId { get; set; }
        public int Id => ExaminationId;
        public string? Name { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ActionReason { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool Success { get; set; } = true;
        public string? Message { get; set; }
    }
}