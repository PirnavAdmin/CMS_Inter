using System;

namespace CollegeManagement.API.DTOs.Result
{
    public class RevaluationStatusDto
    {
        public int RevaluationId { get; set; }

        public int ResultId { get; set; }

        public int StudentId { get; set; }

        public string StudentName { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public DateTime RequestedDate { get; set; }

        public DateTime? ReviewedDate { get; set; }

        public string? Remarks { get; set; }
    }
}