using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.AcademicYear
{
    public class PagedAcademicYearResponseDto
    {
        public IEnumerable<AcademicYearResponseDto> Items { get; set; } = new List<AcademicYearResponseDto>();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
    }
}
