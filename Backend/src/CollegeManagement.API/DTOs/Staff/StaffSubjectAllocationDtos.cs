using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Staff
{
    public class AssignStaffSubjectDto
    {
        [Required(ErrorMessage = "Staff ID is required.")]
        public int StaffId { get; set; }

        [Required(ErrorMessage = "Subject ID is required.")]
        public int SubjectId { get; set; }

        public int? AcademicYearId { get; set; }

        public int MaxWeeklyHours { get; set; } = 18;
    }

    public class UpdateStaffSubjectAllocationDto
    {
        [Required(ErrorMessage = "Subject ID is required.")]
        public int SubjectId { get; set; }

        public int? AcademicYearId { get; set; }

        public int MaxWeeklyHours { get; set; } = 18;
    }

    public class StaffSubjectAllocationResponseDto
    {
        public int Id { get; set; }
        
        // Staff Identity
        public int StaffId { get; set; }
        public int FacultyId => StaffId;
        public string StaffName { get; set; } = string.Empty;
        public string FacultyName
        {
            get => StaffName;
            set => StaffName = value;
        }
        public string EmployeeId { get; set; } = string.Empty;

        // Academic Year Context
        public int? AcademicYearId { get; set; }
        public string AcademicYearName { get; set; } = string.Empty;

        // Subject Identity & Academic Context
        public int SubjectId { get; set; }
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;

        public int BoardId { get; set; }
        public string BoardName { get; set; } = string.Empty;

        public int GroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;

        public int AcademicLevelId { get; set; }
        public string AcademicLevelName { get; set; } = string.Empty;

        /// <summary>
        /// Contextual Subject Display Name: [SubjectName] — [GroupName] — [AcademicLevelName]
        /// e.g. "English — MPC — 1st Year" or "Physics — BiPC — 1st Year"
        /// </summary>
        public string SubjectDisplayName
        {
            get
            {
                var parts = new List<string>();
                if (!string.IsNullOrWhiteSpace(SubjectName)) parts.Add(SubjectName);
                if (!string.IsNullOrWhiteSpace(GroupName)) parts.Add(GroupName);
                if (!string.IsNullOrWhiteSpace(AcademicLevelName)) parts.Add(AcademicLevelName);
                return parts.Count > 0 ? string.Join(" — ", parts) : SubjectName;
            }
        }

        public string? SectionName { get; set; }
        public string? Section { get; set; }

        public int MaxWeeklyHours { get; set; } = 18;
        public bool IsActive { get; set; } = true;
        public string Status { get; set; } = "Allocated";

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}