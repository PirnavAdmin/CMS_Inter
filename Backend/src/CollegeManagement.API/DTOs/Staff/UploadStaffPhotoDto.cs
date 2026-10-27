using System.Collections.Generic;
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

        private IFormFile? _photo;

        public IFormFile? Photo
        {
            get => _photo;
            set => _photo = value ?? _photo;
        }

        public IFormFile? File
        {
            get => _photo;
            set => _photo = value ?? _photo;
        }
    }
}
