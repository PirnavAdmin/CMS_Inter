using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CollegeManagement.API.Models.Settings;

namespace CollegeManagement.API.Models.Staff
{
    public class StaffBoardAssignment
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StaffId { get; set; }

        [ForeignKey(nameof(StaffId))]
        public virtual Staff Staff { get; set; } = null!;

        [Required]
        public int BoardId { get; set; }

        [ForeignKey(nameof(BoardId))]
        public virtual Board Board { get; set; } = null!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        [StringLength(100)]
        public string? CreatedBy { get; set; }
    }
}
