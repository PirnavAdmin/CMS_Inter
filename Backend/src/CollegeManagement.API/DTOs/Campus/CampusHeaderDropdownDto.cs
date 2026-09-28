using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.DTOs.Campus
{
    public class CampusHeaderDropdownDto
    {
        [JsonPropertyName("id")]
        public string Id => CampusId.ToString();

        [JsonPropertyName("campusId")]
        public int CampusId { get; set; }

        [JsonPropertyName("name")]
        public string Name => CampusName;

        [JsonPropertyName("campusName")]
        public string CampusName { get; set; } = string.Empty;

        [JsonPropertyName("code")]
        public string Code => CampusCode;

        [JsonPropertyName("campusCode")]
        public string CampusCode { get; set; } = string.Empty;

        [JsonPropertyName("isHQ")]
        public bool IsHQ { get; set; }

        [JsonPropertyName("isActive")]
        public bool IsActive { get; set; } = true;

        [JsonPropertyName("affiliatedBoardIds")]
        public List<int> AffiliatedBoardIds { get; set; } = new List<int>();
    }

    public class CampusStatsDto
    {
        [JsonPropertyName("totalCampuses")]
        public int TotalCampuses { get; set; }

        [JsonPropertyName("activeInHeader")]
        public int ActiveInHeader { get; set; }

        [JsonPropertyName("inactiveBranches")]
        public int InactiveBranches { get; set; }

        [JsonPropertyName("selectedBranch")]
        public CampusDto? SelectedBranch { get; set; }
    }
}
