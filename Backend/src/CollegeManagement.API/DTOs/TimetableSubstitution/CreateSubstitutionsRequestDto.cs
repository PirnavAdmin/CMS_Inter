using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.TimetableSubstitution
{
    public class CreateSubstitutionsRequestDto
    {
        [Required]
        [MinLength(1, ErrorMessage = "At least one substitution assignment is required.")]
        public List<SubstitutionAssignmentItemDto> Assignments { get; set; } = new();
    }

    public class SubstitutionAssignmentItemDto
    {
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Valid TimetableId is required.")]
        public int TimetableId { get; set; }

        [Required]
        public DateTime SubstitutionDate { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Valid SubstituteStaffId is required.")]
        public int SubstituteStaffId { get; set; }

        [MaxLength(500)]
        public string? Remarks { get; set; }
    }

    public class CancelSubstitutionRequestDto
    {
        [MaxLength(500)]
        public string? Reason { get; set; }
    }
}