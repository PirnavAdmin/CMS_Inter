using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Evaluations
{
    public class StudentSubjectMatrixDto
    {
        public int StudentId { get; set; }
        public string RollNo { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public Dictionary<string, decimal> SubjectMarks { get; set; } = new();
        public List<StudentSubjectMarkItemDto> Subjects { get; set; } = new();
        public decimal TotalMarks { get; set; }
        public decimal Total { get => TotalMarks; set => TotalMarks = value; }
        public decimal MaxTotal { get; set; }
        public decimal Maximum { get => MaxTotal; set => MaxTotal = value; }
        public decimal Percentage { get; set; }
        public string Grade { get; set; } = "F";
        public string Result { get; set; } = "PASS";
        public bool ReadyForResults { get; set; } = false;
    }

    public class StudentSubjectMarkItemDto
    {
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public decimal Marks { get; set; }
    }
}