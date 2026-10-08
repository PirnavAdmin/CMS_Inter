using System;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.StudentTransportAssignment
{
    public class StudentTransportAssignmentDto
    {
        [JsonPropertyName("assignmentId")]
        public long AssignmentId { get; set; }

        [JsonPropertyName("id")]
        public string Id => AssignmentId.ToString();

        [JsonPropertyName("studentId")]
        public long? StudentId { get; set; }

        [JsonPropertyName("studentName")]
        public string? StudentName { get; set; }

        [JsonPropertyName("admissionNo")]
        public string AdmissionNo { get; set; } = string.Empty;

        [JsonPropertyName("routeId")]
        public long RouteId { get; set; }

        [JsonPropertyName("routeName")]
        public string? RouteName { get; set; }

        [JsonPropertyName("pickupPointId")]
        public long PickupPointId { get; set; }

        [JsonPropertyName("pickupPointName")]
        public string? PickupPointName { get; set; }

        [JsonPropertyName("monthlyFee")]
        public decimal? MonthlyFee { get; set; }

        [JsonPropertyName("annualFee")]
        public decimal? AnnualFee => MonthlyFee.HasValue ? MonthlyFee.Value * 10 : null;

        [JsonPropertyName("vehicleAssignmentId")]
        public long VehicleAssignmentId { get; set; }

        [JsonPropertyName("vehicleNumber")]
        public string? VehicleNumber { get; set; }

        [JsonPropertyName("driverName")]
        public string? DriverName { get; set; }

        [JsonPropertyName("effectiveFrom")]
        public DateTime EffectiveFrom { get; set; }

        [JsonPropertyName("effectiveTo")]
        public DateTime? EffectiveTo { get; set; }

        [JsonPropertyName("transportType")]
        public string TransportType { get; set; } = string.Empty;

        [JsonPropertyName("remarks")]
        public string? Remarks { get; set; }

        [JsonPropertyName("status")]
        public bool Status { get; set; }

        [JsonPropertyName("createdBy")]
        public long? CreatedBy { get; set; }

        [JsonPropertyName("updatedBy")]
        public long? UpdatedBy { get; set; }

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("updatedAt")]
        public DateTime? UpdatedAt { get; set; }
    }
}

