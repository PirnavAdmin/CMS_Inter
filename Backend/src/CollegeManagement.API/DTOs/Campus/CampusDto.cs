using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.DTOs.Campus
{
    public class CampusDto
    {
        [JsonPropertyName("campusId")]
        public int CampusId { get; set; }

        [JsonPropertyName("id")]
        public int Id => CampusId;

        [JsonPropertyName("campusName")]
        public string CampusName { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name => CampusName;

        [JsonPropertyName("campusCode")]
        public string CampusCode { get; set; } = string.Empty;

        [JsonPropertyName("code")]
        public string Code => CampusCode;

        [JsonPropertyName("address")]
        public string? Address { get; set; }

        [JsonPropertyName("contactPhone")]
        public string? ContactPhone { get; set; }

        [JsonPropertyName("phone")]
        public string? Phone => ContactPhone;

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("isHQ")]
        public bool IsHQ { get; set; }

        [JsonPropertyName("isActive")]
        public bool IsActive { get; set; } = true;

        [JsonPropertyName("status")]
        public string Status => IsActive ? "Active" : "Inactive";

        [JsonPropertyName("displayOrder")]
        public int DisplayOrder { get; set; }

        [JsonPropertyName("studentCount")]
        public int StudentCount { get; set; }

        [JsonPropertyName("affiliatedBoards")]
        public List<AffiliatedBoardDto> AffiliatedBoards { get; set; } = new List<AffiliatedBoardDto>();

        [JsonPropertyName("boardIds")]
        public List<int> BoardIds { get; set; } = new List<int>();

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("updatedAt")]
        public DateTime? UpdatedAt { get; set; }
    }
}
