namespace CollegeManagement.API.DTOs.Result
{
    public class RankListDto
    {
        public int Rank { get; set; }
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Student { get => StudentName; set => StudentName = value; }
        public string RollNumber { get; set; } = string.Empty;
        public string RollNo { get => RollNumber; set => RollNumber = value; }
        public string Roll { get => RollNumber; set => RollNumber = value; }
        public int? GroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public string Group { get => GroupName; set => GroupName = value; }
        public string? ProgramId { get; set; }
        public string ProgramName { get; set; } = "Regular Academic";
        public string Program { get => ProgramName; set => ProgramName = value; }
        public int? SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public string Section { get => SectionName; set => SectionName = value; }
        public int ExamId { get; set; }
        public string ExamCode { get; set; } = string.Empty;
        public string ExamName { get; set; } = string.Empty;
        public string Examination { get => ExamName; set => ExamName = value; }
        public decimal TotalMarks { get; set; }
        public decimal Total { get => TotalMarks; set => TotalMarks = value; }
        public decimal MaximumMarks { get; set; } = 600;
        public decimal Maximum { get => MaximumMarks; set => MaximumMarks = value; }
        public decimal Percentage { get; set; }
        public string Grade { get; set; } = string.Empty;
        public string Result { get; set; } = "PASS";
    }
}