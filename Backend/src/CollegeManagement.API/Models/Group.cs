using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("Groups")]
    public class Group
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int GroupId { get; set; }

        [Required]
        public int BoardId { get; set; }

        [Required]
        public int AcademicYearId { get; set; }

        [Required]
        public int AcademicLevelId { get; set; }

        [Required]
        [MaxLength(100)]
        public string GroupName { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        public string GroupCode { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        [ForeignKey(nameof(BoardId))]
        public Board? BoardNavigation { get; set; }

        [ForeignKey(nameof(AcademicYearId))]
        public AcademicYear? AcademicYear { get; set; }

        [ForeignKey(nameof(AcademicLevelId))]
        public AcademicLevel? AcademicLevelNavigation { get; set; }
        public virtual ICollection<GroupProgram> GroupPrograms { get; set; }
    = new List<GroupProgram>();
    }
}
