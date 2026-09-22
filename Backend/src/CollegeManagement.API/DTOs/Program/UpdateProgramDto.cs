using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Program
{
    public class UpdateProgramDto
    {
        [Required]
        [StringLength(100)]
        public string ProgramName { get; set; } = string.Empty;

        public bool IsActive { get; set; }
    }
}