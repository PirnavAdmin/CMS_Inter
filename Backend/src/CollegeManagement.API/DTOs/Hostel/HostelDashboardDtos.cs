namespace CollegeManagement.API.DTOs.Hostel
{
    public class HostelDashboardResponseDto
    {
        public int TotalHostels { get; set; }

        public int TotalRooms { get; set; }

        public int TotalBeds { get; set; }

        public int OccupiedBeds { get; set; }

        public int AvailableBeds { get; set; }

        public int ActiveStudents { get; set; }

        public int ActiveWardens { get; set; }

        public decimal OccupancyPercentage { get; set; }

        public IEnumerable<HostelBlockDashboardDto> Blocks { get; set; }
            = new List<HostelBlockDashboardDto>();
    }

    public class HostelBlockDashboardDto
    {
        public int HostelId { get; set; }

        public string? HostelName { get; set; }

        public string? HostelCode { get; set; }

        public string? HostelType { get; set; }

        public int TotalRooms { get; set; }

        public int TotalBeds { get; set; }

        public int OccupiedBeds { get; set; }

        public int AvailableBeds { get; set; }

        public int ActiveStudents { get; set; }

        public int ActiveWardens { get; set; }

        public decimal OccupancyPercentage { get; set; }
    }
}