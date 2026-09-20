namespace CollegeManagement.API.Dtos;

public class TransportDriverDto
{
    public long DriverId { get; set; }
    public string DriverName { get; set; } = string.Empty;
    public string LicenseNumber { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public long? AssignedVehicleId { get; set; }
    public string? AssignedVehicleNumber { get; set; }
}

public class CreateTransportDriverDto
{
    public string DriverName { get; set; } = string.Empty;
    public string LicenseNumber { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public long? AssignedVehicleId { get; set; }
}

