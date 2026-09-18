namespace CollegeManagement.API.Dtos.Transport.StudentTransportAssignment
{
    public class StudentTransportAssignmentLookupDto
    {
        public long StudentTransportAssignmentId { get; set; }

        public long? StudentId { get; set; }
        public string? StudentName { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;

        public long RouteId { get; set; }
        public string? RouteName { get; set; }

        public long PickupPointId { get; set; }
        public string? PickupPointName { get; set; }

        public long VehicleAssignmentId { get; set; }
        public string? VehicleNumber { get; set; }
        public string? DriverName { get; set; }

        public string? DisplayName { get; set; }
    }
}
