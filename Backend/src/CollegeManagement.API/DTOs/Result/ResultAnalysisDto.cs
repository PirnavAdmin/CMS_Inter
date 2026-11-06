namespace CollegeManagement.API.DTOs.Result
{
    public class ResultAnalysisDto
    {
        public int TotalStudents { get; set; }

        public int PassedStudents { get; set; }

        public int FailedStudents { get; set; }

        public decimal PassPercentage { get; set; }

        public decimal AverageMarks { get; set; }

        public decimal OverallAveragePercentage
        {
            get => AverageMarks;
            set => AverageMarks = value;
        }

        public decimal HighestMarks { get; set; }

        public decimal LowestMarks { get; set; }

        public List<SubjectAnalysisDto> Subjects { get; set; } = new();
    }
}
