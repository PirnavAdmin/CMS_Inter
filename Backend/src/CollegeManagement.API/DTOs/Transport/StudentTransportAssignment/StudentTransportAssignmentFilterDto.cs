namespace CollegeManagement.API.Dtos.Transport.StudentTransportAssignment
{
	public class StudentTransportAssignmentFilterDto
	{
        public string? Search { get; set; }
        public string? AdmissionNo { get; set; }
        public long? RouteId { get; set; }
        public long? PickupPointId { get; set; }
        public long? VehicleAssignmentId { get; set; }
        public string? TransportType { get; set; }
        public bool? Status { get; set; }

        public string? SortBy { get; set; }
        public string? SortOrder { get; set; }

        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
