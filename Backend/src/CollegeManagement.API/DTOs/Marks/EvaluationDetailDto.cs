using System;
using System.Collections.Generic;
using CollegeManagement.API.Models.Enums;

namespace CollegeManagement.API.DTOs.Evaluations
{
    public class EvaluationDetailDto
    {
        public string EvaluationId { get; set; } = string.Empty;
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public int? FacultyId { get; set; }
        public string FacultyName { get; set; } = string.Empty;
        public string FacultyCode { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public string ProgramName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public string ExaminationName { get; set; } = string.Empty;
        public string? ExamPattern { get; set; }
        public string? ExamType { get; set; }
        public int ExamTotalMarks { get; set; } = 600;
        public decimal ExamPassPercentage { get; set; } = 35;
        public decimal SubjectMaxMarks { get; set; } = 100;
        public bool IsPractical { get; set; }
        public string? SubjectType { get; set; }
        public int TotalStudents { get; set; }
        public decimal AverageMarks { get; set; }
        public decimal HighestMarks { get; set; }
        public decimal LowestMarks { get; set; }
        public string Status { get; set; } = string.Empty;
        public EvaluationStatus StatusCode { get; set; }
        public bool IsLocked { get; set; }
        public string? AdminReviewMessage { get; set; }
        public string? RejectionReason { get; set; }
        public List<StudentEvaluationMarkRecordDto> Students { get; set; } = new();
        public List<StudentEvaluationMarkRecordDto> MarksList { get => Students; set => Students = value; }
    }

    public class StudentEvaluationMarkRecordDto
    {
        public int MarkId { get; set; }
        public int StudentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string RollNo { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public decimal? Internal { get; set; }
        public decimal? InternalMarks { get => Internal; set => Internal = value; }
        public decimal? Practical { get; set; }
        public decimal? PracticalMarks { get => Practical; set => Practical = value; }
        public decimal? Theory { get; set; }
        public decimal? TheoryMarks { get => Theory; set => Theory = value; }
        public decimal? TotalMarks { get; set; }
        public decimal? Total { get => TotalMarks; set => TotalMarks = value; }
        public decimal? ObtainedMarks { get; set; }
        public decimal? MaxMarks { get; set; }
        public decimal? Percentage { get; set; }
        public bool IsAbsent { get; set; }
        public bool Absent { get => IsAbsent; set => IsAbsent = value; }
        public string? Remarks { get; set; }
    }

    public class UpdateEvaluationMarksRequestDto
    {
        public List<StudentMarkUpdateItemDto> StudentMarks { get; set; } = new();
        public List<StudentMarkUpdateItemDto> Students { get => StudentMarks; set => StudentMarks = value; }
    }

    public class StudentMarkUpdateItemDto
    {
        public int? MarkId { get; set; }
        public int StudentId { get; set; }
        public decimal? Internal { get; set; }
        public decimal? Practical { get; set; }
        public decimal? Theory { get; set; }
        public decimal? ObtainedMarks { get; set; }
        public decimal? MaxMarks { get; set; }
        public bool? IsAbsent { get; set; }
        public string? Remarks { get; set; }
    }

    public class VerifyEvaluationRequestDto
    {
        public string? Message { get; set; }
        public string? AdminReviewMessage
        {
            get => Message;
            set => Message = value;
        }
    }

    public class RejectEvaluationRequestDto
    {
        public string? Remarks { get; set; }
        public string? Reason { get; set; }
        public string? Message
        {
            get => !string.IsNullOrWhiteSpace(Reason) ? Reason : Remarks;
            set
            {
                Reason = value;
                Remarks = value;
            }
        }
        public bool NotifyFaculty { get; set; } = true;
    }
}