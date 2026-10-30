using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.NonTeaching
{
    public class DepartmentMetricDto
    {
        public string Label { get; set; } = string.Empty;
        public string Val { get; set; } = string.Empty;
        public string Sub { get; set; } = string.Empty;
    }

    public class DepartmentRecordDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Party { get; set; } = string.Empty;
        public string Time { get; set; } = string.Empty;
        public string Status { get; set; } = "Completed";
    }

    public class DepartmentModuleDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<DepartmentMetricDto> Metrics { get; set; } = new();
        public List<DepartmentRecordDto> Records { get; set; } = new();
    }

    public class CreateDepartmentRecordDto
    {
        public string Title { get; set; } = string.Empty;
        public string Party { get; set; } = string.Empty;
        public string Time { get; set; } = string.Empty;
        public string Status { get; set; } = "Completed";
    }

    public class StaffTaskDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Category { get; set; } = "Office Administration";
        public string Priority { get; set; } = "Medium";
        public string? DueDate { get; set; }
        public string Status { get; set; } = "Pending";
        public string AssignedBy { get; set; } = "Self";
        public string AssignedDate { get; set; } = string.Empty;
    }

    public class CreateStaffTaskDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Category { get; set; } = "Office Administration";
        public string Priority { get; set; } = "Medium";
        public string? DueDate { get; set; }
        public string? AssignedBy { get; set; }
    }

    public class UpdateTaskStatusDto
    {
        public string Status { get; set; } = "Completed";
    }

    public class StaffSupportTicketDto
    {
        public int Id { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Priority { get; set; } = "Medium";
        public string Status { get; set; } = "Open";
        public string? Response { get; set; }
        public string CreatedAt { get; set; } = string.Empty;
    }

    public class CreateStaffSupportTicketDto
    {
        public string Category { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Priority { get; set; } = "Medium";
    }
}
