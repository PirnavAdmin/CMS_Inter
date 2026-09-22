using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Sections
{
    public class UpdateSectionRequest
    {
        public int? BoardId { get; set; }

        public string? Board { get; set; }

        [Required(ErrorMessage = "Academic Year ID is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Valid Academic Year ID is required.")]
        public int AcademicYearId { get; set; }

        public int? AcademicLevelId { get; set; }

        public int? YearOfStudyId
        {
            get => AcademicLevelId;
            set => AcademicLevelId = value;
        }

        public string? AcademicLevel { get; set; }

        public string? YearOfStudy
        {
            get => AcademicLevel;
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    AcademicLevel = value;
                }
            }
        }

        public int? GroupId { get; set; }

        public string? Group { get; set; }

        public int? GroupProgramId { get; set; }

        public int? ProgramId { get; set; }

        public int? ProgrammeId
        {
            get => ProgramId;
            set => ProgramId = value;
        }

        public string? Programme { get; set; }

        public string? Program
        {
            get => Programme;
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    Programme = value;
                }
            }
        }

        [Required(ErrorMessage = "Section Name is required.")]
        [MaxLength(50, ErrorMessage = "Section Name cannot exceed 50 characters.")]
        public string SectionName { get; set; } = string.Empty;

        public string? Name
        {
            get => SectionName;
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    SectionName = value;
                }
            }
        }

        public int? RoomId { get; set; }

        [MaxLength(50, ErrorMessage = "Room Number cannot exceed 50 characters.")]
        public string? RoomNumber { get; set; }

        public string? Room
        {
            get => RoomNumber;
            set => RoomNumber = value;
        }

        [Range(1, int.MaxValue, ErrorMessage = "Valid Incharge ID is required.")]
        public int? InchargeId { get; set; }

        public int? ClassTeacherId
        {
            get => InchargeId;
            set => InchargeId = value;
        }

        public int? TeacherId
        {
            get => InchargeId;
            set => InchargeId = value;
        }

        public int? FacultyId
        {
            get => InchargeId;
            set => InchargeId = value;
        }

        public string? Incharge { get; set; }

        public string? Teacher
        {
            get => Incharge;
            set => Incharge = value;
        }

        public string? Faculty
        {
            get => Incharge;
            set => Incharge = value;
        }

        public string? FacultyName
        {
            get => Incharge;
            set => Incharge = value;
        }

        [Range(1, 1000, ErrorMessage = "Maximum Strength must be between 1 and 1000.")]
        public int MaximumStrength { get; set; } = 40;

        public int Capacity
        {
            get => MaximumStrength;
            set => MaximumStrength = value;
        }

        public int Strength
        {
            get => MaximumStrength;
            set => MaximumStrength = value;
        }

        public bool IsActive { get; set; } = true;

        public string? Status
        {
            get => IsActive ? "Active" : "Inactive";
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    IsActive = value.Equals("Active", System.StringComparison.OrdinalIgnoreCase);
                }
            }
        }
    }
}
