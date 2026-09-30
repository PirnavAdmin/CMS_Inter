using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("ParentStudentMappings")]
    public class ParentStudentMapping
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ParentUserId { get; set; }

        [ForeignKey(nameof(ParentUserId))]
        public User? ParentUser { get; set; }

        [Required]
        public int StudentId { get; set; }

        [ForeignKey(nameof(StudentId))]
        public Student? Student { get; set; }

        [MaxLength(50)]
        public string RelationshipType { get; set; } = "Parent";

        public bool IsPrimaryContact { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
