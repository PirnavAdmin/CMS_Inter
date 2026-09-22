namespace CollegeManagement.API.DTOs.Board.Responses
{
    /// <summary>
    /// Data transfer object representing lookup count statistics.
    /// </summary>
    public class BoardLookupCountDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Count { get; set; }
    }
}
