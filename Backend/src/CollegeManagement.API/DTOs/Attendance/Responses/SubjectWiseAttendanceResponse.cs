namespace CollegeManagement.API.DTOs.Attendance.Responses
{
    public class SubjectWiseAttendanceResponse
    {
        public int SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public int? FacultyId { get; set; }
        public string? FacultyName { get; set; }
        public int TotalClassesConducted { get; set; }
        public int ClassesAttended { get; set; }
        public double AttendancePercentage { get; set; }
    }
}
