namespace CollegeManagement.API.Dtos.Transport.Dashboard
{
    public class MaintenanceDueDto
    {
        public long MaintenanceId { get; set; }

        public long VehicleId { get; set; }

        public string VehicleNumber { get; set; } = string.Empty;

        public string ServiceType { get; set; } = string.Empty;

        public DateTime NextServiceDue { get; set; }

        public int DaysRemaining { get; set; }
    }
}
