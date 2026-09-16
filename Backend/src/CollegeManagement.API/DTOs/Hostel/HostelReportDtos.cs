namespace CollegeManagement.API.DTOs.Hostel
{
    public class HostelOccupancyReportDto
    {
        public int HostelId { get; set; }
        public string? HostelName { get; set; }
        public string? HostelCode { get; set; }
        public string? HostelType { get; set; }

        public int TotalRooms { get; set; }
        public int TotalBeds { get; set; }
        public int OccupiedBeds { get; set; }
        public int AvailableBeds { get; set; }
        public int ActiveStudents { get; set; }

        public decimal OccupancyPercentage { get; set; }
    }

    public class HostelStudentReportDto
    {
        public int AllocationId { get; set; }

        public int StudentId { get; set; }
        public string? AdmissionNo { get; set; }
        public string? RollNo { get; set; }
        public string? StudentName { get; set; }

        public int HostelId { get; set; }
        public string? HostelName { get; set; }
        public string? HostelCode { get; set; }

        public int RoomId { get; set; }
        public string? RoomNumber { get; set; }

        public int BedId { get; set; }
        public string? BedNumber { get; set; }

        public DateTime JoiningDate { get; set; }

        public string? Status { get; set; }

        public string? WardenName { get; set; }
    }

    public class HostelAttendanceReportDto
    {
        public int AttendanceId { get; set; }

        public int StudentId { get; set; }
        public string? AdmissionNo { get; set; }
        public string? RollNo { get; set; }
        public string? StudentName { get; set; }

        public string? HostelName { get; set; }
        public string? RoomNumber { get; set; }
        public string? BedNumber { get; set; }

        public DateTime AttendanceDate { get; set; }

        public string? Session { get; set; }

        public string? AttendanceStatus { get; set; }

        public string? WardenName { get; set; }
    }

    public class HostelOutpassLeaveReportDto
    {
        public int RequestId { get; set; }

        public int StudentId { get; set; }
        public string? AdmissionNo { get; set; }
        public string? RollNo { get; set; }
        public string? StudentName { get; set; }

        public string? HostelName { get; set; }
        public string? RoomNumber { get; set; }

        public string? RequestType { get; set; }

        public DateTime FromDateTime { get; set; }
        public DateTime ToDateTime { get; set; }

        public string? Reason { get; set; }
        public string? Destination { get; set; }

        public string? ApprovalStatus { get; set; }

        public string? WardenName { get; set; }
    }

    public class HostelTransferVacateReportDto
    {
        public int RequestId { get; set; }

        public int AllocationId { get; set; }

        public int StudentId { get; set; }
        public string? AdmissionNo { get; set; }
        public string? RollNo { get; set; }
        public string? StudentName { get; set; }

        public string? RequestType { get; set; }

        public string? FromHostelName { get; set; }
        public string? FromRoomNumber { get; set; }
        public string? FromBedNumber { get; set; }

        public string? ToHostelName { get; set; }
        public string? ToRoomNumber { get; set; }
        public string? ToBedNumber { get; set; }

        public DateTime RequestDate { get; set; }
        public DateTime? EffectiveDate { get; set; }

        public string? ApprovalStatus { get; set; }

        public string? FeeSettlementStatus { get; set; }

        public decimal RefundAmount { get; set; }

        public decimal AdditionalChargeAmount { get; set; }

        public DateTime? CompletedAt { get; set; }
    }
}