namespace CollegeManagement.API.Dtos.Transport.VehicleMaintenance
{
    public class VehicleMaintenanceFilterDto
    {
        public string? Search { get; set; }

        public long? VehicleId { get; set; }

        public DateTime? FromDate { get; set; }

        public DateTime? ToDate { get; set; }

        public bool? Status { get; set; }

        public string SortBy { get; set; } = "ServiceDate";

        public string SortOrder { get; set; } = "desc";

        public int PageNumber { get; set; } = 1;

        public int PageSize { get; set; } = 10;
    }
}
