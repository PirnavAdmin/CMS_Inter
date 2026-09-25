using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class CreateExaminationRequest
    {
        private int _academicLevelId;
        private int _groupId;
        private int? _programId;
        private int _assessmentTypeId;

        public string? ExamCode { get; set; }

        public int? CampusId { get; set; } = 1;

        [Required]
        public string ExamName { get; set; } = string.Empty;

        [Required]
        public int BoardId { get; set; }

        [Required]
        public int AcademicYearId { get; set; }

        public List<int>? AcademicLevelIds { get; set; }

        public int AcademicLevelId
        {
            get => _academicLevelId > 0
                ? _academicLevelId
                : (AcademicLevelIds != null && AcademicLevelIds.Count > 0 ? AcademicLevelIds[0] : 0);
            set => _academicLevelId = value;
        }

        public string? AcademicLevel { get; set; }

        public List<int>? GroupIds { get; set; }

        public int GroupId
        {
            get => _groupId > 0
                ? _groupId
                : (GroupIds != null && GroupIds.Count > 0 ? GroupIds[0] : 0);
            set => _groupId = value;
        }

        public List<int>? ProgramIds { get; set; }

        public int? ProgramId
        {
            get => _programId.HasValue && _programId.Value > 0
                ? _programId
                : (ProgramIds != null && ProgramIds.Count > 0 && ProgramIds[0] > 0 ? ProgramIds[0] : null);
            set => _programId = value > 0 ? value : null;
        }

        public int AssessmentTypeId
        {
            get => _assessmentTypeId;
            set => _assessmentTypeId = value;
        }

        public string? ExamType { get; set; }
        public string? ExamCategory { get; set; }
        public string? Category { get => ExamCategory; set => ExamCategory = value; }
        public string? CustomCategoryName { get; set; }

        [Required]
        public DateOnly StartDate { get; set; }

        [Required]
        public DateOnly EndDate { get; set; }

        public string? ExamPattern { get; set; }
        public string? ExamPatternId { get => ExamPattern; set => ExamPattern = value; }

        public int? TotalMarks { get; set; }

        public decimal? PassPercentage { get; set; }

        public string? Description { get; set; }

        public string Status { get; set; } = "DRAFT";

        public string? ScheduleMode { get; set; }

        public List<int>? AllocatedSubjectIds { get; set; } = new();

        public List<int>? SelectedSubjectIds
        {
            get => AllocatedSubjectIds;
            set
            {
                if (value != null && value.Count > 0)
                {
                    AllocatedSubjectIds = value;
                }
            }
        }
    }
}