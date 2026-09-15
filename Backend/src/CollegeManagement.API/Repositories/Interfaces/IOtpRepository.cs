using System.Data;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IOtpRepository
    {
        Task AddAsync(OTP otp, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task<OTP?> GetLatestActiveOtpAsync(string email, string otpCode, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task<OTP?> GetByIdAsync(int otpId, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task UpdateAsync(OTP otp, IDbConnection? connection = null, IDbTransaction? transaction = null);
    }
}
