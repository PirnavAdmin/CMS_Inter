using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("MasterGroups")]
    public class MasterGroup
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int MasterGroupId { get; set; }

        [Required]
        public int BoardId { get; set; }

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
        public virtual Board? BoardNavigation { get; set; }

        public virtual ICollection<MasterGroupProgram> MasterGroupPrograms { get; set; }
            = new List<MasterGroupProgram>();

        public virtual ICollection<Group> ContextualGroups { get; set; }
            = new List<Group>();
    }
}
