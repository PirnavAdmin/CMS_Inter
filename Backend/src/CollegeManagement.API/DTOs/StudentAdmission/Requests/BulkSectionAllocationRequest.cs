using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.StudentAdmission
{
    public class BulkSectionAllocationRequest
    {
        [Required]
        public int SectionId { get; set; }

        [Required]
        public List<int> AdmissionIds { get; set; } = new();
    }
}
