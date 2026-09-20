using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.VehicleMaintenance
{
    public class VehicleMaintenanceDto
    {
        [JsonPropertyName("id")]
        public string Id => MaintenanceId > 0 ? MaintenanceId.ToString() : "1";

        [JsonPropertyName("maintenanceId")]
        public long MaintenanceId { get; set; }

        [JsonPropertyName("vehicleId")]
        public long VehicleId { get; set; }

        [JsonPropertyName("vehicleNumber")]
        public string VehicleNumber { get; set; } = string.Empty;

        [JsonPropertyName("busNumber")]
        public string BusNumber => VehicleNumber;

        [JsonPropertyName("serviceType")]
        public string ServiceType { get; set; } = string.Empty;

        [JsonPropertyName("serviceDate")]
        public DateTime ServiceDate { get; set; }

        [JsonPropertyName("cost")]
        public decimal Cost { get; set; }

        [JsonPropertyName("vendor")]
        public string? Vendor => VendorCenter;

        [JsonPropertyName("vendorCenter")]
        public string? VendorCenter { get; set; }

        [JsonPropertyName("nextServiceDue")]
        public DateTime? NextServiceDue { get; set; }

        [JsonPropertyName("remarks")]
        public string? Remarks { get; set; }

        [JsonPropertyName("status")]
        public string Status => StatusBool ? "Completed" : "Scheduled";

        [JsonPropertyName("statusText")]
        public string StatusText => Status;

        [JsonPropertyName("statusBool")]
        public bool StatusBool { get; set; }
    }
}
