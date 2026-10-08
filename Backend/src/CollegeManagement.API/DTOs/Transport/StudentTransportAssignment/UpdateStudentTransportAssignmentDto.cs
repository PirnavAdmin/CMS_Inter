using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CollegeManagement.API.Common;

namespace CollegeManagement.API.Dtos.Transport.StudentTransportAssignment
{
    public class UpdateStudentTransportAssignmentDto
    {
        [JsonPropertyName("admissionNo")]
        public string AdmissionNo { get; set; } = string.Empty;

        [JsonPropertyName("routeId")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long RouteId { get; set; } = 0;

        [JsonPropertyName("pickupPointId")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long PickupPointId { get; set; } = 0;

        [JsonPropertyName("pickupPointName")]
        public string? PickupPointName { get; set; }

        [JsonPropertyName("monthlyFee")]
        public decimal? MonthlyFee { get; set; }

        [JsonPropertyName("studentId")]
        public long? StudentId { get; set; }

        [JsonPropertyName("studentName")]
        public string? StudentName { get; set; }

        [JsonPropertyName("vehicleAssignmentId")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long VehicleAssignmentId { get; set; } = 0;

        [JsonPropertyName("vehicleId")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long VehicleId { get; set; } = 0;

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
