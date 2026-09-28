using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("Campuses")]
    public class Campus
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int CampusId { get; set; }

        [Required]
        [MaxLength(150)]
        public string CampusName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string CampusCode { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Address { get; set; }

        [MaxLength(50)]
        public string? ContactPhone { get; set; }

        [MaxLength(150)]
        [EmailAddress]
        public string? Email { get; set; }

        public bool IsHQ { get; set; } = false;

        public bool IsActive { get; set; } = true;

        public int DisplayOrder { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation Properties
        public virtual ICollection<CampusBoard> CampusBoards { get; set; } = new List<CampusBoard>();
        public virtual ICollection<Student> Students { get; set; } = new List<Student>();
    }
}
