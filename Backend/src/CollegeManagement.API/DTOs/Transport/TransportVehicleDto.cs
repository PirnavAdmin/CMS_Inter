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
    public int? CampusId { get; set; }
    public string? CampusName { get; set; }
}

public class CreateTransportVehicleDto
{
    private string? _registrationNumber;
    private string? _regNumber;
    private int? _capacity;
    private int? _seatingCapacity;

    public string VehicleNumber { get; set; } = string.Empty;
    public string RegistrationNumber
    {
        get => !string.IsNullOrWhiteSpace(_registrationNumber) ? _registrationNumber!
             : !string.IsNullOrWhiteSpace(_regNumber) ? _regNumber!
             : VehicleNumber;
        set => _registrationNumber = value?.Trim();
    }
    public string? RegNumber
    {
        get => RegistrationNumber;
        set => _regNumber = value?.Trim();
    }
    public string VehicleType { get; set; } = "Bus";
    public int Capacity
    {
        get => (_capacity.HasValue && _capacity.Value > 0) ? _capacity.Value
             : (_seatingCapacity.HasValue && _seatingCapacity.Value > 0) ? _seatingCapacity.Value
             : (_capacity ?? _seatingCapacity ?? 40);
        set => _capacity = value;
    }
    public int? SeatingCapacity
    {
        get => Capacity;
        set => _seatingCapacity = value;
    }
    public bool IsAC { get; set; } = true;
    public string Status { get; set; } = "Active";
    public int? CampusId { get; set; }
    public int? CollegeId { get; set; }
}
