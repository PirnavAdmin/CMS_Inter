
using System;

namespace CollegeManagement.API.DTOs.Attendance.Responses
{
    public class AttendanceDefaulterResponse
    {
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string RollNumber { get; set; } = string.Empty;
        public string AdmissionNumber { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public double AttendancePercentage { get; set; }
        public double ShortagePercentage { get; set; }
    }
}
