using System.Text.Json.Serialization;
using CollegeManagement.API.Common;

namespace CollegeManagement.API.Dtos.Transport.Reports
{
    public class ReportFilterDto
    {
        [JsonPropertyName("fromDate")]
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
        public DateTime? FromDate { get; set; }

        [JsonPropertyName("toDate")]
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
        public DateTime? ToDate { get; set; }

        [JsonPropertyName("routeId")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long? RouteId { get; set; }

        [JsonPropertyName("vehicleId")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long? VehicleId { get; set; }

        [JsonPropertyName("driverId")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long? DriverId { get; set; }

        [JsonPropertyName("search")]
        public string? Search { get; set; }

        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("reportType")]
        public string? ReportType { get; set; }
    }
}
