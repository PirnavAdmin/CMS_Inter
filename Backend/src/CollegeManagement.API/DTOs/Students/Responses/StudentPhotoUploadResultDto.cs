namespace CollegeManagement.API.DTOs.Students
{
    public class StudentPhotoUploadResultDto
    {
        public int StudentId { get; set; }
        public bool Uploaded { get; set; }
        public string PhotoUrl { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}
