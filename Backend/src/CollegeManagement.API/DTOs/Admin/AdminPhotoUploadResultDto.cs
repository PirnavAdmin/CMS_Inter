namespace CollegeManagement.API.DTOs.Admin
{
    public class AdminPhotoUploadResultDto
    {
        public bool Status { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? PhotoUrl { get; set; }
        public int AdminId { get; set; }
    }
}
