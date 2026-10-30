using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.DTOs.Groups
{
    public class UpdateGroupRequest
    {
        [Range(1, int.MaxValue, ErrorMessage = "Valid BoardId is required")]
        public int BoardId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Valid AcademicYearId is required")]
        public int AcademicYearId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Valid AcademicLevelId is required")]
        public int AcademicLevelId { get; set; }

        [Required, MaxLength(100)]
        public string GroupName { get; set; } = string.Empty;

        [Required, MaxLength(30)]
        [RegularExpression(@"^[A-Za-z0-9_-]+$", ErrorMessage = "Group code can contain only letters, numbers, hyphen and underscore.")]
        public string GroupCode { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public bool IsActive { get; set; }

        [JsonPropertyName("programIds")]
        public List<int>? ProgramIds { get; set; }

        [JsonPropertyName("programs")]
        public JsonElement? ProgramsRaw { get; set; }

        [JsonPropertyName("selectedPrograms")]
        public JsonElement? SelectedProgramsRaw { get; set; }

        public List<int> GetResolvedProgramIds()
        {
            return CollegeManagement.API.Helpers.ProgramIdResolver.Resolve(ProgramIds, ProgramsRaw, SelectedProgramsRaw);
        }
    }
}
