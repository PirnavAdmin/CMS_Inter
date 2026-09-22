namespace CollegeManagement.API.DTOs.Marks
{
    public class UpdateMarkDto
    {
        public int InternalMarks { get; set; }
        public int PracticalMarks { get; set; }
        public int TheoryMarks { get; set; }
        public int PassingMarks { get; set; } = 35;
        public bool IsAbsent { get; set; } = false;
        public string? Remarks { get; set; }
        public int? FacultyId { get; set; }
    }
}