using System;

namespace CollegeManagement.API.DTOs.Examination.Responses
{
    public class FinalizeScheduleResponse
    {
        public int ExaminationId { get; set; }
        public string ExamCode { get; set; } = string.Empty;
        public string Status { get; set; } = "SCHEDULED";
        public int TotalEligibleSubjects { get; set; }
        public int ScheduledSubjectsCount { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
