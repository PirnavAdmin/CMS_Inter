namespace CollegeManagement.API.DTOs.TransportDriver.Attendance
{
    public class DriverAttendanceSummaryResponse
    {
        public int WorkingDays { get; set; }
        public int PresentDays { get; set; }
        public int ApprovedLeaves { get; set; }
        public decimal PunctualityRate { get; set; }
    }
}
