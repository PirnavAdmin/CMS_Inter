namespace CollegeManagement.API.DTOs.Students
{
    public class StudentDocumentUploadResultDto
    {
        public int StudentId { get; set; }
        public string DocumentType { get; set; } = string.Empty;
        public bool Uploaded { get; set; }
        public string DocumentUrl { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}
