using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class AssignInvigilatorRequest
    {
        public int ExamScheduleId { get; set; }
        public List<int> InvigilatorIds { get; set; } = new();
        public string HallNumber { get; set; } = string.Empty;
    }
}