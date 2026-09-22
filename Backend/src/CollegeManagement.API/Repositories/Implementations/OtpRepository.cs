using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class OtpRepository : IOtpRepository
    {
        private readonly AppDbContext _context;
        public OtpRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task AddAsync(OTP otp, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            var id = await conn.ExecuteScalarAsync<int>(
                "usp_AddOtp",
                new
                {
                    p_Email = otp.Email,
                    p_OTPCode = otp.OTPCode,
                    p_ExpiryTime = otp.ExpiryTime,
                    p_IsUsed = otp.IsUsed
                },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);
            otp.OTPId = id;
        }

        public async Task<OTP?> GetLatestActiveOtpAsync(string email, string otpCode, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            return await conn.QueryFirstOrDefaultAsync<OTP>(
                "usp_GetLatestActiveOtp",
                new { p_Email = email, p_OTPCode = otpCode },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<OTP?> GetByIdAsync(int otpId, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            return await conn.QueryFirstOrDefaultAsync<OTP>(
                "SELECT * FROM OTPs WHERE OTPId = @OTPId LIMIT 1;",
                new { OTPId = otpId },
                transaction: transaction);
        }

        public async Task UpdateAsync(OTP otp, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            await conn.ExecuteAsync(
                "usp_UpdateOtp",
                new
                {
                    p_OTPId = otp.OTPId,
                    p_Email = otp.Email,
                    p_OTPCode = otp.OTPCode,
                    p_ExpiryTime = otp.ExpiryTime,
                    p_IsUsed = otp.IsUsed
                },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);
        }
    }
}
