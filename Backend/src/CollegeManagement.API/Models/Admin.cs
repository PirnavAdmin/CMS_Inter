using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("admins")]
    public class Admin
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [StringLength(150)]
        [Column("FullName")]
        public string FullName { get; set; } = "Administrator";

        [Required]
        [EmailAddress]
        [StringLength(255)]
        [Column("Email")]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(255)]
        [Column("Password")]
        public string Password { get; set; } = string.Empty;

        [StringLength(20)]
        [Column("PhoneNumber")]
        public string? PhoneNumber { get; set; } = string.Empty;

        [StringLength(500)]
        [Column("PhotoPath")]
        public string? PhotoPath { get; set; }

        [Required]
        [Column("IsActive")]
        public bool IsActive { get; set; } = true;

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("UpdatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
