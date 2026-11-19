using System;

namespace CollegeManagement.API.DTOs.Roles
{
    public class UpdateUserStatusRequest
    {
        public bool IsActive { get; set; }
        public string? Reason { get; set; }
    }

    public class UpdateUserStatusResponse
    {
        public int UserId { get; set; }
        public bool IsActive { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; }
    }

    public class UserStatusInfoDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }
}
