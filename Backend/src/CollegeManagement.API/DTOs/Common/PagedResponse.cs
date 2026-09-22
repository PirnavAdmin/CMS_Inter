using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Common
{
    /// <summary>
    /// Generic response DTO for paginated query results.
    /// </summary>
    /// <typeparam name="T">The item type.</typeparam>
    public class PagedResponse<T>
    {
        public IEnumerable<T> Items { get; set; } = new List<T>();
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
        public int CurrentPage { get; set; }
        public int PageSize { get; set; }
    }
}
