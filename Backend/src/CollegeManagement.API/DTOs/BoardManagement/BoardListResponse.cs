using System;

namespace CollegeManagement.API.DTOs.Board.Responses
{
    public class BoardListResponse
    {
        public int BoardId { get; set; }

        public string BoardName { get; set; } = string.Empty;

        public string BoardCode { get; set; } = string.Empty;

        public string BoardType { get; set; } = string.Empty;

        public int CountryId { get; set; }

        public string CountryName { get; set; } = string.Empty;

        public int? StateId { get; set; }

        public string? StateName { get; set; }

        public string AcademicPatternName { get; set; } = string.Empty;

        public List<int> AcademicLevelIds { get; set; } = [];

        public List<string> AcademicLevelNames { get; set; } = [];

        public List<string> AcademicLevels { get; set; } = [];

        public string AcademicLevelsText { get; set; } = string.Empty;

        public string AcademicLevel { get; set; } = string.Empty;

        public bool Status { get; set; }

        public bool IsActive => Status;

        public uint RowVersion { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}
