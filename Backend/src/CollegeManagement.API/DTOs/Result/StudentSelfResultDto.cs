using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Result
{
    public class StudentSelfResultDto
    {
        public int ResultId { get; set; }
        public int ExaminationId { get; set; }
        public string ExaminationName { get; set; } = string.Empty;
        public string ExamCode { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public decimal TotalMarks { get; set; }
        public decimal MaxTotalMarks { get; set; }
        public decimal Percentage { get; set; }
        public string Grade { get; set; } = string.Empty;
        public string ResultStatus { get; set; } = "Pass";
        public int? Rank { get; set; }
        public bool IsPublished { get; set; }
        public DateTime? PublishedAt { get; set; }
    }

    public class StudentSelfResultMemoDto
    {
        public int StudentId { get; set; }
        public string RollNo { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string FatherName { get; set; } = string.Empty;
        public string ExaminationName { get; set; } = string.Empty;
        public string ExamCode { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public string CourseName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public decimal TotalMarks { get; set; }
        public decimal MaxTotalMarks { get; set; }
        public decimal Percentage { get; set; }
        public string Grade { get; set; } = string.Empty;
        public string ResultStatus { get; set; } = "Pass";
        public int? Rank { get; set; }
        public List<StudentSubjectMarkMemoDto> Subjects { get; set; } = new();
    }

    public class StudentSubjectMarkMemoDto
    {
        public int SubjectId { get; set; }
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public decimal MaxMarks { get; set; }
        public decimal PassingMarks { get; set; }
        public decimal InternalMarks { get; set; }
        public decimal PracticalMarks { get; set; }
        public decimal TheoryMarks { get; set; }
        public decimal TotalMarks { get; set; }
        public string ResultStatus { get; set; } = "Pass";
    }
}
