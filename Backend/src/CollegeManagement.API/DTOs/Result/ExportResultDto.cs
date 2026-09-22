namespace CollegeManagement.API.DTOs.Result
{
    public class ExportResultDto
    {
        public int ResultId { get; set; }

        public int StudentId { get; set; }

        public string StudentName { get; set; } = string.Empty;

        public string RollNumber { get; set; } = string.Empty;

        public string? BoardName { get; set; }

        public string? AcademicYearName { get; set; }

        public string? AcademicLevel { get; set; }

        public string? GroupName { get; set; }

        public string? ExamName { get; set; }

        public string? SubjectName { get; set; }

        public string? SubjectCode { get; set; }

        public decimal InternalMarks { get; set; }

        public decimal PracticalMarks { get; set; }

        public decimal ExternalMarks { get; set; }

        public decimal TotalMarks { get; set; }

        public decimal MaximumMarks { get; set; }

        public decimal PassingMarks { get; set; }

        public string? Grade { get; set; }

        public string? ResultStatus { get; set; }
    }
}

