using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Examination.Responses
{
    public class SchedulingContextResponseDto
    {
        public int ExaminationId { get; set; }
        public List<int> SectionIds { get; set; } = new();
        public List<SchedulingSectionContextDto> Sections { get; set; } = new();
        public int TotalEligibleStudents { get; set; }
        public int RequiredCapacity { get; set; }
    }

    public class SchedulingSectionContextDto
    {
        public int SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public int EligibleStudentCount { get; set; }
        public int TotalStudents { get => EligibleStudentCount; set => EligibleStudentCount = value; }
    }
}
