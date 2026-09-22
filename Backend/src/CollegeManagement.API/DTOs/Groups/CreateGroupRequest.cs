using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.DTOs.Groups
{
    public class CreateGroupRequest
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

        public bool IsActive { get; set; } = true;

        [JsonPropertyName("programIds")]
        public List<int>? ProgramIds { get; set; }

        [JsonPropertyName("programs")]
        public JsonElement? ProgramsRaw { get; set; }

        [JsonPropertyName("selectedPrograms")]
        public JsonElement? SelectedProgramsRaw { get; set; }

        public List<int> GetResolvedProgramIds()
        {
            var ids = new HashSet<int>();

            if (ProgramIds != null)
            {
                foreach (var id in ProgramIds)
                {
                    if (id > 0) ids.Add(id);
                }
            }

            void ExtractFromJsonElement(JsonElement? elem)
            {
                if (!elem.HasValue || elem.Value.ValueKind == JsonValueKind.Null || elem.Value.ValueKind == JsonValueKind.Undefined)
                    return;

                if (elem.Value.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in elem.Value.EnumerateArray())
                    {
                        if (item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out int n) && n > 0)
                        {
                            ids.Add(n);
                        }
                        else if (item.ValueKind == JsonValueKind.String && int.TryParse(item.GetString(), out int parsed) && parsed > 0)
                        {
                            ids.Add(parsed);
                        }
                        else if (item.ValueKind == JsonValueKind.Object)
                        {
                            if (item.TryGetProperty("programId", out var p1) || item.TryGetProperty("ProgramId", out p1) ||
                                item.TryGetProperty("id", out p1) || item.TryGetProperty("Id", out p1) ||
                                item.TryGetProperty("value", out p1) || item.TryGetProperty("Value", out p1))
                            {
                                if (p1.ValueKind == JsonValueKind.Number && p1.TryGetInt32(out int objId) && objId > 0)
                                    ids.Add(objId);
                                else if (p1.ValueKind == JsonValueKind.String && int.TryParse(p1.GetString(), out int parsedObjId) && parsedObjId > 0)
                                    ids.Add(parsedObjId);
                            }
                        }
                    }
                }
            }

            ExtractFromJsonElement(ProgramsRaw);
            ExtractFromJsonElement(SelectedProgramsRaw);

            return ids.ToList();
        }
    }
}
