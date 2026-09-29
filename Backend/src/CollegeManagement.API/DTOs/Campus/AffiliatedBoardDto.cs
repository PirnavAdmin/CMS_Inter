using System.Text.Json.Serialization;

namespace CollegeManagement.API.DTOs.Campus
{
    public class AffiliatedBoardDto
    {
        [JsonPropertyName("boardId")]
        public int BoardId { get; set; }

        [JsonPropertyName("boardCode")]
        public string BoardCode { get; set; } = string.Empty;

        [JsonPropertyName("boardName")]
        public string BoardName { get; set; } = string.Empty;

        [JsonPropertyName("boardType")]
        public string? BoardType { get; set; }

        [JsonPropertyName("isActive")]
        public bool IsActive { get; set; } = true;
    }
}
