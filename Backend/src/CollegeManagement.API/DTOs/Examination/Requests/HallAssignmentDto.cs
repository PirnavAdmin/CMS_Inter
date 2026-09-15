using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class HallAssignmentDto
    {
        public int HallId { get; set; }
        public string? HallName { get; set; }
        public int CandidateCount { get; set; }
        public List<int> InvigilatorIds { get; set; } = new();
    }
}
