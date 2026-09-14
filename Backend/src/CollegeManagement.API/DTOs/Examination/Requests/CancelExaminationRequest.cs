using System;

namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class CancelExaminationRequest
    {
        public string? CancellationReason { get; set; }

        public string Reason
        {
            get => CancellationReason ?? string.Empty;
            set => CancellationReason = value;
        }

        public DateTime? CancelledAt { get; set; } = DateTime.UtcNow;
        public bool NotifyStudents { get; set; } = false;
    }
}