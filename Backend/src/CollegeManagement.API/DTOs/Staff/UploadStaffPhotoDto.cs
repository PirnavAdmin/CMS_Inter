using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.DTOs.Staff
{
    public class UploadStaffPhotoDto
    {
        [Required(ErrorMessage = "Staff ID is required.")]
        public int StaffId { get; set; }

        public int FacultyId
        {
            get => StaffId;
            set => StaffId = value;
        }

        [Required(ErrorMessage = "Photo file is required.")]
        public IFormFile Photo { get; set; } = null!;
    }
}
