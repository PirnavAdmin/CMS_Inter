using System.Collections.Generic;
namespace CollegeManagement.API.DTOs.Marks
{
    public class BulkUploadMarksDto
    {
        public List<SaveMarkDto> Marks { get; set; } = new List<SaveMarkDto>();
    }
}
