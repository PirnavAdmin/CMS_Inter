namespace CollegeManagement.API.DTOs.Result
{
    public class ResultStatisticsDto
    {
        public int TotalStudents { get; set; }

        public int PassedStudents { get; set; }

        public int FailedStudents { get; set; }

        public decimal PassPercentage { get; set; }

        public decimal AverageMarks { get; set; }

        public decimal HighestMarks { get; set; }

        public decimal LowestMarks { get; set; }

        public int DistinctionCount { get; set; }

        public int FirstClassCount { get; set; }

        public int SecondClassCount { get; set; }

        public int ThirdClassCount { get; set; }
    }
}
