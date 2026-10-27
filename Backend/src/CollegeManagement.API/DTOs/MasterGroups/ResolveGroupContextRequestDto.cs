using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.MasterGroups
{
    public class ResolveGroupContextRequestDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Valid MasterGroupId is required")]
        public int MasterGroupId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Valid BoardId is required")]
        public int BoardId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Valid AcademicYearId is required")]
        public int AcademicYearId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Valid AcademicLevelId is required")]
        public int AcademicLevelId { get; set; }
    }
}
