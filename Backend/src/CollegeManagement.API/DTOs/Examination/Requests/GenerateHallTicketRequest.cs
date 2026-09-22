namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class GenerateHallTicketRequest
    {
        public int ExaminationId { get; set; }
        public int BatchId { get; set; }
    }
}