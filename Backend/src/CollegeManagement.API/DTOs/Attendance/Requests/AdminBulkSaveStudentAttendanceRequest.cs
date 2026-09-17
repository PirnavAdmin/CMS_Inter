using System;
using System.Collections.Generic;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.Attendance.Requests
{
    /// <summary>
    /// Request DTO for Admin session-based student attendance bulk save.
    /// </summary>
    public class AdminBulkSaveStudentAttendanceRequest
    {
        public DateTime AttendanceDate { get; set; }
        public int? BoardId { get; set; }
        public int? AcademicYearId { get; set; }
        public int? AcademicLevelId { get; set; }
        public int? GroupId { get; set; }
        public int? ProgramId { get; set; }
        public int? SectionId { get; set; }
        public List<AdminStudentSessionAttendanceItem> Attendances { get; set; } = new();
    }

    /// <summary>
    /// Attendance record per student for Morning and Afternoon sessions.
    /// </summary>
    public class AdminStudentSessionAttendanceItem
    {
        public int StudentId { get; set; }
        public AttendanceStatus? MorningStatus { get; set; }
        public AttendanceStatus? AfternoonStatus { get; set; }
        public string? Remarks { get; set; }
    }
}
