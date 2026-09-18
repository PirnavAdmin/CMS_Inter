namespace CollegeManagement.API.Dtos.Transport.StudentTransportAssignment
{
    public class StudentTransportAssignmentDto
    {
        public long StudentTransportAssignmentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;

        public long RouteId { get; set; }
        public string? RouteName { get; set; }

        public long PickupPointId { get; set; }
        public string? PickupPointName { get; set; }

        public long VehicleAssignmentId { get; set; }
        public string? VehicleNumber { get; set; }
        public string? DriverName { get; set; }

        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }

        public string TransportType { get; set; } = string.Empty;
        public string? Remarks { get; set; }
        public bool Status { get; set; }

        public long? CreatedBy { get; set; }
        public long? UpdatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }


    }
}
