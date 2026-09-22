namespace CollegeManagement.API.DTOs.Marks
{
    public class MarksSummaryDto
    {
        public int TotalStudents { get; set; }
        public int TotalMarksEntered { get; set; }
        public int VerifiedStudents { get; set; }
        public int PendingStudents { get; set; }
        public int PassedStudents { get; set; }
        public int FailedStudents { get; set; }
        public decimal PassPercentage { get; set; }
        public int HighestMarks { get; set; }
        public decimal AverageMarks { get; set; }
    }
}