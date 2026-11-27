using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Dapper;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelFeeConfigRepository : IHostelFeeConfigRepository
    {
        private readonly IDbConnection _dbConnection;
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public HostelFeeConfigRepository(IDbConnection dbConnection, IHttpContextAccessor? httpContextAccessor = null)
        {
            _dbConnection = dbConnection;
            _httpContextAccessor = httpContextAccessor;
        }

        private int? ResolveCollegeId()
        {
            return CampusContextResolver.ResolveCollegeId(_httpContextAccessor?.HttpContext?.User);
        }

        public async Task<int> CreateAsync(CreateHostelFeeConfigRequest request)
        {
            return await _dbConnection.QuerySingleAsync<int>(
                "sp_CreateHostelFeeConfig",
                new
                {
                    p_HostelId = request.HostelId,
                    p_RoomTypeId = request.RoomTypeId,
                    p_FeeFrequency = request.FeeFrequency,
                    p_HostelFeeAmount = request.HostelFeeAmount,
                    p_SecurityDeposit = request.SecurityDeposit,
                    p_EffectiveDate = request.EffectiveDate,
                    p_Status = request.Status,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<HostelFeeConfigDto>> GetAllAsync(int? hostelId, string? status, int? campusId = null, int? boardId = null, int? academicYearId = null)
        {
            if (campusId == TenantIsolationActionFilter.NoCampusSentinel)
            {
                return Enumerable.Empty<HostelFeeConfigDto>();
            }

            return await _dbConnection.QueryAsync<HostelFeeConfigDto>(
                "sp_GetHostelFeeConfigs",
                new
                {
                    p_HostelId = hostelId,
                    p_Status = status,
                    p_CampusId = campusId,
                    p_BoardId = boardId,
                    p_AcademicYearId = academicYearId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelFeeConfigDto?> GetByIdAsync(int feeConfigId)
        {
            return await _dbConnection.QuerySingleOrDefaultAsync<HostelFeeConfigDto>(
                "sp_GetHostelFeeConfigById",
                new
                {
                    p_FeeConfigId = feeConfigId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(int feeConfigId, UpdateHostelFeeConfigRequest request)
        {
            var affectedRows = await _dbConnection.ExecuteAsync(
                "sp_UpdateHostelFeeConfig",
                new
                {
                    p_FeeConfigId = feeConfigId,
                    p_HostelId = request.HostelId,
                    p_RoomTypeId = request.RoomTypeId,
                    p_FeeFrequency = request.FeeFrequency,
                    p_HostelFeeAmount = request.HostelFeeAmount,
                    p_SecurityDeposit = request.SecurityDeposit,
                    p_EffectiveDate = request.EffectiveDate,
                    p_Status = request.Status,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);
            return affectedRows > 0;
        }

        public async Task<bool> DeleteAsync(int feeConfigId)
        {
            var affectedRows = await _dbConnection.ExecuteAsync(
                "sp_DeleteHostelFeeConfig",
                new
                {
                    p_FeeConfigId = feeConfigId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);
            return affectedRows > 0;
        }
    }
}
