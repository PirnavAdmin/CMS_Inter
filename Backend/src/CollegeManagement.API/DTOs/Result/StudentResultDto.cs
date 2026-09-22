using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Result
{
    public class StudentResultDto
    {
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string RollNumber { get; set; } = string.Empty;
        public string RollNo { get => RollNumber; set => RollNumber = value; }
        public string GroupName { get; set; } = string.Empty;
        public string? ProgramName { get; set; } = "Regular Academic";
        public string? SectionName { get; set; }
        public int ExamId { get; set; }
        public string ExamCode { get; set; } = string.Empty;
        public string ExamName { get; set; } = string.Empty;
        public string ExamType { get; set; } = "Written";
        public string ExamPattern { get; set; } = "Regular Academic Pattern";
        public string ScheduleMode { get; set; } = "SUBJECT_WISE";
        public decimal GrandTotal { get; set; }
        public decimal Total { get => GrandTotal; set => GrandTotal = value; }
        public decimal MaximumMarks { get; set; }
        public decimal Maximum { get => MaximumMarks; set => MaximumMarks = value; }
        public decimal Percentage { get; set; }
        public decimal PassPercentage { get; set; } = 35;
        public string OverallGrade { get; set; } = string.Empty;
        public string Grade { get => OverallGrade; set => OverallGrade = value; }
        public string FinalResult { get; set; } = string.Empty;
        public string Result { get => FinalResult; set => FinalResult = value; }
        public string ResultStatus { get; set; } = "GENERATED";
        public string Status { get => ResultStatus; set => ResultStatus = value; }
        public DateTime? PublishedDate { get; set; }
        public bool IsPublished { get; set; } = false;
        public int? SectionRank { get; set; }
        public int? GroupRank { get; set; }
        public int? ClassRank { get => SectionRank; set => SectionRank = value; }
        public List<StudentSubjectResultDto> Subjects { get; set; } = new();
    }
}