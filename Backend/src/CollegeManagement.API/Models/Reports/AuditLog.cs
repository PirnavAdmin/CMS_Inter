using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Reports;

[Table("AuditLogs")]
public class AuditLog
{
    [Key]
    public long AuditLogId { get; set; }
    [MaxLength(150)] public string? UserName { get; set; }
    [MaxLength(100)] public string Action { get; set; } = string.Empty;
    [MaxLength(100)] public string EntityName { get; set; } = string.Empty;
    public int? EntityId { get; set; }
    [MaxLength(1000)] public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}
