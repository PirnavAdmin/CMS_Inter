using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Students
{
    public class StudentImportResultDto
    {
        public int TotalRows { get; set; }
        public int SuccessfulRows { get; set; }
        public int FailedRows { get; set; }
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = string.Empty;
        public List<StudentImportRowErrorDto> Errors { get; set; } = new();
    }
}