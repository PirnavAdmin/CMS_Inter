namespace CollegeManagement.API.Dtos;

public class TransportVehicleDto
{
    public long VehicleId { get; set; }
    public string VehicleNumber { get; set; } = string.Empty;
    public string RegistrationNumber { get; set; } = string.Empty;
    public string VehicleType { get; set; } = "Bus";
    public int Capacity { get; set; } = 40;
    public bool IsAC { get; set; } = true;
    public string Status { get; set; } = "Active";
    public string StatusText { get; set; } = "Active";
}

public class CreateTransportVehicleDto
{
    public string VehicleNumber { get; set; } = string.Empty;
    public string RegistrationNumber { get; set; } = string.Empty;
    public string VehicleType { get; set; } = "Bus";
    public int Capacity { get; set; } = 40;
    public bool IsAC { get; set; } = true;
    public string Status { get; set; } = "Active";
}

