using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Settings
{
    public class TemplateResponseDto
    {
        public int Id { get; set; }
        public string TemplateCode { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string ContentBody { get; set; } = string.Empty;
        public List<string> Placeholders { get; set; } = new();
        public bool IsActive { get; set; }
        public int Version { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateTemplateDto
    {
        [Required(ErrorMessage = "Template code is required.")]
        [MaxLength(100, ErrorMessage = "Template code cannot exceed 100 characters.")]
        public string TemplateCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "Template title is required.")]
        [MaxLength(200, ErrorMessage = "Template title cannot exceed 200 characters.")]
        public string Title { get; set; } = string.Empty;

        [Required(ErrorMessage = "Category is required (e.g. Certificate, Document, BulkUpload).")]
        [MaxLength(50, ErrorMessage = "Category cannot exceed 50 characters.")]
        public string Category { get; set; } = "Certificate";

        [Required(ErrorMessage = "Content body is required.")]
        public string ContentBody { get; set; } = string.Empty;

        public List<string>? Placeholders { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class UpdateTemplateDto
    {
        [Required(ErrorMessage = "Template title is required.")]
        [MaxLength(200, ErrorMessage = "Template title cannot exceed 200 characters.")]
        public string Title { get; set; } = string.Empty;

        [Required(ErrorMessage = "Category is required.")]
        [MaxLength(50, ErrorMessage = "Category cannot exceed 50 characters.")]
        public string Category { get; set; } = "Certificate";

        [Required(ErrorMessage = "Content body is required.")]
        public string ContentBody { get; set; } = string.Empty;

        public List<string>? Placeholders { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class TemplatePagedResponseDto
    {
        public IReadOnlyList<TemplateResponseDto> Items { get; set; } = Array.Empty<TemplateResponseDto>();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
    }

    public class RenderCertificateTemplateRequestDto
    {
        public string? TemplateCode { get; set; }
        public int? TemplateId { get; set; }
        public int? StudentId { get; set; }
        public string? AdmissionNo { get; set; }
        public string? CertificateNo { get; set; }
        public string? Purpose { get; set; }
        public string? Remarks { get; set; }
        public string? IssuedBy { get; set; }
        public string? Conduct { get; set; }
        public DateTime? IssueDate { get; set; }
        public Dictionary<string, string>? CustomPlaceholders { get; set; }
    }

    public class RenderedTemplateResponseDto
    {
        public string TemplateCode { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string RenderedHtml { get; set; } = string.Empty;
        public Dictionary<string, string> AppliedPlaceholders { get; set; } = new();
        public int Version { get; set; }
    }
}
