using CollegeManagement.API.Models.Enums;

namespace CollegeManagement.API.DTOs.Evaluations
{
    public class EvaluationFilterDto
    {
        public int? BoardId { get; set; }
        public int? AcademicYearId { get; set; }
        public int? AcademicLevelId { get; set; }
        public int? LevelId { get => AcademicLevelId; set => AcademicLevelId = value; }
        public int? ProgramId { get; set; }
        public int? GroupId { get; set; }
        public int? SectionId { get; set; }
        public int? ExaminationId { get; set; }
        public int? ExamId { get => ExaminationId; set => ExaminationId = value; }
        public int? SubjectId { get; set; }
        public int? StudentId { get; set; }
        public int? FacultyId { get; set; }
        public EvaluationStatus? Status { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}