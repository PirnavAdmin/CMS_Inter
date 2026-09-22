namespace CollegeManagement.API.DTOs.Examination.Responses
{
    public class AvailableHallDto
    {
        public int RoomId { get; set; }
        public int Id { get => RoomId; set => RoomId = value; }
        public string RoomCode { get; set; } = string.Empty;
        public string RoomNumber { get => RoomCode; set => RoomCode = value; }
        public string RoomName { get; set; } = string.Empty;
        public string Name { get => RoomName; set => RoomName = value; }
        public string? BlockName { get; set; }
        public string? Floor { get; set; }
        public int Capacity { get; set; }
        public string RoomType { get; set; } = "Classroom";
        public bool IsActive { get; set; } = true;
        public bool IsAvailable { get; set; } = true;
    }
}
