using System;
using System.Collections.Generic;
using CollegeManagement.API.DTOs.Program;

namespace CollegeManagement.API.DTOs.MasterGroups
{
    public class ResolveGroupContextResponseDto
    {
        /// <summary>
        /// The academic-context GroupId used by Students, Sections, Subjects, Fees, Timetables, etc.
        /// </summary>
        public int GroupId { get; set; }

        /// <summary>
        /// The permanent reusable catalog MasterGroupId.
        /// </summary>
        public int MasterGroupId { get; set; }

        public int BoardId { get; set; }
        public string? BoardName { get; set; }

        public int AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }

        public int AcademicLevelId { get; set; }
        public string? AcademicLevelName { get; set; }

        public string GroupName { get; set; } = string.Empty;
        public string GroupCode { get; set; } = string.Empty;
        public string? Description { get; set; }

        public bool IsActive { get; set; }
        public string Status { get; set; } = "Active";

        public bool IsNewlyCreated { get; set; }

        public List<GroupProgramDto> Programs { get; set; } = new();
    }
}
