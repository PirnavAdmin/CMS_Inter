namespace CollegeManagement.API.DTOs.Result
{
    
    public class ProcessResultResponseDto
    {
        public int BoardId { get; set; }

        public int AcademicYearId { get; set; }

        public int AcademicLevelId { get; set; }

        public int GroupId { get; set; }

        public int ExamId { get; set; }

        public int TotalMarksRecords { get; set; }

        public int VerifiedMarks { get; set; }

        public int PendingVerification { get; set; }

        public int UpdatedResults { get; set; }

        public int InsertedResults { get; set; }

        public int TotalProcessed { get; set; }

        public DateTime ProcessDate { get; set; }
    }
}
