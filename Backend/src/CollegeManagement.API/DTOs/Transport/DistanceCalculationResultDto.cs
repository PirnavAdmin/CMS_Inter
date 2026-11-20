namespace CollegeManagement.API.Dtos.Transport
{
    public class DistanceCalculationResultDto
    {
        public bool Success { get; set; }
        public double DistanceKm { get; set; }
        public string? OriginResolved { get; set; }
        public string? DestinationResolved { get; set; }
        public string? Message { get; set; }
    }
}
