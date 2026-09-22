using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Students
{
    public class TransferStudentRequest
    {
        [Required]
        [MaxLength(500)]
        public string TransferReason { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Remarks { get; set; }
    }
}
