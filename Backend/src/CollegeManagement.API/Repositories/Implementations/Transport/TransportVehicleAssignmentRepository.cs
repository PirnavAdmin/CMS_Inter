namespace CollegeManagement.API.Repositories.Implementations.Transport
{
    using System;
    using System.Collections.Generic;
    using System.Data;
    using System.Linq;
    using System.Threading.Tasks;
    using Dapper;
    using Microsoft.EntityFrameworkCore;
    using CollegeManagement.API.Data;
    using CollegeManagement.API.Dtos.Transport.VehicleAssignment;
    using CollegeManagement.API.Repositories.Interfaces;
    using CollegeManagement.API.Common;

    public class TransportVehicleAssignmentRepository : ITransportVehicleAssignmentRepository
    {
        private readonly AppDbContext _context;
        public TransportVehicleAssignmentRepository(AppDbContext context) { _context = context; }
        private IDbConnection Connection() => new MySqlConnector.MySqlConnection(_context.Database.GetConnectionString());

        public async Task<PagedResult<TransportVehicleAssignmentDto>> GetAllAsync(TransportVehicleAssignmentFilterDto filter)
        {
            using var c = Connection();
            var all = await c.QueryAsync<TransportVehicleAssignmentDto>(
                "sp_GetTransportVehicleAssignments",
                new
                {
                    p_RouteId = filter.RouteId,
                    p_VehicleId = filter.VehicleId,
                    p_DriverId = filter.DriverId,
                    p_Status = filter.Status,
                    p_Search = filter.Search ?? ""
                },
                commandType: CommandType.StoredProcedure);

            var totalCount = all.Count();
            var paged = all.Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToList();
            
            return new PagedResult<TransportVehicleAssignmentDto> { Items = paged, TotalCount = totalCount, PageNumber = filter.PageNumber, PageSize = filter.PageSize };
        }

        public async Task<TransportVehicleAssignmentDto?> GetByIdAsync(long assignmentId)
        {
            using var c = Connection();
            return await c.QueryFirstOrDefaultAsync<TransportVehicleAssignmentDto>(
                "sp_GetTransportVehicleAssignmentById",
                new { p_Id = assignmentId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<long> CreateAsync(CreateTransportVehicleAssignmentDto dto, long? userId)
        {
            using var c = Connection();
            return await c.ExecuteScalarAsync<long>(
                "sp_CreateTransportVehicleAssignments",
                new
                {
                    p_RouteId = dto.RouteId,
                    p_VehicleId = dto.VehicleId,
                    p_DriverId = dto.DriverId,
                    p_EffectiveFrom = dto.EffectiveFrom,
                    p_EffectiveTo = dto.EffectiveTo,
                    p_Shift = dto.Shift ?? "Morning",
                    p_Remarks = dto.Remarks,
                    p_Status = dto.Status,
                    p_IsActive = true,
                    p_AttendantId = dto.AttendantId > 0 ? dto.AttendantId : (long?)null,
                    p_MorningTripTime = dto.MorningTripTime,
                    p_EveningTripTime = dto.EveningTripTime,
                    p_CreatedBy = userId,
                    p_UpdatedBy = (long?)null
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(long assignmentId, UpdateTransportVehicleAssignmentDto dto, long? userId)
        {
            using var c = Connection();
            var rows = await c.ExecuteAsync(
                "sp_UpdateTransportVehicleAssignments",
                new
                {
                    p_Id = assignmentId,
                    p_RouteId = dto.RouteId,
                    p_VehicleId = dto.VehicleId,
                    p_DriverId = dto.DriverId,
                    p_EffectiveFrom = dto.EffectiveFrom,
                    p_EffectiveTo = dto.EffectiveTo,
                    p_Shift = dto.Shift ?? "Morning",
                    p_Remarks = dto.Remarks,
                    p_Status = dto.Status,
                    p_IsActive = true,
                    p_AttendantId = dto.AttendantId > 0 ? dto.AttendantId : (long?)null,
                    p_MorningTripTime = dto.MorningTripTime,
                    p_EveningTripTime = dto.EveningTripTime,
                    p_CreatedBy = (long?)null,
                    p_UpdatedBy = userId
                },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(long assignmentId, long? userId)
        {
            using var c = Connection();
            var rows = await c.ExecuteAsync(
                "sp_DeleteTransportVehicleAssignments",
                new { p_Id = assignmentId, p_UpdatedBy = userId },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> IsVehicleAssignedAsync(long vehicleId, DateTime effectiveFrom, DateTime? effectiveTo, long? excludeAssignmentId = null)
        {
            using var c = Connection();
            var count = await c.ExecuteScalarAsync<int>(
                "sp_CheckTransportVehicleAssigned",
                new { p_VehicleId = vehicleId, p_EffectiveFrom = effectiveFrom, p_EffectiveTo = effectiveTo, p_ExcludeAssignmentId = excludeAssignmentId },
                commandType: CommandType.StoredProcedure);
            return count > 0;
        }

        public async Task<bool> IsDriverAssignedAsync(long driverId, DateTime effectiveFrom, DateTime? effectiveTo, long? excludeAssignmentId = null)
        {
            using var c = Connection();
            var count = await c.ExecuteScalarAsync<int>(
                "sp_CheckTransportDriverAssigned",
                new { p_DriverId = driverId, p_EffectiveFrom = effectiveFrom, p_EffectiveTo = effectiveTo, p_ExcludeAssignmentId = excludeAssignmentId },
                commandType: CommandType.StoredProcedure);
            return count > 0;
        }

        public async Task<IEnumerable<TransportVehicleAssignmentLookupDto>> GetLookupAsync()
        {
            using var c = Connection();
            return await c.QueryAsync<TransportVehicleAssignmentLookupDto>(
                "sp_GetTransportVehicleAssignmentLookup",
                commandType: CommandType.StoredProcedure);
        }
    }
}
