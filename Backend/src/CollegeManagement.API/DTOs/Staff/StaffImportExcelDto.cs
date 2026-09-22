using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.DTOs.Staff
{
    public class StaffImportExcelRequestDto
    {
        [Required(ErrorMessage = "Excel file is required.")]
        public IFormFile File { get; set; } = null!;

        public string? DefaultStaffType { get; set; }
    }

    public class StaffImportRowError
    {
        public int RowNumber { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string StaffName { get; set; } = string.Empty;
        public string ErrorMessage { get; set; } = string.Empty;
    }

    public class StaffImportResultDto
    {
        public bool Success { get; set; }
        public int TotalRowsRead { get; set; }
        public int TeachingImported { get; set; }
        public int NonTeachingImported { get; set; }
        public int TotalImported => TeachingImported + NonTeachingImported;
        public int FailedRowsCount { get; set; }
        public List<StaffImportRowError> Errors { get; set; } = new();
        public string SummaryMessage { get; set; } = string.Empty;
    }
}
