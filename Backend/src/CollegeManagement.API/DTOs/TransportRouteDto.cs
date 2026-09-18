namespace CollegeManagement.API.Dtos;

public class TransportRouteDto
{
    public long RouteId { get; set; }
    public string RouteCode { get; set; } = string.Empty;
    public string RouteName { get; set; } = string.Empty;
    public string PickupPoint { get; set; } = string.Empty;
    public string DropPoint { get; set; } = string.Empty;
    public decimal DistanceKm { get; set; } = 0;
    public decimal MonthlyFee { get; set; } = 0;
    public string Status { get; set; } = "Active";
    public long? VehicleId { get; set; }
    public string? VehicleNumber { get; set; }
}

public class CreateTransportRouteDto
{
    public string RouteCode { get; set; } = string.Empty;
    public string RouteName { get; set; } = string.Empty;
    public string PickupPoint { get; set; } = string.Empty;
    public string DropPoint { get; set; } = string.Empty;
    public decimal DistanceKm { get; set; } = 0;
    public decimal MonthlyFee { get; set; } = 0;
    public string Status { get; set; } = "Active";
    public long? VehicleId { get; set; }
}

