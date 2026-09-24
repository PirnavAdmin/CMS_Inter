namespace CollegeManagement.API.Models;

using System;
using System.ComponentModel.DataAnnotations;

public class TransportRoute
{
    [Key]
    public long RouteId { get; set; }

    public int? CampusId { get; set; } = 1;

    public string? RouteCode { get; set; }

    public string? RouteName { get; set; }

    public string? StartLocation { get; set; }
    public string? EndLocation { get; set; }
    public string? PickupPoint { get; set; }
    public string? DropPoint { get; set; }
    public decimal DistanceKm { get; set; } = 0;
    public int EstimatedDurationMinutes { get; set; } = 30;
    public string? Description { get; set; }
    public decimal MonthlyFee { get; set; } = 0;

    public decimal MinRangeKm { get; set; } = 5;
    public decimal NonAcBaseFare { get; set; } = 1000;
    public decimal NonAcRatePerKm { get; set; } = 100;
    public decimal AcBaseFare { get; set; } = 1200;
    public decimal AcRatePerKm { get; set; } = 150;

    public bool Status { get; set; } = true;
    public bool IsDeleted { get; set; } = false;
    public long? CreatedBy { get; set; }
    public long? UpdatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public long? VehicleId { get; set; }
    public TransportVehicle? Vehicle { get; set; }
}
