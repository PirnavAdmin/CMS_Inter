using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("GroupPrograms")]
    public class GroupProgram
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int GroupProgramId { get; set; }

        [Required]
        public int GroupId { get; set; }

        [Required]
        public int ProgramId { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        [ForeignKey(nameof(GroupId))]
        public virtual Group Group { get; set; } = null!;

        [ForeignKey(nameof(ProgramId))]
        public virtual AcademicProgram AcademicProgram { get; set; } = null!;
    }
}