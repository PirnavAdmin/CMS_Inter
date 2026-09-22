using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Assignment
{
    public class PublishAssignmentsDto
    {
        [Required]
        public List<int> AssignmentIds { get; set; } = new List<int>();
    }
}
