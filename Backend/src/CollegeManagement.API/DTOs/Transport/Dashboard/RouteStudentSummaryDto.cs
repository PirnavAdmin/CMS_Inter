namespace CollegeManagement.API.Dtos.Transport.Dashboard
{
    public class RouteStudentSummaryDto
    {
        public long RouteId { get; set; }

        public string RouteName { get; set; } = string.Empty;

        public int StudentCount { get; set; }
    }
}
