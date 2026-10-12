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

        private IFormFile? _photo;
        private IFormFile? _file;

        public IFormFile Photo
        {
            get => _photo ?? _file!;
            set => _photo = value;
        }

        public IFormFile? File
        {
            get => _file ?? _photo;
            set => _file = value;
        }
    }
}
