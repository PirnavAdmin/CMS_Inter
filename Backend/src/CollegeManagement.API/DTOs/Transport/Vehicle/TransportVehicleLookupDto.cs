namespace CollegeManagement.API.Dtos.Transport.Vehicle
{
    public class TransportVehicleLookupDto
    {
        public long VehicleId { get; set; }

        public string VehicleNumber { get; set; } = string.Empty;

        public string VehicleName { get; set; } = string.Empty;

        public string RegistrationNumber { get; set; } = string.Empty;
    }
}
