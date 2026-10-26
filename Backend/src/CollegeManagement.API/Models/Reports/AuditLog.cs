using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Reports;

[Table("AuditLogs")]
public class AuditLog
{
    [Key]
    public long AuditLogId { get; set; }

    [MaxLength(64)]
    public string? EventId { get; set; }

    [MaxLength(64)]
    public string? CorrelationId { get; set; }

    [MaxLength(64)]
    public string? RequestId { get; set; }

    [MaxLength(150)]
    public string? UserName { get; set; }

    [MaxLength(100)]
    public string Action { get; set; } = string.Empty;

    [MaxLength(100)]
    public string EntityName { get; set; } = string.Empty;

    public int? EntityId { get; set; }

    [MaxLength(100)]
    public string? Module { get; set; }

    [MaxLength(20)]
    public string Severity { get; set; } = "Info";

    [MaxLength(30)]
    public string Status { get; set; } = "Success";

    [MaxLength(100)]
    public string? ActorRole { get; set; }

    [MaxLength(50)]
    public string? IpAddress { get; set; }

    [MaxLength(50)]
    public string? RemoteIpAddress { get; set; }

    [MaxLength(50)]
    public string? ForwardedClientIp { get; set; }

    [MaxLength(30)]
    public string IpSource { get; set; } = "Unknown";

    [MaxLength(30)]
    public string IpConfidence { get; set; } = "Unknown";

    [MaxLength(500)]
    public string? UserAgent { get; set; }

    [MaxLength(100)]
    public string? DeviceId { get; set; }

    [MaxLength(100)]
    public string? SessionId { get; set; }

    [MaxLength(10)]
    public string? RequestMethod { get; set; }

    [MaxLength(255)]
    public string? RouteTemplate { get; set; }

    public int? HttpStatusCode { get; set; }

    public double? DurationMs { get; set; }

    public int? UserId { get; set; }

    public int? StaffId { get; set; }

    [MaxLength(30)]
    public string ActorType { get; set; } = "User";

    [Column(TypeName = "longtext")]
    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }
}
