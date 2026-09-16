namespace CollegeManagement.API.Dtos.Transport.Vehicle
{
    public class TransportVehicleFilterDto
    {
        public string? Search { get; set; }

        public string? VehicleType { get; set; }

        public bool? Status { get; set; }

        public string SortBy { get; set; } = "vehicleName";

        public string SortOrder { get; set; } = "asc";

        public int PageNumber { get; set; } = 1;

        public int PageSize { get; set; } = 10;
    }
}
