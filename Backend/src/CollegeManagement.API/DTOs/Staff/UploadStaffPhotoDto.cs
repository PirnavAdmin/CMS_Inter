using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.DTOs.Staff
{
    public class UploadStaffPhotoDto
    {
        public int StaffId { get; set; }

        public int FacultyId
        {
            get => StaffId;
            set => StaffId = value;
        }

        public int Id
        {
            get => StaffId;
            set => StaffId = value;
        }

        public IFormFile? Photo { get; set; }
        public IFormFile? File { get; set; }
        public IFormFile? ProfilePhoto { get; set; }

        public IFormFile? GetFile() => Photo ?? File ?? ProfilePhoto;
    }
}

