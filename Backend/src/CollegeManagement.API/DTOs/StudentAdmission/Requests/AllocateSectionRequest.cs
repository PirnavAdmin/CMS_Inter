using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.StudentAdmission
{
    public class AllocateSectionRequest
    {
        [Required]
        public int AdmissionId { get; set; }

        [Required]
        public int SectionId { get; set; }
    }
}
