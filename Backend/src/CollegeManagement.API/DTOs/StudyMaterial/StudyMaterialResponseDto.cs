namespace CollegeManagement.API.DTOs.StudyMaterial
{
    public class StudyMaterialResponseDto
    {
        public int StudyMaterialId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Subject { get; set; } = string.Empty;

        public string Faculty { get; set; } = string.Empty;

        public string FilePath { get; set; } = string.Empty;

        public DateTime UploadedAt { get; set; }
    }
}