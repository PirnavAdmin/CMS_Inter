using System.Data;
using Dapper;
using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelDashboardRepository
        : IHostelDashboardRepository
    {
        private readonly IDbConnection _dbConnection;
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public HostelDashboardRepository(
            IDbConnection dbConnection,
            IHttpContextAccessor? httpContextAccessor = null)
        {
            _dbConnection = dbConnection;
            _httpContextAccessor = httpContextAccessor;
        }

        private int? ResolveCollegeId()
        {
            var claim = _httpContextAccessor?.HttpContext?.User?.FindFirst("CollegeId")?.Value
                     ?? _httpContextAccessor?.HttpContext?.User?.FindFirst("collegeId")?.Value;
            if (int.TryParse(claim, out int cid) && cid > 0) return cid;
            return null;
        }

        public async Task<HostelDashboardResponseDto>
            GetDashboardAsync(int? hostelId = null, int? campusId = null)
        {
            var collegeId = ResolveCollegeId();
            using var multi =
                await _dbConnection.QueryMultipleAsync(
                    "sp_GetHostelDashboard",
                    new
                    {
                        p_HostelId = hostelId,
                        p_CampusId = campusId,
                        p_CollegeId = collegeId
                    },
                    commandType: CommandType.StoredProcedure);

            var dashboard =
                await multi.ReadFirstOrDefaultAsync
                    <HostelDashboardResponseDto>()
                ?? new HostelDashboardResponseDto();

            var blocks =
                (await multi.ReadAsync
                    <HostelBlockDashboardDto>())
                .ToList();

            dashboard.Blocks = blocks;

            return dashboard;
        }
    }
}
