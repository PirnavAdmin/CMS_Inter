namespace CollegeManagement.API.Dtos.Transport.Reports
{
    public class VehicleStudentReportDto
    {
        public long VehicleId { get; set; }

        public string VehicleNumber { get; set; } = string.Empty;

        public string VehicleName { get; set; } = string.Empty;

        public int Capacity { get; set; }

        public int AssignedStudents { get; set; }

        public int AvailableSeats { get; set; }

        public decimal OccupancyPercentage { get; set; }
    }
}
