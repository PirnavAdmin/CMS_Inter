using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.StudentAdmission
{
    public class ApproveStudentAdmissionRequest
    {
        public int AdmissionId { get; set; }

        public string? Remarks { get; set; }
    }
}
