using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.MasterGroups
{
    public class MasterGroupResponseDto
    {
        public int MasterGroupId { get; set; }
        public int BoardId { get; set; }
        public string? BoardName { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public string GroupCode { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public string Status { get; set; } = "Active";
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        public List<int> ProgramIds { get; set; } = new();
        public List<MasterGroupProgramDto> Programs { get; set; } = new();
        public List<EligibleAcademicLevelDto> EligibleLevels { get; set; } = new();
        public int ResolvedContextCount { get; set; }
    }
}
