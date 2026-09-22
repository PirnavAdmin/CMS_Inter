namespace CollegeManagement.API.DTOs.Authentication
{
    public class ResetPasswordRequest
    {
        public string Email { get; set; } = string.Empty;

        public string OTP { get; set; } = string.Empty;
        public string? ResetToken { get; set; }

        public string Password { get; set; } = string.Empty;

        public string ConfirmPassword { get; set; } = string.Empty;
    }
}