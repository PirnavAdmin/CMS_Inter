using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class HallAssignmentDto
    {
        public int HallId { get; set; }
        public int RoomId
        {
            get => HallId;
            set => HallId = value;
        }
        public string? HallName { get; set; }
        public string RoomNumber
        {
            get => HallName ?? string.Empty;
            set => HallName = value;
        }
        public int CandidateCount { get; set; }
        public List<int> InvigilatorIds { get; set; } = new();
        public string? InvigilatorName { get; set; }
        public string? Invigilator
        {
            get => InvigilatorName;
            set => InvigilatorName = value;
        }
    }
}
