using System;

namespace CollegeManagement.API.DTOs.Sections
{
    public class SectionResponse
    {
        public int SectionId { get; set; }
        public int Id => SectionId;

        public int? BoardId { get; set; }
        public string Board { get; set; } = string.Empty;
        public string BoardName { get; set; } = string.Empty;

        public int AcademicYearId { get; set; }
        public string AcademicYearName { get; set; } = string.Empty;

        public int? AcademicLevelId { get; set; }
        public string AcademicLevel { get; set; } = string.Empty;
        public string AcademicLevelName { get; set; } = string.Empty;
        public string LevelName { get; set; } = string.Empty;
        public string YearOfStudy => AcademicLevel;

        public int? GroupId { get; set; }
        public string Group { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;

        public int? GroupProgramId { get; set; }

        public int? ProgramId { get; set; }
        public string Programme { get; set; } = string.Empty;
        public string Program => Programme;
        public string ProgramName { get; set; } = string.Empty;

        public string SectionName { get; set; } = string.Empty;
        public string Name => SectionName;

        public string? RoomNumber { get; set; }
        public string? Room => RoomNumber;
        public int? RoomId { get; set; }
        public string? RoomName { get; set; }

        public string? BlockName { get; set; }
        public string? BuildingName
        {
            get => BlockName;
            set => BlockName = value;
        }
        public string? Building => BlockName;
        public string? Block => BlockName;

        public int? InchargeId { get; set; }
        public int? ClassTeacherId
        {
            get => InchargeId;
            set => InchargeId = value;
        }
        public int? TeacherId => InchargeId;
        public int? FacultyId => InchargeId;

        public string InchargeName { get; set; } = string.Empty;
        public string Incharge => InchargeName;
        public string ClassTeacherName
        {
            get => InchargeName;
            set => InchargeName = value;
        }
        public string Teacher => InchargeName;
        public string FacultyName => InchargeName;
        public string FacultyEmployeeId { get; set; } = string.Empty;

        public int MaximumStrength { get; set; }
        public int Capacity => MaximumStrength;
        public int Strength => MaximumStrength;

        public bool IsActive { get; set; }
        public string Status => IsActive ? "Active" : "Inactive";

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
