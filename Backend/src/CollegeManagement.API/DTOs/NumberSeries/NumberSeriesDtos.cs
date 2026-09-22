using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.NumberSeries
{
    public class NumberSeriesSampleFormatDto
    {
        public string Pattern { get; set; } = string.Empty;
        public string Example { get; set; } = string.Empty;
    }

    public class NumberSeriesDto
    {
        public int Id { get; set; }
        public string SeriesCode { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string SeriesName { get; set; } = string.Empty;
        public string Prefix { get; set; } = string.Empty;
        public string FormatPattern { get; set; } = string.Empty;
        public int NumberLength { get; set; }
        public int StartNumber { get; set; }
        public int CurrentSequence { get; set; }
        public string Description { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public string LivePreview { get; set; } = string.Empty;
        public string CurrentExample { get; set; } = string.Empty;
        public List<string> AvailablePlaceholders { get; set; } = new();
        public List<NumberSeriesSampleFormatDto> SampleFormats { get; set; } = new();
        public DateTime UpdatedAt { get; set; }
    }

    public class UpdateNumberSeriesDto
    {
        public string? Prefix { get; set; }
        public string? FormatPattern { get; set; }
        public int? NumberLength { get; set; }
        public int? StartNumber { get; set; }
        public string? Description { get; set; }
    }

    public class GenerateNextNumberRequestDto
    {
        public string? Board { get; set; }
        public string? Dept { get; set; }
        public string? Type { get; set; }
        public string? Staff { get; set; }
        public string? Desig { get; set; }
        public string? Cert { get; set; }
        public string? AcademicYear { get; set; }
    }

    public class GenerateNextNumberResponseDto
    {
        public string SeriesCode { get; set; } = string.Empty;
        public string GeneratedNumber { get; set; } = string.Empty;
        public int SequenceNumber { get; set; }
        public DateTime GeneratedAt { get; set; }
    }
}
