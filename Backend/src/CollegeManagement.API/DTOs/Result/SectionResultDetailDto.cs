using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Result
{
    public class SectionResultDetailDto
    {
        public int SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public string Section { get => SectionName; set => SectionName = value; }
        public int ExamId { get; set; }
        public string ExamName { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public string ProgramName { get; set; } = string.Empty;
        public string InChargeName { get; set; } = string.Empty;
        public int TotalStudents { get; set; }
        public string ResultStatus { get; set; } = "GENERATED";
        public bool IsPublished { get; set; } = false;
        public List<SubjectDefinitionDto> SubjectDefinitions { get; set; } = new();
        public List<SectionStudentResultDto> Students { get; set; } = new();
    }

    public class SubjectDefinitionDto
    {
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string ShortName { get; set; } = string.Empty;
        public bool IsPractical { get; set; }
        public decimal MaxMarks { get; set; } = 100;
    }

    public class SectionStudentResultDto
    {
        public int StudentId { get; set; }
        public string RollNo { get; set; } = string.Empty;
        public string RollNumber { get => RollNo; set => RollNo = value; }
        public string StudentName { get; set; } = string.Empty;
        public int? BoardId { get; set; }
        public int? YearId { get; set; }
        public int? LevelId { get; set; }
        public int? GroupId { get; set; }
        public string? GroupName { get; set; }
        public string? ProgramId { get; set; }
        public string? ProgramName { get; set; }
        public int? SectionId { get; set; }
        public string? SectionName { get; set; }
        public int ExaminationId { get; set; }
        public List<StudentSubjectMarkItemDto> Subjects { get; set; } = new();
        public decimal Total { get; set; }
        public decimal TotalMarks { get => Total; set => Total = value; }
        public decimal Maximum { get; set; }
        public decimal MaxMarks { get => Maximum; set => Maximum = value; }
        public decimal Percentage { get; set; }
        public string Grade { get; set; } = "F";
        public string Result { get; set; } = "PASS";
        public int? SectionRank { get; set; }
        public int? GroupRank { get; set; }
        public int? Rank { get => SectionRank; set => SectionRank = value; }
        public string Status { get; set; } = "GENERATED";
        public bool IsPublished { get; set; } = false;
    }

    public class StudentSubjectMarkItemDto
    {
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string Short { get; set; } = string.Empty;
        public decimal? InternalMarks { get; set; }
        public decimal? PracticalMarks { get; set; }
        public decimal? TheoryMarks { get; set; }
        public decimal? TotalMarks { get; set; }
        public decimal? ObtainedMarks { get; set; }
        public decimal MaxMarks { get; set; } = 100;
    }
}
