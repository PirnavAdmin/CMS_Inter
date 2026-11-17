using System;
using System.Data;
using System.Data.Common;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Settings;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class LandingPageRepository : ILandingPageRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<LandingPageRepository>? _logger;

        public LandingPageRepository(AppDbContext context, ILogger<LandingPageRepository>? logger = null)
        {
            _context = context;
            _logger = logger;
        }

        private async Task<DbConnection> GetOpenConnectionAsync(CancellationToken ct = default)
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync(ct);
            }
            return conn;
        }

        public async Task<LandingPageConfigDto?> GetByCollegeIdAsync(int collegeId, CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var parameters = new DynamicParameters();
                parameters.Add("p_CollegeId", collegeId, DbType.Int32);

                return await conn.QueryFirstOrDefaultAsync<LandingPageConfigDto>(
                    new CommandDefinition(
                        "sp_LandingPageConfig_GetByCollegeId",
                        parameters,
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Failed to get landing page config for CollegeId {CollegeId}", collegeId);
                throw;
            }
        }

        public async Task<LandingPageConfigDto?> SaveAsync(SaveLandingPageConfigRequest request, int userId, CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var parameters = new DynamicParameters();
                parameters.Add("p_CollegeId", request.CollegeId ?? 1, DbType.Int32);
                parameters.Add("p_CampusId", request.CampusId, DbType.Int32);
                parameters.Add("p_CollegeName", request.CollegeName, DbType.String);
                parameters.Add("p_DashboardTitle", request.DashboardTitle ?? "COLLEGE", DbType.String);
                parameters.Add("p_DashboardSubtitle", request.DashboardSubtitle, DbType.String);
                parameters.Add("p_DashboardTagline", request.DashboardTagline, DbType.String);
                parameters.Add("p_DashboardTitleColor", request.DashboardTitleColor ?? "#1e3a8a", DbType.String);
                parameters.Add("p_DashboardSubtitleColor", request.DashboardSubtitleColor ?? "#d4a017", DbType.String);
                parameters.Add("p_DashboardTaglineColor", request.DashboardTaglineColor ?? "#6b7280", DbType.String);
                parameters.Add("p_DashboardTitleSize", request.DashboardTitleSize ?? "36", DbType.String);
                parameters.Add("p_DashboardSubtitleSize", request.DashboardSubtitleSize ?? "20", DbType.String);
                parameters.Add("p_DashboardTaglineSize", request.DashboardTaglineSize ?? "8", DbType.String);
                parameters.Add("p_DashboardTitleWeight", request.DashboardTitleWeight ?? "700", DbType.String);
                parameters.Add("p_DashboardSubtitleWeight", request.DashboardSubtitleWeight ?? "600", DbType.String);
                parameters.Add("p_DashboardTaglineWeight", request.DashboardTaglineWeight ?? "600", DbType.String);
                parameters.Add("p_DashboardTitleAlign", request.DashboardTitleAlign ?? "center", DbType.String);
                parameters.Add("p_DashboardSubtitleAlign", request.DashboardSubtitleAlign ?? "center", DbType.String);
                parameters.Add("p_DashboardTaglineAlign", request.DashboardTaglineAlign ?? "center", DbType.String);
                parameters.Add("p_DashboardLogoSize", request.DashboardLogoSize ?? "48", DbType.String);
                parameters.Add("p_LandingBadge", request.LandingBadge ?? "A Smarter Campus Starts Here", DbType.String);
                parameters.Add("p_LandingHeadline", request.LandingHeadline, DbType.String);
                parameters.Add("p_LandingDescription", request.LandingDescription, DbType.String);
                parameters.Add("p_LandingBenefit1", request.LandingBenefit1 ?? "Faster daily operations", DbType.String);
                parameters.Add("p_LandingBenefit2", request.LandingBenefit2 ?? "Clear academic visibility", DbType.String);
                parameters.Add("p_LandingBenefit3", request.LandingBenefit3 ?? "Better student outcomes", DbType.String);
                parameters.Add("p_LandingButton", request.LandingButton ?? "Get Started", DbType.String);
                parameters.Add("p_LandingLoginButton", request.LandingLoginButton ?? "Login", DbType.String);
                parameters.Add("p_FooterDescription", request.FooterDescription, DbType.String);
                parameters.Add("p_ContactAddress", request.ContactAddress, DbType.String);
                parameters.Add("p_ContactEmail", request.ContactEmail, DbType.String);
                parameters.Add("p_ContactPhone", request.ContactPhone, DbType.String);
                parameters.Add("p_DashboardLogo", request.DashboardLogo, DbType.String);
                parameters.Add("p_HeaderLogo", request.HeaderLogo, DbType.String);
                parameters.Add("p_FooterLogo", request.FooterLogo, DbType.String);
                parameters.Add("p_HeroImage", request.HeroImage, DbType.String);
                parameters.Add("p_UserId", userId, DbType.Int32);

                return await conn.QueryFirstOrDefaultAsync<LandingPageConfigDto>(
                    new CommandDefinition(
                        "sp_LandingPageConfig_Save",
                        parameters,
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Failed to save landing page config for CollegeId {CollegeId}", request.CollegeId);
                throw;
            }
        }

        public async Task<LandingPageConfigDto?> GetPublicAsync(string? collegeCode, int? collegeId, CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var parameters = new DynamicParameters();
                parameters.Add("p_CollegeCode", string.IsNullOrWhiteSpace(collegeCode) ? null : collegeCode.Trim(), DbType.String);
                parameters.Add("p_CollegeId", collegeId, DbType.Int32);

                return await conn.QueryFirstOrDefaultAsync<LandingPageConfigDto>(
                    new CommandDefinition(
                        "sp_LandingPageConfig_GetPublic",
                        parameters,
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Failed to get public landing page config for Code {CollegeCode}, Id {CollegeId}", collegeCode, collegeId);
                throw;
            }
        }
    }
}
