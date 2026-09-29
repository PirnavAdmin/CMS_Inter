using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.DTOs.Campus
{
    public class UpdateCampusDto
    {
        [Required(ErrorMessage = "Campus ID is required.")]
        [JsonPropertyName("campusId")]
        public int CampusId { get; set; }

        [Required(ErrorMessage = "Campus name is required.")]
        [MaxLength(150, ErrorMessage = "Campus name cannot exceed 150 characters.")]
        [JsonPropertyName("campusName")]
        public string CampusName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Campus code is required.")]
        [MaxLength(50, ErrorMessage = "Campus code cannot exceed 50 characters.")]
        [JsonPropertyName("campusCode")]
        public string CampusCode { get; set; } = string.Empty;

        [MaxLength(500, ErrorMessage = "Address cannot exceed 500 characters.")]
        [JsonPropertyName("address")]
        public string? Address { get; set; }

        [MaxLength(50, ErrorMessage = "Contact phone cannot exceed 50 characters.")]
        [JsonPropertyName("contactPhone")]
        public string? ContactPhone { get; set; }

        [MaxLength(150, ErrorMessage = "Email cannot exceed 150 characters.")]
        [EmailAddress(ErrorMessage = "Invalid email address.")]
        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("isHQ")]
        public bool IsHQ { get; set; }

        [JsonPropertyName("isActive")]
        public bool IsActive { get; set; } = true;

        [Required(ErrorMessage = "At least one affiliated board must be selected.")]
        [JsonPropertyName("boardIds")]
        public List<int> BoardIds { get; set; } = new List<int>();
    }
}
