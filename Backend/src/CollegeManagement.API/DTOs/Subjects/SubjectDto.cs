using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Subject
{
    public class SubjectDto
    {
        public int SubjectId { get; set; }
        public int BoardId { get; set; }
        public string? BoardName { get; set; }
        public int GroupId { get; set; }
        public string? GroupName { get; set; }
        public int AcademicLevelId { get; set; }
        public string? AcademicLevelName { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectType { get; set; } = string.Empty;

        /// <summary>
        /// Formatted Contextual Subject Name: [SubjectName] — [GroupName] — [AcademicLevelName]
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

        public bool Theory { get; set; }
        public bool Practical { get; set; }
        public bool Language { get; set; }
        public bool Elective { get; set; }
        public int InternalMarks { get; set; }
        public int PracticalMarks { get; set; }
        public int ExternalMarks { get; set; }
        public int TotalMarks { get; set; }
        public int PassingMarks { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}