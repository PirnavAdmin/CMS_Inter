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
        public decimal MinAttendancePercent { get; set; } = 75.00m;
        public decimal CondonationThreshold { get; set; } = 65.00m;
        public bool IncludePrincipalSign { get; set; } = true;
        public int AutoLockSeatingHours { get; set; } = 24;
        public bool AllowManualHallTicketRelease { get; set; } = true;
        public bool SmsAlertsOnPublish { get; set; } = true;
        public bool EmailMarksheetCopy { get; set; } = true;
        public bool RestrictResultsForFeeDue { get; set; } = false;
        public bool AutoArchivePastExams { get; set; } = true;
        public DateTime? UpdatedAt { get; set; }
    }
}
