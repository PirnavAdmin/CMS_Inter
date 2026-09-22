using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Marks
{
    public class GlobalApprovalRequestDto
    {
        public int? BoardId { get; set; }

        [Required(ErrorMessage = "AcademicYearId is required.")]
        public int AcademicYearId { get; set; }

        public int? AcademicLevelId { get; set; }

        [Required(ErrorMessage = "GroupId is required.")]
        public int GroupId { get; set; }

        public int? SectionId { get; set; }

        [Required(ErrorMessage = "ExaminationId is required.")]
        public int ExaminationId { get; set; }

        public int? ApprovedBy { get; set; }
    }
}
