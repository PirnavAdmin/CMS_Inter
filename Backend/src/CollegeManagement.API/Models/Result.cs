using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Represents a student's examination result in the College Management System.
    /// </summary>
    [Table("Results")]
    public class Result
    {
        /// <summary>
        /// Gets or sets the unique identifier of the result.
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int ResultId { get; set; }

        /// <summary>
        /// Gets or sets the student identifier.
        /// </summary>
        [Required]
        public int StudentId { get; set; }

        /// <summary>
        /// Gets or sets the board identifier.
        /// </summary>
        [Required]
        public int BoardId { get; set; }

        /// <summary>
        /// Gets or sets the academic year identifier.
        /// </summary>
        [Required]
        public int AcademicYearId { get; set; }

        /// <summary>
        /// Gets or sets the academic level identifier.
        /// </summary>
        [Required]
        public int AcademicLevelId { get; set; }

        /// <summary>
        /// Gets or sets the group identifier.
        /// </summary>
        [Required]
        public int GroupId { get; set; }

        /// <summary>
        /// Gets or sets the examination identifier.
        /// </summary>
        [Required]
        public int ExamId { get; set; }

        /// <summary>
        /// Gets or sets the subject identifier.
        /// </summary>
        [Required]
        public int SubjectId { get; set; }

        /// <summary>
        /// Gets or sets the internal marks.
        /// </summary>
        [Required]
        [Column(TypeName = "decimal(5,2)")]
        public decimal InternalMarks { get; set; }

        /// <summary>
        /// Gets or sets the practical marks.
        /// </summary>
        [Column(TypeName = "decimal(5,2)")]
        public decimal PracticalMarks { get; set; }

        /// <summary>
        /// Gets or sets the external marks.
        /// </summary>
        [Required]
        [Column(TypeName = "decimal(5,2)")]
        public decimal ExternalMarks { get; set; }

        /// <summary>
        /// Gets or sets the total marks.
        /// </summary>
        [Required]
        [Column(TypeName = "decimal(5,2)")]
        public decimal TotalMarks { get; set; }

        /// <summary>
        /// Gets or sets the grade obtained.
        /// </summary>
        [Required]
        [MaxLength(10)]
        public string Grade { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the examination result.
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string ResultStatus { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the rank obtained.
        /// </summary>
        public int? Rank { get; set; }

        /// <summary>
        /// Gets or sets the publish date.
        /// </summary>
        public DateTime? PublishedDate { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the result is published.
        /// </summary>
        public bool IsPublished { get; set; }

        /// <summary>
        /// Gets or sets the created date.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the updated date.
        /// </summary>
        public DateTime? UpdatedAt { get; set; }

        // Navigation Properties

        [ForeignKey(nameof(StudentId))]
        public virtual Student Student { get; set; } = null!;

        [ForeignKey(nameof(BoardId))]
        public virtual Board Board { get; set; } = null!;

        [ForeignKey(nameof(AcademicYearId))]
        public virtual AcademicYear AcademicYear { get; set; } = null!;

        [ForeignKey(nameof(AcademicLevelId))]
        public virtual AcademicLevel AcademicLevel { get; set; } = null!;

        [ForeignKey(nameof(GroupId))]
        public virtual Group Group { get; set; } = null!;

        [ForeignKey(nameof(ExamId))]
        public virtual Examination Examination { get; set; } = null!;

        [ForeignKey(nameof(SubjectId))]
        public virtual Subject Subject { get; set; } = null!;
    }
}