using System.Data;
using Dapper;
using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelDashboardRepository
        : IHostelDashboardRepository
    {
        private readonly IDbConnection _dbConnection;

        public HostelDashboardRepository(
            IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<HostelDashboardResponseDto>
            GetDashboardAsync(int? hostelId = null)
        {
            using var multi =
                await _dbConnection.QueryMultipleAsync(
                    "sp_GetHostelDashboard",
                    new
                    {
                        p_HostelId = hostelId
                    },
                    commandType: CommandType.StoredProcedure);

            var dashboard =
                await multi.ReadFirstAsync
                    <HostelDashboardResponseDto>();

            var blocks =
                (await multi.ReadAsync
                    <HostelBlockDashboardDto>())
                .ToList();

            dashboard.Blocks = blocks;

            return dashboard;
        }
    }
}
