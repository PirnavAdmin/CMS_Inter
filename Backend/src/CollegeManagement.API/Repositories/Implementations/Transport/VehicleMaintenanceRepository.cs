using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.VehicleMaintenance;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Common;
using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Data;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Implementations.Transport
{
    public class VehicleMaintenanceRepository : IVehicleMaintenanceRepository
    {
        private readonly AppDbContext _context;

        public VehicleMaintenanceRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection() => new MySqlConnector.MySqlConnection(_context.Database.GetConnectionString());

        public async Task<(IEnumerable<VehicleMaintenanceDto> Items, int TotalCount)> GetAllAsync(VehicleMaintenanceFilterDto filter)
        {
            using var c = Connection();
            var all = await c.QueryAsync<VehicleMaintenanceDto>(
                "sp_GetVehicleMaintenances",
                new
                {
                    p_VehicleId = filter.VehicleId,
                    p_FromDate = filter.FromDate?.Date,
                    p_ToDate = filter.ToDate?.Date,
                    p_Status = filter.Status,
                    p_Search = filter.Search ?? ""
                },
                commandType: CommandType.StoredProcedure);

            var totalCount = all.Count();
            var paged = all.Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToList();
            
            return (paged, totalCount);
        }

        public async Task<VehicleMaintenanceDto?> GetByIdAsync(long maintenanceId)
        {
            using var c = Connection();
            return await c.QueryFirstOrDefaultAsync<VehicleMaintenanceDto>(
                "sp_GetVehicleMaintenanceById",
                new { p_Id = maintenanceId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<long> CreateAsync(CreateVehicleMaintenanceDto dto, long createdBy)
        {
            using var c = Connection();
            return await c.ExecuteScalarAsync<long>(
                "sp_CreateVehicleMaintenances",
                new
                {
                    p_VehicleId = dto.VehicleId,
                    p_ServiceType = dto.ServiceType ?? "Routine",
                    p_ServiceDate = dto.ServiceDate,
                    p_Cost = dto.Cost,
                    p_VendorCenter = dto.VendorCenter,
                    p_NextServiceDue = dto.NextServiceDue,
                    p_Remarks = dto.Remarks,
                    p_Status = dto.Status,
                    p_CreatedBy = createdBy,
                    p_UpdatedBy = (long?)null
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(long maintenanceId, UpdateVehicleMaintenanceDto dto, long updatedBy)
        {
            using var c = Connection();
            var rows = await c.ExecuteAsync(
                "sp_UpdateVehicleMaintenances",
                new
                {
                    p_Id = maintenanceId,
                    p_VehicleId = dto.VehicleId,
                    p_ServiceType = dto.ServiceType ?? "Routine",
                    p_ServiceDate = dto.ServiceDate,
                    p_Cost = dto.Cost,
                    p_VendorCenter = dto.VendorCenter,
                    p_NextServiceDue = dto.NextServiceDue,
                    p_Remarks = dto.Remarks,
                    p_Status = dto.Status,
                    p_CreatedBy = (long?)null,
                    p_UpdatedBy = updatedBy
                },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(long maintenanceId, long updatedBy)
        {
            using var c = Connection();
            var rows = await c.ExecuteAsync(
                "sp_DeleteVehicleMaintenances",
                new { p_Id = maintenanceId, p_UpdatedBy = updatedBy },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }
        
        public async Task<IEnumerable<VehicleMaintenanceLookupDto>> GetLookupAsync()
        {
            using var c = Connection();
            return await c.QueryAsync<VehicleMaintenanceLookupDto>(
                "sp_GetVehicleMaintenanceLookup",
                commandType: CommandType.StoredProcedure);
        }
    }
}
