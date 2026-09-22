namespace CollegeManagement.API.DTOs.Marks
{
    public class SaveMarkDto
    {
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
        public string? AcademicYear { get; set; }
        public int? MaxMarks { get; set; }
        public int? TotalMarks { get; set; }
        public int? ObtainedMarks { get; set; }
        public int PassingMarks { get; set; } = 35;
        public bool IsAbsent { get; set; } = false;
        public string? Remarks { get; set; }
    }
}