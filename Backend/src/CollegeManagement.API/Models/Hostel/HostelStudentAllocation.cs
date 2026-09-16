using System;

namespace CollegeManagement.API.Models.Hostel
{
    public class HostelStudentAllocation
    {
        public int AllocationId { get; set; }

        public int StudentId { get; set; }

        public int HostelId { get; set; }

        public int RoomId { get; set; }

        public int BedId { get; set; }

        public int? WardenAssignmentId { get; set; }

        public DateTime JoiningDate { get; set; }

        public string Status { get; set; } = "Active";

        public string? Remarks { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }

        // Joined / display fields
        public string? AdmissionNo { get; set; }

        public string? RollNo { get; set; }

        public string? StudentName { get; set; }

        public string? HostelName { get; set; }

        public string? HostelCode { get; set; }

        public string? HostelType { get; set; }

        public string? RoomNumber { get; set; }

        public string? FloorLevel { get; set; }

        public string? RoomTypeSpecification { get; set; }

        public string? BedNumber { get; set; }

        public string? BedStatus { get; set; }

        public string? WardenName { get; set; }
    }
}