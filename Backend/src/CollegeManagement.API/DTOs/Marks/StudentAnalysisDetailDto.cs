using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Evaluations
{
    public class StudentAnalysisDetailDto
    {
        public int StudentId { get; set; }
        public string RollNo { get; set; } = string.Empty;
        public string RollNumber { get => RollNo; set => RollNo = value; }
        public string StudentName { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public string Group { get => GroupName; set => GroupName = value; }
        public string ProgramName { get; set; } = string.Empty;
        public string Program { get => ProgramName; set => ProgramName = value; }
        public string SectionName { get; set; } = string.Empty;
        public string Section { get => SectionName; set => SectionName = value; }
        public string ExamName { get; set; } = string.Empty;
        public string Examination { get => ExamName; set => ExamName = value; }
        public string ExamType { get; set; } = "Written";
        public string ExamPattern { get; set; } = "Regular Academic Pattern";
        public int RequiredSubjects { get; set; } = 4;
        public int ApprovedSubjects { get; set; } = 4;
        public decimal TotalMarks { get; set; }
        public decimal Total { get => TotalMarks; set => TotalMarks = value; }
        public decimal TotalObtained { get => TotalMarks; set => TotalMarks = value; }
        public decimal OverallTotal { get => TotalMarks; set => TotalMarks = value; }
        public decimal MaxMarks { get; set; }
        public decimal TotalMaximum { get => MaxMarks; set => MaxMarks = value; }
        public decimal Maximum { get => MaxMarks; set => MaxMarks = value; }
        public decimal Percentage { get; set; }
        public decimal PassPercentage { get; set; } = 35;
        public int PassingScore { get; set; } = 210;
        public string Grade { get; set; } = "F";
        public string Result { get; set; } = "PASS";
        public string OverallResult { get => Result; set => Result = value; }
        public int? Rank { get; set; }
        public List<StudentSubjectAnalysisDetailItemDto> Subjects { get; set; } = new();
    }

    public class StudentSubjectAnalysisDetailItemDto
    {
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string Code { get => SubjectCode; set => SubjectCode = value; }
        public string Mode { get; set; } = "REGULAR";
        public decimal? Internal { get; set; }
        public decimal? Practical { get; set; }
        public decimal? Theory { get; set; }
        public decimal Total { get; set; }
        public decimal? Obtained { get => Total; set => Total = value ?? 0; }
        public decimal? ObtainedMarks { get => Total; set => Total = value ?? 0; }
        public decimal? MaxMarks { get; set; } = 100;
        public decimal? Maximum { get => MaxMarks; set => MaxMarks = value; }
        public decimal? Percentage { get; set; }
        public decimal PassPercentage { get; set; } = 40;
        public int PassingMarks { get => (int)PassPercentage; set => PassPercentage = value; }
        public string Grade { get; set; } = "B";
        public string Result { get; set; } = "PASS";
        public bool IsAbsent { get; set; }
        public string? Remarks { get; set; }
    }
}

