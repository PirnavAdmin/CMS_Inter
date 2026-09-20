namespace CollegeManagement.API.Dtos.Transport.Reports
{
    public class PickupPointReportDto
    {
        public long PickupPointId { get; set; }

        public string PickupPointName { get; set; } = string.Empty;

        public string RouteName { get; set; } = string.Empty;

        public int StudentCount { get; set; }
    }
}
