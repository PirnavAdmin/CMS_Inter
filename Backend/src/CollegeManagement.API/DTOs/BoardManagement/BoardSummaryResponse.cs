using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Board.Responses
{
    /// <summary>
    /// Response DTO containing high-level analytics summary metrics for the Board module.
    /// </summary>
    public class BoardSummaryResponse
    {
        public int TotalBoards { get; set; }
        public int ActiveBoards { get; set; }
        public int InactiveBoards { get; set; }
        public IEnumerable<BoardLookupCountDto> BoardsByCountry { get; set; } = new List<BoardLookupCountDto>();
        public IEnumerable<BoardLookupCountDto> BoardsByAcademicPattern { get; set; } = new List<BoardLookupCountDto>();
        public IEnumerable<BoardLookupCountDto> BoardsByGradingSystem { get; set; } = new List<BoardLookupCountDto>();
        public IEnumerable<BoardRecentActivityDto> RecentlyCreated { get; set; } = new List<BoardRecentActivityDto>();
        public IEnumerable<BoardRecentActivityDto> RecentlyUpdated { get; set; } = new List<BoardRecentActivityDto>();
    }
}
