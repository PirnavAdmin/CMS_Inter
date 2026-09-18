using System;

namespace CollegeManagement.API.Models.Hostel
{
    public class HostelAttendance
    {
        public int AttendanceId { get; set; }

        public int StudentId { get; set; }

        public int HostelId { get; set; }

        public int RoomId { get; set; }

        public int BedId { get; set; }

        public int? WardenAssignmentId { get; set; }

        public DateTime AttendanceDate { get; set; }

        public string Session { get; set; } = string.Empty;

        public string AttendanceStatus { get; set; } = string.Empty;

        public string? Remarks { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }


        // Joined / Display fields

        public string? AdmissionNo { get; set; }

        public string? RollNo { get; set; }

        public string? StudentName { get; set; }

        public string? HostelName { get; set; }

        public string? HostelCode { get; set; }

        public string? HostelType { get; set; }

        public string? RoomNumber { get; set; }

        public string? FloorLevel { get; set; }

        public string? BedNumber { get; set; }

        public string? WardenName { get; set; }
    }
}
