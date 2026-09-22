using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Reports
{
    public class DashboardReportMetricCardDto
    {
        [JsonPropertyName("fleetSize")]
        public int FleetSize { get; set; } = 5;

        [JsonPropertyName("activeVehicles")]
        public string ActiveVehicles { get; set; } = "5 Active";

        [JsonPropertyName("activeRoutes")]
        public int ActiveRoutes { get; set; } = 7;

        [JsonPropertyName("configuredRoutes")]
        public string ConfiguredRoutes { get; set; } = "Configured";

        [JsonPropertyName("activeDrivers")]
        public int ActiveDrivers { get; set; } = 2;

        [JsonPropertyName("licensedStaff")]
        public string LicensedStaff { get; set; } = "Licensed Staff";

        [JsonPropertyName("transportStudents")]
        public int TransportStudents { get; set; } = 0;

        [JsonPropertyName("occupancy")]
        public string Occupancy { get; set; } = "0% Occupancy";

        [JsonPropertyName("maintenanceUnits")]
        public int MaintenanceUnits { get; set; } = 0;

        [JsonPropertyName("inService")]
        public string InService { get; set; } = "In Service";

        [JsonPropertyName("seatUtilization")]
        public string SeatUtilization { get; set; } = "0%";

        [JsonPropertyName("utilizationRatio")]
        public string UtilizationRatio { get; set; } = "0/192 Seats";
    }

    public class DashboardReportRowDto
    {
        [JsonPropertyName("metric")]
        public string Metric { get; set; } = string.Empty;

        [JsonPropertyName("value")]
        public string Value { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;
    }

    public class TransportDashboardReportResponseDto
    {
        [JsonPropertyName("summary")]
        public DashboardReportMetricCardDto Summary { get; set; } = new();

        [JsonPropertyName("metrics")]
        public List<DashboardReportRowDto> Metrics { get; set; } = new();
    }
}

