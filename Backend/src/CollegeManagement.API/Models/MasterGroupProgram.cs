using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("MasterGroupPrograms")]
    public class MasterGroupProgram
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int MasterGroupProgramId { get; set; }

        [Required]
        public int MasterGroupId { get; set; }

        [Required]
        public int ProgramId { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        [ForeignKey(nameof(MasterGroupId))]
        public virtual MasterGroup MasterGroup { get; set; } = null!;

        [ForeignKey(nameof(ProgramId))]
        public virtual AcademicProgram AcademicProgram { get; set; } = null!;
    }
}
