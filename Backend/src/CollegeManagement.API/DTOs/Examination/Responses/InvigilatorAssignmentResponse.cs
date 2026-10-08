using System;

namespace CollegeManagement.API.DTOs.Examination.Responses
{
    public class InvigilatorAssignmentResponse
    {
        public int Id { get; set; }
        public int InvigilatorAssignmentId
        {
            get => Id;
            set => Id = value;
        }
        public int ExamScheduleId { get; set; }
        public int InvigilatorId { get; set; }
        public int FacultyId
        {
            get => InvigilatorId;
            set => InvigilatorId = value;
        }
        public int StaffId
        {
            get => InvigilatorId;
            set => InvigilatorId = value;
        }
        public string InvigilatorName { get; set; } = string.Empty;
        public string HallNumber { get; set; } = string.Empty;
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    }
}