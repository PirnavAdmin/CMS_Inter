using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.DTOs.Admin
{
    public class AdminPhotoUploadRequest
    {
        public IFormFile? File { get; set; }
        public IFormFile? Photo { get; set; }
    }
}
