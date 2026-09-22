using System;

namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class RescheduleExaminationRequest
    {
        public DateOnly? NewStartDate { get; set; }
        public DateOnly? NewEndDate { get; set; }
        public DateTime? NewDate { get; set; }
        public TimeSpan? StartTime { get; set; }
        public TimeSpan? EndTime { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}