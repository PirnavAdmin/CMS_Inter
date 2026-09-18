namespace CollegeManagement.API.Models;

using System;
using System.ComponentModel.DataAnnotations;

public class TransportTrip
{
    [Key]
    public long TripId { get; set; }

    public long? AssignmentId { get; set; }

    public long VehicleId { get; set; }

    public long RouteId { get; set; }

    public long DriverId { get; set; }

    public long? AttendantId { get; set; }

    public string TripType { get; set; } = "Morning";

    public DateTime TripDate { get; set; } = DateTime.UtcNow.Date;

    public string? StartTime { get; set; }

    public string? EndTime { get; set; }

    public int StudentsPresent { get; set; } = 0;

    public string Status { get; set; } = "Running";

    public bool IsDeleted { get; set; } = false;

    public long? CreatedBy { get; set; }

    public long? UpdatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
