namespace CollegeManagement.API.Dtos.Transport.VehicleAssignment
{
    public class TransportVehicleAssignmentLookupDto
    {
        public long AssignmentId { get; set; }

        public string RouteName { get; set; } = string.Empty;

        public string VehicleNumber { get; set; } = string.Empty;

        public string DriverName { get; set; } = string.Empty;
    }
}
