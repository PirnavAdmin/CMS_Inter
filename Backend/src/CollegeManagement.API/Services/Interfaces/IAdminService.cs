using CollegeManagement.API.DTOs.Admin;
using CollegeManagement.API.DTOs.Authentication;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IAdminService
    {
        Task<IEnumerable<AdminDto>> GetAllAdminsAsync();
        Task<AdminDto?> GetAdminByIdAsync(int id);
        Task<AuthResult> LoginAsync(AdminLoginRequest request);
        Task<AdminDto> CreateAdminAsync(CreateAdminRequest request);
        Task<bool> UpdateStatusAsync(int id, bool isActive);
        Task<(bool Success, string Message)> ChangePasswordAsync(int userId, ChangePasswordRequest request);
        Task<AuthResult> ForgotPasswordAsync(ForgotPasswordRequest request);
        Task<AuthResult> VerifyOtpAsync(VerifyOtpRequest request);
        Task<AuthResult> ResetPasswordAsync(ResetPasswordRequest request);
    }
}
