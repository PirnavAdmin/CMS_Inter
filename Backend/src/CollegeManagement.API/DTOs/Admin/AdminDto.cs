namespace CollegeManagement.API.DTOs.Admin
{
    public class AdminDto
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? PhotoPath { get; set; }
        public int? RoleId { get; set; } = 2;
        public string? RoleName { get; set; } = "Admin";
        public bool IsActive { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
