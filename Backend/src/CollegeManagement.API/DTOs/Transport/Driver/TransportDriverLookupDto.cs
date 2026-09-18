namespace CollegeManagement.API.Dtos.Transport.Driver
{
    public class TransportDriverLookupDto
    {
        public long DriverId { get; set; }

        public string DriverName { get; set; } = string.Empty;

        public string MobileNumber { get; set; } = string.Empty;

        public string LicenceNumber { get; set; } = string.Empty;
    }
}
