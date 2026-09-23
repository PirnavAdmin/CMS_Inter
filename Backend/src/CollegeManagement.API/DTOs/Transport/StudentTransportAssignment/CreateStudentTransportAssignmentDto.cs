using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CollegeManagement.API.Common;

namespace CollegeManagement.API.Dtos.Transport.StudentTransportAssignment
{
    public class CreateStudentTransportAssignmentDto
    {
        [JsonPropertyName("admissionNo")]
        public string AdmissionNo { get; set; } = string.Empty;

        [JsonPropertyName("routeId")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long RouteId { get; set; } = 1;

        [JsonPropertyName("pickupPointId")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long PickupPointId { get; set; } = 1;

        [JsonPropertyName("vehicleAssignmentId")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long VehicleAssignmentId { get; set; } = 1;

        [JsonPropertyName("vehicleId")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long VehicleId { get; set; } = 1;

        [JsonPropertyName("effectiveFrom")]
        public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;

        [JsonPropertyName("effectiveTo")]
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
        public DateTime? EffectiveTo { get; set; }

        [JsonPropertyName("transportType")]
        public string TransportType { get; set; } = "Both";

        [JsonPropertyName("remarks")]
        public string? Remarks { get; set; }

        [JsonPropertyName("status")]
        [JsonConverter(typeof(FlexibleBoolConverter))]
        public bool Status { get; set; } = true;
    }
}
