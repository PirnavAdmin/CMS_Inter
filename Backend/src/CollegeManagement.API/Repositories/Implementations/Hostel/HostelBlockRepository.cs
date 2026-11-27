using System.Data;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Dapper;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelBlockRepository : IHostelBlockRepository
    {
        private readonly IDbConnection _dbConnection;
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public HostelBlockRepository(IDbConnection dbConnection, IHttpContextAccessor? httpContextAccessor = null)
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

        public async Task<IEnumerable<HostelBlock>> GetAllAsync(
            string? search = null,
            string? status = null,
            int? campusId = null)
        {
            if (campusId == Filters.TenantIsolationActionFilter.NoCampusSentinel)
            {
                return Enumerable.Empty<HostelBlock>();
            }

            var collegeId = ResolveCollegeId();

            return await _dbConnection.QueryAsync<HostelBlock>(
                "sp_GetHostelBlocks",
                new
                {
                    p_Search = search,
                    p_Status = status,
                    p_CampusId = campusId,
                    p_CollegeId = collegeId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelBlock?> GetByIdAsync(int hostelId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelBlock>(
                "sp_GetHostelBlockById",
                new
                {
                    p_HostelId = hostelId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelBlock?> GetByCodeAsync(string hostelCode, int? campusId = null)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelBlock>(
                "sp_GetHostelBlockByCode",
                new
                {
                    p_HostelCode = hostelCode,
                    p_CampusId = campusId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> CreateAsync(HostelBlock hostelBlock)
        {
            var collegeId = hostelBlock.CollegeId > 0 ? hostelBlock.CollegeId : ResolveCollegeId();

            return await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CreateHostelBlock",
                new
                {
                    p_CampusId = hostelBlock.CampusId,
                    p_CollegeId = collegeId,
                    p_HostelName = hostelBlock.HostelName,
                    p_HostelCode = hostelBlock.HostelCode,
                    p_HostelType = hostelBlock.HostelType,
                    p_TotalFloors = hostelBlock.TotalFloors,
                    p_WardenName = hostelBlock.WardenName,
                    p_PrimaryMobileNumber = hostelBlock.PrimaryMobileNumber,
                    p_AlternateMobileNumber = hostelBlock.AlternateMobileNumber,
                    p_Email = hostelBlock.Email,
                    p_Status = hostelBlock.Status,
                    p_Address = hostelBlock.Address
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(HostelBlock hostelBlock)
        {
            var affectedRows = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_UpdateHostelBlock",
                new
                {
                    p_HostelId = hostelBlock.HostelId,
                    p_CampusId = hostelBlock.CampusId,
                    p_CollegeId = ResolveCollegeId(),
                    p_HostelName = hostelBlock.HostelName,
                    p_HostelCode = hostelBlock.HostelCode,
                    p_HostelType = hostelBlock.HostelType,
                    p_TotalFloors = hostelBlock.TotalFloors,
                    p_WardenName = hostelBlock.WardenName,
                    p_PrimaryMobileNumber = hostelBlock.PrimaryMobileNumber,
                    p_AlternateMobileNumber = hostelBlock.AlternateMobileNumber,
                    p_Email = hostelBlock.Email,
                    p_Status = hostelBlock.Status,
                    p_Address = hostelBlock.Address
                },
                commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        public async Task<bool> DeleteAsync(int hostelId)
        {
            var affectedRows = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_DeleteHostelBlock",
                new
                {
                    p_HostelId = hostelId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        public async Task<bool> ExistsAsync(int hostelId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelBlockExists",
                new
                {
                    p_HostelId = hostelId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }
    }
}
