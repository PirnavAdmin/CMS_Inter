using System;

namespace CollegeManagement.API.DTOs.Board.Responses
{
    /// <summary>
    /// Data transfer object representing recent board activity details.
    /// </summary>
    public class BoardRecentActivityDto
    {
        public int BoardId { get; set; }
        public string BoardCode { get; set; } = string.Empty;
        public string BoardName { get; set; } = string.Empty;
        public string CountryName { get; set; } = string.Empty;
        public bool Status { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
