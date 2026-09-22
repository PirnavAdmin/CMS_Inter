using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.StudentAdmission
{
    public class RejectStudentAdmissionRequest
    {
        [Required]
        public int AdmissionId { get; set; }

        [Required]
        public string RejectionReason { get; set; } = string.Empty;

        public string? Remarks { get; set; }
    }
}
