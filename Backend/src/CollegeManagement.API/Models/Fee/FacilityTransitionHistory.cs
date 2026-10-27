using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Fee
{
    [Table("facility_transition_histories")]
    public class FacilityTransitionHistory
    {
        [Key]
        public int TransitionId { get; set; }

        [Required]
        public int StudentId { get; set; }

        [Required, MaxLength(50)]
        public string FromFacility { get; set; } = "Hostel";

        [Required, MaxLength(50)]
        public string ToFacility { get; set; } = "Transport";

        [Required]
        public DateTime TransitionDate { get; set; }

        public int MonthsUsedFromFacility { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal ProratedFromFee { get; set; }

        public int MonthsUsedToFacility { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal ProratedToFee { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal ExcessCreditTransferred { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal PreviousTotalFee { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal NewTotalFee { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal PreviousBalance { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal NewBalance { get; set; }

        [MaxLength(500)]
        public string? Remarks { get; set; }

        [MaxLength(100)]
        public string? PerformedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(StudentId))]
        public Student? Student { get; set; }
    }
}
