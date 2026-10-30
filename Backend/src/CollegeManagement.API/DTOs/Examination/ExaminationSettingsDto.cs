using System;

namespace CollegeManagement.API.DTOs.Examination
{
    public class ExaminationSettingsDto
    {
        public int Id { get; set; }
        public int CampusId { get; set; } = 1;
        public decimal MinimumPassingPercentage { get; set; } = 35.00m;
        public int MaximumGraceMarksLimit { get; set; } = 5;
        public string GradeScaleStandard { get; set; } = "10-Point CGPA (UGC / AICTE Standard)";
        public int ReEvaluationWindowDays { get; set; } = 15;
        public bool EnableDoubleEvaluation { get; set; } = false;
        public bool AllowNegativeMarking { get; set; } = false;
        public string? SettingsJson { get; set; }
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
