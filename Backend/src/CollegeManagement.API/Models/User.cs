using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CollegeManagement.API.Models.Staff;

namespace CollegeManagement.API.Models
{
    [Table("Users")]
    public class User
    {
        [Key]
        public int UserId { get; set; }

        [Required]
        [StringLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(255)]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [StringLength(15)]
        [Phone]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required]
        public int RoleId { get; set; }

        [ForeignKey(nameof(RoleId))]
        public Role Role { get; set; } = null!;

        // Domain Links
        public int? StudentId { get; set; }

        [ForeignKey(nameof(StudentId))]
        public Student? Student { get; set; }

        public int? StaffId { get; set; }

        [ForeignKey(nameof(StaffId))]
        public CollegeManagement.API.Models.Staff.Staff? Staff { get; set; }

        public int? AdminId { get; set; }

        [ForeignKey(nameof(AdminId))]
        public Admin? Admin { get; set; }

        // Lifecycle & Status
        public bool IsFirstLogin { get; set; } = true;

        public DateTime? LastLogin { get; set; }

        public bool IsActive { get; set; } = true;

        // Audit Timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}