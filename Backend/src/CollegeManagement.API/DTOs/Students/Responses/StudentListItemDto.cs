using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Students
{
    public class StudentListItemDto
    {
        public int StudentId { get; set; }

        public string AdmissionNo { get; set; } = string.Empty;

        public string RollNo { get; set; } = string.Empty;

        public string StudentName { get; set; } = string.Empty;

        public string? Photo { get; set; }

        public string? Gender { get; set; }

        public string? MobileNumber { get; set; }

        public string? Email { get; set; }

        public int AcademicLevelId { get; set; }

        public int GroupId { get; set; }

        public int ProgramId { get; set; }

        public int SectionId { get; set; }

        public string? AcademicLevelName { get; set; }

        public string? GroupName { get; set; }

        public string? ProgramName { get; set; }

        public string? SectionName { get; set; }

        public string Status { get; set; } = string.Empty;

        public bool IsActive { get; set; }
    }
}
