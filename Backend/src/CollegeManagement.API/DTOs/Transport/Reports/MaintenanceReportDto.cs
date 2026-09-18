using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Reports
{
    public class MaintenanceReportDto
    {
        [JsonPropertyName("maintenanceId")]
        public long MaintenanceId { get; set; }

        [JsonPropertyName("id")]
        public string Id => MaintenanceId > 0 ? MaintenanceId.ToString() : "1";

        [JsonPropertyName("vehicleNumber")]
        public string VehicleNumber { get; set; } = string.Empty;

        [JsonPropertyName("busNumber")]
        public string BusNumber => VehicleNumber;

        [JsonPropertyName("serviceType")]
        public string ServiceType { get; set; } = string.Empty;

        [JsonPropertyName("serviceDate")]
        public DateTime ServiceDate { get; set; }

        [JsonPropertyName("serviceDateString")]
        public string ServiceDateString => ServiceDate.ToString("yyyy-MM-dd");

        [JsonPropertyName("cost")]
        public decimal Cost { get; set; }

        [JsonPropertyName("vendor")]
        public string? Vendor => VendorCenter;

        [JsonPropertyName("vendorCenter")]
        public string? VendorCenter { get; set; }

        [JsonPropertyName("nextServiceDue")]
        public DateTime? NextServiceDue { get; set; }

        [JsonPropertyName("nextServiceDueDate")]
        public string? NextServiceDueDate => NextServiceDue?.ToString("yyyy-MM-dd");

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Completed";
    }
}
