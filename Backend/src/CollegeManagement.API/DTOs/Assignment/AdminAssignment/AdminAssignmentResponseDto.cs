namespace CollegeManagement.API.DTOs.Assignment.Admin
{
    public class AdminAssignmentResponseDto
    {
        public int AssignmentId { get; set; }

        public string Title { get; set; } = string.Empty;

        public int AcademicYearId { get; set; }

        public string AcademicYearName { get; set; } = string.Empty;

        public string AcademicLevel { get; set; } = string.Empty;

        public int GroupId { get; set; }

        public string GroupName { get; set; } = string.Empty;

        public int SubjectId { get; set; }

        public string SubjectName { get; set; } = string.Empty;

        public string? Description { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime DueDate { get; set; }

        public string? AttachmentPath { get; set; }

        public int MaximumMarks { get; set; }

        public string CreatedByType { get; set; } = string.Empty;
        public bool IsPublished { get; set; }
        public DateTime? PublishedAt { get; set; }
    }
}