using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("Sections")]
    public class Section    
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int SectionId { get; set; }

        public int? BoardId { get; set; }

        [Required]
        public int AcademicYearId { get; set; }

        public int? AcademicLevelId { get; set; }

        public int? GroupId { get; set; }

        public int? GroupProgramId { get; set; }

        public int? ProgramId { get; set; }

        [Required]
        [MaxLength(50)]
        public string SectionName { get; set; } = string.Empty;

        public int? RoomId { get; set; }

        [Column("InchargeId")]
        public int? InchargeId { get; set; }

        public int MaximumStrength { get; set; } = 40;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        #region Navigation Properties
        [ForeignKey(nameof(BoardId))]
        public Board? BoardNavigation { get; set; }

        [ForeignKey(nameof(AcademicYearId))]
        public AcademicYear? AcademicYear { get; set; }

        [ForeignKey(nameof(AcademicLevelId))]
        public AcademicLevel? AcademicLevelNavigation { get; set; }

        [ForeignKey(nameof(GroupId))]
        public Group? GroupNavigation { get; set; }

        [ForeignKey(nameof(GroupProgramId))]
        public GroupProgram? GroupProgramNavigation { get; set; }

        [ForeignKey(nameof(ProgramId))]
        public AcademicProgram? ProgramNavigation { get; set; }

        [ForeignKey(nameof(RoomId))]
        public CollegeManagement.API.Models.Timetable.Room? RoomNavigation { get; set; }

        [ForeignKey(nameof(InchargeId))]
        public CollegeManagement.API.Models.Faculty.Faculty? InchargeNavigation { get; set; }
        #endregion

        #region Backward-Compatible Unmapped Properties
        [NotMapped]
        private string? _boardString;
        [NotMapped]
        public string Board
        {
            get => BoardNavigation?.BoardName ?? _boardString ?? string.Empty;
            set => _boardString = value;
        }

        [NotMapped]
        private string? _groupString;
        [NotMapped]
        public string Group
        {
            get => GroupNavigation?.GroupName ?? GroupProgramNavigation?.Group?.GroupName ?? _groupString ?? string.Empty;
            set => _groupString = value;
        }

        [NotMapped]
        private string? _programString;
        [NotMapped]
        public string Programme
        {
            get => ProgramNavigation?.ProgramName ?? GroupProgramNavigation?.AcademicProgram?.ProgramName ?? _programString ?? string.Empty;
            set => _programString = value;
        }

        [NotMapped]
        public string Program
        {
            get => Programme;
            set => Programme = value;
        }

        [NotMapped]
        private string? _academicLevelString;
        [NotMapped]
        public string AcademicLevel
        {
            get => AcademicLevelNavigation?.LevelName ?? _academicLevelString ?? string.Empty;
            set => _academicLevelString = value;
        }

        [NotMapped]
        public string YearOfStudy
        {
            get => AcademicLevel;
            set => AcademicLevel = value;
        }

        [NotMapped]
        private string? _roomNumberString;
        [NotMapped]
        public string? RoomNumber
        {
            get => RoomNavigation?.RoomNumber ?? _roomNumberString;
            set => _roomNumberString = value;
        }

        [NotMapped]
        public int? ClassTeacherId
        {
            get => InchargeId;
            set => InchargeId = value;
        }

        [NotMapped]
        public int? FacultyId
        {
            get => InchargeId;
            set => InchargeId = value;
        }

        [NotMapped]
        public int? TeacherId
        {
            get => InchargeId;
            set => InchargeId = value;
        }

        [NotMapped]
        public int Capacity
        {
            get => MaximumStrength;
            set => MaximumStrength = value;
        }

        [NotMapped]
        public int Strength
        {
            get => MaximumStrength;
            set => MaximumStrength = value;
        }
        #endregion
    }
}