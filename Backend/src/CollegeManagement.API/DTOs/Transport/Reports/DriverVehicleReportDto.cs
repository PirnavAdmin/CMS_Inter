namespace CollegeManagement.API.Dtos.Transport.Reports
{
    public class DriverVehicleReportDto
    {
        public long DriverId { get; set; }

        public string DriverName { get; set; } = string.Empty;

        public string VehicleNumber { get; set; } = string.Empty;

        public string RouteName { get; set; } = string.Empty;
    }
}
