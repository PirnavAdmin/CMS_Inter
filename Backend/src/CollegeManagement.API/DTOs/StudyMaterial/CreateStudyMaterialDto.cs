using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.StudyMaterial
{
    public class CreateStudyMaterialDto
    {
        [Required]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Subject { get; set; } = string.Empty;

        [Required]
        public string Faculty { get; set; } = string.Empty;

        [Required]
        public string FilePath { get; set; } = string.Empty;
    }
}