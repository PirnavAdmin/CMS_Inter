using CollegeManagement.API.DTOs.Authentication;
using CollegeManagement.API.DTOs.AcademicYear;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResult> LoginAsync(LoginRequest request);
        Task<AuthResult> RegisterAsync(RegisterRequest request);
        Task<AuthResult> ForgotPasswordAsync(ForgotPasswordRequest request);
        Task<AuthResult> VerifyOtpAsync(VerifyOtpRequest request);
        Task<AuthResult> ResetPasswordAsync(ResetPasswordRequest request);
        Task<(bool Success, string Message)> ChangePasswordAsync(int userId, string oldPassword, string newPassword, string confirmPassword);
        Task<List<UserDto>> GetAllUsersAsync();
        Task<UserDto?> GetUserByIdAsync(int id);
    }
}
