using System;
using CollegeManagement.API.Models.Enums;

namespace CollegeManagement.API.DTOs.Marks
{
    public class MarkResponseDto
    {
        public int MarkId { get; set; }
        public string Board { get; set; } = string.Empty;
        public int? BoardId { get; set; }
        public int AcademicYearId { get; set; }
        public string AcademicLevel { get; set; } = string.Empty;
        public int? AcademicLevelId { get; set; }
        public int GroupId { get; set; }
        public int SectionId { get; set; }
        public int ExaminationId { get; set; }
        public int SubjectId { get; set; }
        public int StudentId { get; set; }
        public int? FacultyId { get; set; }
        public string RollNo { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public int InternalMarks { get; set; }
        public int PracticalMarks { get; set; }
        public int TheoryMarks { get; set; }
        public int TotalMarks { get; set; }
        public int PassingMarks { get; set; }
        public bool IsPass => !IsAbsent && TotalMarks >= PassingMarks;
        public bool IsAbsent { get; set; }
        public string? Remarks { get; set; }
        public bool IsVerified { get; set; }
        public bool IsPublished { get; set; }
        public EvaluationStatus Status { get; set; } = EvaluationStatus.SUBMITTED;
        public bool IsLocked { get; set; }
        public string? VerifiedBy { get; set; }
        public DateTime? VerifiedAt { get; set; }
        public int? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? PublishedAt { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}