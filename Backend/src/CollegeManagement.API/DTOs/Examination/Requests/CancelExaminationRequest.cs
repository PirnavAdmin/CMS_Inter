namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class CancelExaminationRequest
    {
        public string Reason { get; set; } = string.Empty;
        public string? CancelReason
        {
            get => Reason;
            set => Reason = value ?? string.Empty;
        }
        public bool NotifyStudents { get; set; }
    }
}