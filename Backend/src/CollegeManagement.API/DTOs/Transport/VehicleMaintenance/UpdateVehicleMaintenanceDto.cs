using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CollegeManagement.API.Common;

namespace CollegeManagement.API.Dtos.Transport.VehicleMaintenance
{
    public class UpdateVehicleMaintenanceDto
    {
        private string? _vendorCenter;
        private DateTime _serviceDate = DateTime.UtcNow;

        [JsonPropertyName("vehicleId")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long VehicleId { get; set; } = 1;

        [JsonPropertyName("selectFleetVehicle")]
        public string? SelectFleetVehicle
        {
            get => VehicleId.ToString();
            set { if (long.TryParse(value, out var id)) VehicleId = id; }
        }

        [JsonPropertyName("fleetVehicle")]
        public string? FleetVehicle
        {
            get => VehicleId.ToString();
            set { if (long.TryParse(value, out var id)) VehicleId = id; }
        }

        [JsonPropertyName("serviceType")]
        public string ServiceType { get; set; } = "General Service";

        [JsonPropertyName("serviceDate")]
        public DateTime ServiceDate
        {
            get => _serviceDate;
            set => _serviceDate = value != default ? value : DateTime.UtcNow;
        }

        [JsonPropertyName("serviceDateString")]
        public string? ServiceDateString
        {
            get => ServiceDate.ToString("yyyy-MM-dd");
            set { if (DateTime.TryParse(value, out var d)) ServiceDate = d; }
        }

        [JsonPropertyName("cost")]
        public decimal Cost { get; set; } = 0;

        [JsonPropertyName("vendor")]
        public string? Vendor
        {
            get => _vendorCenter;
            set => _vendorCenter = value;
        }

        [JsonPropertyName("vendorCenter")]
        public string? VendorCenter
        {
            get => _vendorCenter;
            set => _vendorCenter = value;
        }

        [JsonPropertyName("nextServiceDue")]
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
        public DateTime? NextServiceDue { get; set; }

        [JsonPropertyName("nextServiceDueDate")]
        public string? NextServiceDueDate
        {
            get => NextServiceDue?.ToString("yyyy-MM-dd");
            set { if (DateTime.TryParse(value, out var d)) NextServiceDue = d; }
        }

        [JsonPropertyName("remarks")]
        public string? Remarks { get; set; }

        [JsonPropertyName("status")]
        [JsonConverter(typeof(FlexibleBoolConverter))]
        public bool Status { get; set; } = true;
    }
}
