using System;

namespace CollegeManagement.API.DTOs.Timetable
{
    public class CreateBreakTypeDto
    {
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }

    public class UpdateBreakTypeDto
    {
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }

    public class BreakTypeResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}