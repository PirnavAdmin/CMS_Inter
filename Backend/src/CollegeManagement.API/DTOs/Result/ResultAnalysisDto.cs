namespace CollegeManagement.API.DTOs.Result
{
    public class ResultAnalysisDto
    {
        public int TotalStudents { get; set; }

        public int PassedStudents { get; set; }

        public int FailedStudents { get; set; }

        public decimal OverallAveragePercentage { get; set; }

        public List<SubjectAnalysisDto> Subjects { get; set; } = new();
    }
}