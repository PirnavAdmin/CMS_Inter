namespace CollegeManagement.API.Dtos.Transport.Reports
{
    public class MonthlyMaintenanceCostDto
    {
        public int Year { get; set; }

        public int Month { get; set; }

        public string MonthName { get; set; } = string.Empty;

        public int ServiceCount { get; set; }

        public decimal TotalCost { get; set; }
    }
}
