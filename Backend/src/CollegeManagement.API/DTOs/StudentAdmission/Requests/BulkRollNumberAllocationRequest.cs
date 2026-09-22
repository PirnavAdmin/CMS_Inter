using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.StudentAdmission
{
    public class BulkRollNumberAllocationRequest
    {
        [Required]
        public int SectionId { get; set; }

        [Required]
        public int StartingRollNumber { get; set; }

        [Required]
        public List<int> AdmissionIds { get; set; } = new();
    }
}
