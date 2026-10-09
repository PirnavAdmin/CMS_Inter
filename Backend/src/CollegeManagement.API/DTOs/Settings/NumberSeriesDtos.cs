using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Settings
{
    public class NumberSeriesResponseDto
    {
        public int Id { get; set; }
        public string SeriesCode { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string SeriesName { get; set; } = string.Empty;
        public string Prefix { get; set; } = string.Empty;
        public string FormatPattern { get; set; } = string.Empty;
        public int NumberLength { get; set; } = 4;
        public int StartNumber { get; set; } = 1;
        public int CurrentSequence { get; set; } = 0;
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
        public string LivePreview { get; set; } = string.Empty;
        public string CurrentExample { get; set; } = string.Empty;
        public List<string> AvailablePlaceholders { get; set; } = new();
        public List<SampleFormatDto> SampleFormats { get; set; } = new();
        public DateTime UpdatedAt { get; set; }
    }

    public class SampleFormatDto
    {
        public string Pattern { get; set; } = string.Empty;
        public string Example { get; set; } = string.Empty;
    }

    public class UpdateNumberSeriesDto
    {
        [MaxLength(20)]
        public string Prefix { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string FormatPattern { get; set; } = string.Empty;

        [Range(1, 10)]
        public int NumberLength { get; set; } = 4;

        [Range(1, int.MaxValue)]
        public int StartNumber { get; set; } = 1;

        [MaxLength(500)]
        public string? Description { get; set; }

        public bool? IsActive { get; set; }

        [MaxLength(100)]
        public string? SeriesName { get; set; }
    }

    public class GenerateNumberSeriesRequestDto
    {
        public int? BoardId { get; set; }
        public int? AcademicYearId { get; set; }
        public int? GroupId { get; set; }
        public int? ProgramId { get; set; }
        public int? AcademicLevelId { get; set; }
        public string? Board { get; set; }
        public string? Dept { get; set; }
        public string? Type { get; set; }
        public string? Staff { get; set; }
        public string? Desig { get; set; }
        public string? Cert { get; set; }
        public string? AcademicYear { get; set; }
        public string? Group { get; set; }
        public string? Program { get; set; }
        public string? Section { get; set; }
        public string? Level { get; set; }
        public string? Exam { get; set; }
        public string? GroupCode { get; set; }
        public string? BoardCode { get; set; }
        public string? LevelCode { get; set; }
        public string? CampusGroupPrefix { get; set; }
        public string? CampusCode { get; set; }
    }

    public class GenerateNumberSeriesResponseDto
    {
        public string SeriesCode { get; set; } = string.Empty;
        public string GeneratedNumber { get; set; } = string.Empty;
        public int SequenceNumber { get; set; }
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    }
}
