namespace CollegeManagement.API.DTOs.Result
{
    public class StudentSubjectResultDto
    {
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string Short { get; set; } = string.Empty;
        public decimal Theory { get; set; }
        public decimal? TheoryMarks { get => Theory; set => Theory = value ?? 0; }
        public decimal Practical { get; set; }
        public decimal? PracticalMarks { get => Practical; set => Practical = value ?? 0; }
        public decimal Internal { get; set; }
        public decimal? InternalMarks { get => Internal; set => Internal = value ?? 0; }
        public decimal TotalMarks { get; set; }
        public decimal? ObtainedMarks { get => TotalMarks; set => TotalMarks = value ?? 0; }
        public decimal MaximumMarks { get; set; } = 100;
        public decimal MaxMarks { get => MaximumMarks; set => MaximumMarks = value; }
        public decimal Percentage { get; set; }
        public string Grade { get; set; } = string.Empty;
        public string ResultStatus { get; set; } = string.Empty;
        public bool IsPublished { get; set; }
    }
}