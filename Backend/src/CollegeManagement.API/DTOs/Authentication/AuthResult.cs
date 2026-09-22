namespace CollegeManagement.API.DTOs.Authentication
{
    public class AuthResult
    {
        public bool Status { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? AccessToken { get; set; }
        public int? UserId { get; set; }
        public string? Name { get; set; }
        public string? Role { get; set; }
        public string? Otp { get; set; }
        public string? ResetToken { get; set; }
    }
}
