using System;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.Attendance.Responses
{
    /// <summary>
    /// Response DTO containing detailed information about a student's attendance.
    /// </summary>
    public class AttendanceResponse
    {
        /// <summary>
        /// Gets or sets the unique identifier of the attendance record.
        /// </summary>
        public int AttendanceId { get; set; }

        /// <summary>
        /// Gets or sets the unique identifier of the attendance session.
        /// </summary>
        public int AttendanceSessionId { get; set; }

        /// <summary>
        /// Gets or sets the date and time of the attendance.
        /// </summary>
        public DateTime AttendanceDate { get; set; }

        /// <summary>
        /// Gets or sets the unique identifier of the student.
        /// </summary>
        public int StudentId { get; set; }

        /// <summary>
        /// Gets or sets the name of the student.
        /// </summary>
        public string StudentName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the roll number of the student.
        /// </summary>
        public string RollNumber { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the unique identifier of the faculty member who took the attendance.
        /// </summary>
        public int FacultyId { get; set; }

        /// <summary>
        /// Gets or sets the name of the faculty member.
        /// </summary>
        public string FacultyName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the unique identifier of the academic board.
        /// </summary>
        public int BoardId { get; set; }

        /// <summary>
        /// Gets or sets the name of the academic board.
        /// </summary>
        public string BoardName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the unique identifier of the academic year.
        /// </summary>
        public int AcademicYearId { get; set; }

        /// <summary>
        /// Gets or sets the name of the academic year.
        /// </summary>
        public string AcademicYearName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the unique identifier of the academic level.
        /// </summary>
        public int AcademicLevelId { get; set; }

        /// <summary>
        /// Gets or sets the name of the academic level.
        /// </summary>
        public string AcademicLevelName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the unique identifier of the student group.
        /// </summary>
        public int GroupId { get; set; }

        /// <summary>
        /// Gets or sets the name of the student group.
        /// </summary>
        public string GroupName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the unique identifier of the section.
        /// </summary>
        public int SectionId { get; set; }

        /// <summary>
        /// Gets or sets the name of the section.
        /// </summary>
        public string SectionName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the unique identifier of the subject.
        /// </summary>
        public int SubjectId { get; set; }

        /// <summary>
        /// Gets or sets the name of the subject.
        /// </summary>
        public string SubjectName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the attendance status.
        /// </summary>
        public AttendanceStatus Status { get; set; }

        /// <summary>
        /// Gets or sets any remarks or notes for the attendance.
        /// </summary>
        public string? Remarks { get; set; }

        /// <summary>
        /// Gets or sets the date and time when the attendance record was created.
        /// </summary>
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// Gets or sets the date and time when the attendance record was last updated.
        /// </summary>
        public DateTime? UpdatedAt { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the attendance record is active.
        /// </summary>
        public bool IsActive { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the attendance session is locked.
        /// </summary>
        public bool IsLocked { get; set; }

        /// <summary>
        /// Gets or sets the user ID who locked the session.
        /// </summary>
        public int? LockedBy { get; set; }

        /// <summary>
        /// Gets or sets the date and time when the session was locked.
        /// </summary>
        public DateTime? LockedAt { get; set; }

    }
}
