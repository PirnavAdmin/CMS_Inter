using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Holiday
{
    public class CreateHolidayRequest
    {
        [Required(ErrorMessage = "Holiday name is required.")]
        [MaxLength(150, ErrorMessage = "Holiday name cannot exceed 150 characters.")]
        public string HolidayName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Holiday type is required.")]
        [MaxLength(50)]
        public string HolidayType { get; set; } = "Festival Holiday";

        [Required(ErrorMessage = "Applies To is required.")]
        [MaxLength(50)]
        public string AppliesTo { get; set; } = "All Students & Staff";

        [Required]
        [MaxLength(20)]
        public string DateType { get; set; } = "Single Day";

        [Required(ErrorMessage = "Start date is required.")]
        public DateOnly StartDate { get; set; }

        public DateOnly? EndDate { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Active";

        [MaxLength(500, ErrorMessage = "Description cannot exceed 500 characters.")]
        public string? Description { get; set; }

        public int? CampusId { get; set; } = 1;

        public int? AcademicYearId { get; set; }

        public int? BoardId { get; set; }
    }

    public class UpdateHolidayRequest : CreateHolidayRequest
    {
    }

    public class HolidayResponse
    {
        public int Id { get; set; }
        public string HolidayCode { get; set; } = string.Empty;
        public int? CampusId { get; set; }
        public int? AcademicYearId { get; set; }
        public int? BoardId { get; set; }
        public string HolidayName { get; set; } = string.Empty;
        public string HolidayType { get; set; } = string.Empty;
        public string AppliesTo { get; set; } = string.Empty;
        public string DateType { get; set; } = string.Empty;
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }
        public string FormattedDateRange { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string LifecycleStatus { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class HolidaySummaryResponse
    {
        public int Total { get; set; }
        public int National { get; set; }
        public int Festival { get; set; }
        public int Upcoming { get; set; }
        public int Completed { get; set; }
    }

    public class HolidayFilterRequest
    {
        public int? CampusId { get; set; }
        public int? AcademicYearId { get; set; }
        public int? BoardId { get; set; }
        public string? Search { get; set; }
        public string? Month { get; set; } // "All", "1".."12", "Custom Range"
        public DateOnly? FromDate { get; set; }
        public DateOnly? ToDate { get; set; }
        public string? Type { get; set; } // "All", "National Holiday", etc.
        public string? Status { get; set; } // "All", "Active", "Completed", "Inactive"
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
