using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Fee;

/// <summary>
/// Represents a college receiving bank account affiliated with a specific campus.
/// Multiple accounts can be configured per campus, with one active receiving account.
/// </summary>
[Table("CampusBankAccounts")]
public class CampusBankAccount
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int CampusId { get; set; }

    [Required, MaxLength(200)]
    public string BankName { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string AccountHolderName { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string AccountNumber { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string IfscCode { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? BranchName { get; set; }

    [Required, MaxLength(50)]
    public string AccountType { get; set; } = "Current";

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public int? CreatedByUserId { get; set; }

    public int? UpdatedByUserId { get; set; }
}
