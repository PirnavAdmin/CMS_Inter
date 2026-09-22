namespace CollegeManagement.API.DTOs.AssignmentSubmission
{
    public class AssignmentSubmissionResponseDto
    {
        public int SubmissionId { get; set; }

        public int AssignmentId { get; set; }

        public int StudentId { get; set; }

        public string StudentName { get; set; } = string.Empty;

        public string RollNo { get; set; } = string.Empty;

        public int? GroupId { get; set; }
        public string? GroupName { get; set; }

        public int? SectionId { get; set; }
        public string? SectionName { get; set; }

        public int? SubjectId { get; set; }
        public string? SubjectName { get; set; }

        public string? Title { get; set; }

        public string? FileUrl { get; set; }

        public string? Description { get; set; }

        public string SubmissionStatus { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public decimal? MarksObtained { get; set; }

        public string? Feedback { get; set; }

        public DateTime SubmissionDate { get; set; }

        public DateTime? CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}