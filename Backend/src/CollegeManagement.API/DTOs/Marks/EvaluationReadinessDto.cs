using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Marks
{
    public class EvaluationReadinessDto
    {
        public int ExaminationId { get; set; }
        public int? SectionId { get; set; }
        public int RequiredEvaluationCount { get; set; }
        public int DraftCount { get; set; }
        public int SubmittedCount { get; set; }
        public int VerifiedCount { get; set; }
        public int ApprovedCount { get; set; }
        public int RejectedCount { get; set; }
        public int MissingCount { get; set; }
        public bool AllRequiredEvaluationsApproved { get; set; }
        public bool ReadyForResults { get; set; }
        public List<RequiredSubjectEvaluationStatusDto> RequiredSubjects { get; set; } = new();
    }

    public class RequiredSubjectEvaluationStatusDto
    {
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public int? FacultyId { get; set; }
        public int? EvaluationId { get; set; }
        public string Status { get; set; } = "MISSING";
    }
}
