namespace CollegeManagement.API.DTOs.Admin
{
    public class AdminDto
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public int? RoleId { get; set; }
        public string? RoleName { get; set; }
        public bool IsActive { get; set; }
    }
}
