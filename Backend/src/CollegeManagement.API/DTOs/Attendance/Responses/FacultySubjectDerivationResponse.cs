namespace CollegeManagement.API.DTOs.Attendance.Responses
{
    /// <summary>
    /// Response model for derived Subject and Faculty assigned for a specific period.
    /// </summary>
    public class FacultySubjectDerivationResponse
    {
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public int FacultyId { get; set; }
        public string FacultyName { get; set; } = string.Empty;
        public int PeriodId { get; set; }
        public string PeriodName { get; set; } = string.Empty;
    }
}
