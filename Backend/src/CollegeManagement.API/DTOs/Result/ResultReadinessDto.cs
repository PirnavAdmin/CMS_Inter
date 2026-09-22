using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Result
{
    public class ResultReadinessDto
    {
        public int ExaminationId { get; set; }
        public string ExaminationName { get; set; } = string.Empty;
        public string ExaminationStatus { get; set; } = "DRAFT";
        public bool IsExamCompleted { get; set; }
        public int ExpectedSectionCount { get; set; }
        public int TotalEligibleStudents { get; set; }
        public int RequiredEvaluationCount { get; set; }
        public int ApprovedEvaluationCount { get; set; }
        public bool AllEvaluationsApproved { get; set; }
        public bool CanGenerateResults { get; set; }
        public List<string> ValidationBlockers { get; set; } = new();
    }
}
