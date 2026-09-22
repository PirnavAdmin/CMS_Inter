namespace CollegeManagement.API.Models;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

public class TransportVehicle
{
    [Key]
    public long VehicleId { get; set; }

    public string? VehicleNumber { get; set; }
    public string? RegistrationNumber { get; set; }

    public string? VehicleName { get; set; }
    public string? VehicleType { get; set; }
    public string? Manufacturer { get; set; }
    public string? Model { get; set; }
    public string? ChassisNumber { get; set; }
    public string? EngineNumber { get; set; }
    public string? GpsDeviceId { get; set; }
    public string? InsuranceNumber { get; set; }
    public DateTime? InsuranceExpiry { get; set; }
    public DateTime? PollutionExpiry { get; set; }
    public DateTime? FitnessExpiry { get; set; }
    public int Capacity { get; set; } = 40;
    public bool IsAC { get; set; } = true;

    public bool Status { get; set; } = true;
    public bool IsDeleted { get; set; } = false;
    public long? CreatedBy { get; set; }
    public long? UpdatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<TransportRoute> Routes { get; set; } = new List<TransportRoute>();
    public ICollection<TransportDriver> Drivers { get; set; } = new List<TransportDriver>();
}

