using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Students
{
    public class ChangeGroupRequest
    {
        [Required]
        public int GroupId { get; set; }

        [Required]
        public int ProgramId { get; set; }

        [MaxLength(1000)]
        public string? Remarks { get; set; }
    }
}
