namespace CollegeManagement.API.DTOs.Board.Requests
{
    /// <summary>
    /// Request parameters for Board Excel/CSV exports, containing all filters except pagination.
    /// </summary>
    public class BoardExportRequest
    {
        public string? Search { get; set; }
        public string? BoardName { get; set; }
        public string? BoardCode { get; set; }
        public int? CountryId { get; set; }
        public int? StateId { get; set; }
        public int? AcademicPatternId { get; set; }
        public int? GradingSystemId { get; set; }
        public bool? Status { get; set; }
        public string SortBy { get; set; } = "BoardName";
        public string SortOrder { get; set; } = "ASC";
    }
}
