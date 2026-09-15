using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Marks
{
    public class FacultyAssignedEvaluationDto
    {
        public int EvaluationId { get; set; }
        public int ExaminationId { get; set; }
        public string ExaminationName { get; set; } = string.Empty;
        public int SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public int? FacultyId { get; set; }
        public string FacultyName { get; set; } = string.Empty;
        public string FacultyCode { get; set; } = string.Empty;
        public string Status { get; set; } = "NOT_STARTED";
        public string Mode { get; set; } = "REGULAR";
        public decimal MaxMarks { get; set; } = 100;
        public decimal InternalMax { get; set; } = 30;
        public decimal PracticalMax { get; set; } = 0;
        public decimal TheoryMax { get; set; } = 70;
        public decimal PassPercentage { get; set; } = 35;
        public string? RejectionReason { get; set; }
        public int ResubmissionCount { get; set; }
        public int RowVersion { get; set; } = 1;
    }

    public class FacultyEvaluationStudentsResponseDto
    {
        public int EvaluationId { get; set; }
        public int ExaminationId { get; set; }
        public string ExaminationName { get; set; } = string.Empty;
        public int SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public int? FacultyId { get; set; }
        public string FacultyName { get; set; } = string.Empty;
        public string FacultyCode { get; set; } = string.Empty;
        public string Mode { get; set; } = "REGULAR";
        public decimal MaxMarks { get; set; } = 100;
        public decimal TheoryMax { get; set; } = 70;
        public decimal PracticalMax { get; set; } = 0;
        public decimal InternalMax { get; set; } = 30;
        public decimal PassPercentage { get; set; } = 35;
        public bool IsPracticalApplicable { get; set; }
        public string Status { get; set; } = "NOT_STARTED";
        public string? RejectionReason { get; set; }
        public int RowVersion { get; set; } = 1;
        public List<FacultyStudentMarkRowDto> Students { get; set; } = new();
    }

    public class FacultyStudentMarkRowDto
    {
        public int StudentId { get; set; }
        public string RollNo { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public int InternalMarks { get; set; }
        public int PracticalMarks { get; set; }
        public int TheoryMarks { get; set; }
        public int TotalMarks { get; set; }
        public bool IsAbsent { get; set; }
        public string? Remarks { get; set; }
    }

    public class SaveFacultyMarksRequestDto
    {
        public int RowVersion { get; set; }
        public string? EvaluationId { get; set; }
        public string? Remarks { get; set; }
        public List<FacultyStudentMarkInputDto> Students { get; set; } = new();

        public List<FacultyStudentMarkInputDto> Marks
        {
            get => Students;
            set => Students = (value != null && value.Any()) ? value : Students;
        }

        public List<FacultyStudentMarkInputDto> MarksList
        {
            get => Students;
            set => Students = (value != null && value.Any()) ? value : Students;
        }

        public List<FacultyStudentMarkInputDto> StudentMarks
        {
            get => Students;
            set => Students = (value != null && value.Any()) ? value : Students;
        }
    }

    public class FacultyStudentMarkInputDto
    {
        public int StudentId { get; set; }
        public int InternalMarks { get; set; }
        public int PracticalMarks { get; set; }
        public int TheoryMarks { get; set; }
        public int? Internal { get => InternalMarks; set => InternalMarks = value ?? InternalMarks; }
        public int? Practical { get => PracticalMarks; set => PracticalMarks = value ?? PracticalMarks; }
        public int? Theory { get => TheoryMarks; set => TheoryMarks = value ?? TheoryMarks; }
        public int? TotalMarks { get; set; }
        public int? ObtainedMarks { get; set; }
        public int? MaxMarks { get; set; }
        public string? Status { get; set; }
        public bool IsAbsent { get; set; }
        public string? Remarks { get; set; }
    }

    public class ResubmitEvaluationRequestDto
    {
        public int RowVersion { get; set; }
        public string? ResubmissionMessage { get; set; }
    }
}
