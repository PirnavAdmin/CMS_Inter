namespace CollegeManagement.API.Dtos.Transport.Dashboard
{
    public class VehicleOccupancyDto
    {
        public long VehicleId { get; set; }

        public string VehicleNumber { get; set; } = string.Empty;

        public int Capacity { get; set; }

        public int AssignedStudents { get; set; }

        public int AvailableSeats { get; set; }

        public decimal OccupancyPercentage { get; set; }
    }
}
