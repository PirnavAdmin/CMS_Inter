using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models;

[Table("certificates")]
public class Certificate
{
    [Key]
    [Column("Id")]
    public int CertificateId { get; set; }

    [Required]
    [MaxLength(40)]
    [Column("CertificateNo")]
    public string CertificateNumber { get; set; } = string.Empty;

    [Required]
    public int StudentId { get; set; }

    [MaxLength(30)]
    public string? AdmissionNo { get; set; }

    [MaxLength(150)]
    public string? StudentName { get; set; }

    [MaxLength(100)]
    public string? GroupName { get; set; }

    [MaxLength(100)]
    public string? AcademicLevel { get; set; }

    [MaxLength(50)]
    public string? AcademicYear { get; set; }

    [Required]
    [MaxLength(100)]
    public string CertificateType { get; set; } = string.Empty;

    [Required]
    [MaxLength(250)]
    public string Purpose { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Remarks { get; set; }

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Generated";

    public DateTime? RequestDate { get; set; }

    public DateTime? IssueDate { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? GeneratedAt { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public DateTime? IssuedAt { get; set; }

    [MaxLength(150)]
    public string? IssuedBy { get; set; }

    public bool? IsVerified { get; set; }

    public bool IsActive { get; set; } = true;

    [ForeignKey(nameof(StudentId))]
    public Student? Student { get; set; }
}