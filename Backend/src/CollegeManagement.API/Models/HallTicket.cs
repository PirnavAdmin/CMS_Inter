using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("HallTickets")]
    public class HallTicket
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int HallTicketId { get; set; }

        [Required]
        public int ExaminationId { get; set; }

        [Required]
        public int StudentId { get; set; }

        public int BatchId { get; set; }

        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        [ForeignKey(nameof(ExaminationId))]
        public Examination? Examination { get; set; }

        [ForeignKey(nameof(StudentId))]
        public Student? Student { get; set; }
    }
}