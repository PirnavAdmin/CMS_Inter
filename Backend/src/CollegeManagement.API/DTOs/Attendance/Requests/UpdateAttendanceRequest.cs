using System;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.Attendance.Requests
{
    /// <summary>
    /// Request DTO for updating an existing attendance record.
    /// </summary>
    public class UpdateAttendanceRequest
    {
        // Legacy single-record update
        public int AttendanceId { get; set; }
        public AttendanceStatus Status { get; set; }
        public string? Remarks { get; set; }

        // Admin Session-wise update
        public int? StudentId { get; set; }
        public DateTime? AttendanceDate { get; set; }
        public int? BoardId { get; set; }
        public int? AcademicYearId { get; set; }
        public int? AcademicLevelId { get; set; }
        public int? GroupId { get; set; }
        public int? ProgramId { get; set; }
        public int? SectionId { get; set; }

        public AttendanceStatus? MorningStatus { get; set; }
        public AttendanceStatus? AfternoonStatus { get; set; }
    }
}
