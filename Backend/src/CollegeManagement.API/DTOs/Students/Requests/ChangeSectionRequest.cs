using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Students
{
    public class ChangeSectionRequest
    {
        [Required]
        public int SectionId { get; set; }

        [MaxLength(1000)]
        public string? Remarks { get; set; }
    }
}
