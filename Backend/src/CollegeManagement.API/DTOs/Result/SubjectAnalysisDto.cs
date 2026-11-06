namespace CollegeManagement.API.DTOs.Result
{
    public class SubjectAnalysisDto
    {
        public int SubjectId { get; set; }

        public string SubjectName { get; set; } = string.Empty;

        public string SubjectCode { get; set; } = string.Empty;

        public int TotalStudents { get; set; }

        public int PassedStudents { get; set; }

        public int FailedStudents { get; set; }

        public decimal PassPercentage { get; set; }

        public decimal SubjectPassPercentage
        {
            get => PassPercentage;
            set => PassPercentage = value;
        }

        public decimal AverageMarks { get; set; }

        public decimal AverageScore
        {
            get => AverageMarks;
            set => AverageMarks = value;
        }

        public decimal HighestMarks { get; set; }

        public decimal MaximumMarks
        {
            get => HighestMarks;
            set => HighestMarks = value;
        }

        public decimal LowestMarks { get; set; }
    }
}
