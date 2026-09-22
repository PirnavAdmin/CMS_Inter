namespace CollegeManagement.API.DTOs.Result
{
    public class SubjectAnalysisDto
    {
        public int SubjectId { get; set; }

        public string SubjectName { get; set; } = string.Empty;

        public decimal AverageScore { get; set; }

        public decimal MaximumMarks { get; set; }

        public int PassedStudents { get; set; }

        public int TotalStudents { get; set; }

        public decimal SubjectPassPercentage { get; set; }
    }
}
