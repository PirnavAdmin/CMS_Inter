using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Represents a student's revaluation request.
    /// </summary>
    [Table("Revaluations")]
    public class Revaluation
    {
        /// <summary>
        /// Gets or sets the unique identifier of the revaluation request.
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int RevaluationId { get; set; }

        /// <summary>
        /// Gets or sets the result identifier associated with the revaluation request.
        /// </summary>
        [Required]
        public int ResultId { get; set; }

        /// <summary>
        /// Gets or sets the student identifier.
        /// </summary>
        [Required]
        public int StudentId { get; set; }

        /// <summary>
        /// Gets or sets the subject identifier for which revaluation is requested.
        /// </summary>
        [Required]
        public int SubjectId { get; set; }

        /// <summary>
        /// Gets or sets the reason for requesting revaluation.
        /// </summary>
        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the marks before revaluation.
        /// </summary>
        [Required]
        [Column(TypeName = "decimal(5,2)")]
        [Range(0, 1000)]
        public decimal OldMarks { get; set; }

        /// <summary>
        /// Gets or sets the marks after revaluation.
        /// </summary>
        [Column(TypeName = "decimal(5,2)")]
        [Range(0, 1000)]
        public decimal? NewMarks { get; set; }

        /// <summary>
        /// Gets or sets whether the revaluation fee has been paid.
        /// </summary>
        public bool FeePaid { get; set; }

        /// <summary>
        /// Gets or sets the date when the revaluation request was submitted.
        /// </summary>
        public DateTime RequestedDate { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the identifier of the person who reviewed the request.
        /// </summary>
        public int? ReviewedBy { get; set; }

        /// <summary>
        /// Gets or sets the date when the revaluation request was reviewed.
        /// </summary>
        public DateTime? ReviewedDate { get; set; }

        /// <summary>
        /// Gets or sets the current status of the revaluation request.
        /// </summary>
        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = "Pending";

        /// <summary>
        /// Gets or sets the remarks provided during the review.
        /// </summary>
        [MaxLength(500)]
        public string? Remarks { get; set; }

        /// <summary>
        /// Gets or sets the date when the revaluation record was created.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the date when the revaluation record was last updated.
        /// </summary>
        public DateTime? UpdatedAt { get; set; }

        // Navigation Properties

        /// <summary>
        /// Gets or sets the associated result.
        /// </summary>
        [ForeignKey(nameof(ResultId))]
        public virtual Result Result { get; set; } = null!;

        /// <summary>
        /// Gets or sets the associated student.
        /// </summary>
        [ForeignKey(nameof(StudentId))]
        public virtual Student Student { get; set; } = null!;
    }
}

