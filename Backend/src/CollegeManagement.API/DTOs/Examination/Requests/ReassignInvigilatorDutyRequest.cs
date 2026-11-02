using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class ReassignInvigilatorDutyRequest
    {
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "A valid staff ID must be provided.")]
        public int NewStaffId { get; set; }

        public string? HallNumber { get; set; }

        public string? Reason { get; set; }
    }
}
