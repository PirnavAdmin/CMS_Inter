namespace CollegeManagement.API.DTOs.Result
{
    public class ResultDashboardDto
    {
        public int TotalResults { get; set; }
        public int TotalStudents { get => TotalResults; set => TotalResults = value; }

        public int ProcessedResults { get; set; }
        public int ProcessedStudents { get => ProcessedResults; set => ProcessedResults = value; }

        public int PublishedResults { get; set; }
        public int PublishedStudents { get => PublishedResults; set => PublishedResults = value; }

        public int PendingResults { get; set; }
        public int PendingStudents { get => PendingResults; set => PendingResults = value; }

        public int PassedStudents { get; set; }
        public int FailedStudents { get; set; }
        public decimal PassPercentage { get; set; }
    }
}

