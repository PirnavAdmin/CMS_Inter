namespace CollegeManagement.API.Dtos.Transport.Reports
{
    public class RouteStudentReportDto
    {
        public long RouteId { get; set; }

        public string RouteName { get; set; } = string.Empty;

        public int StudentCount { get; set; }
    }
}
