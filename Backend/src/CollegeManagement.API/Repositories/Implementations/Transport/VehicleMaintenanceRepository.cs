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

        private IDbConnection Connection() => _context.Database.GetDbConnection();

        public async Task<(IEnumerable<VehicleMaintenanceDto> Items, int TotalCount)> GetAllAsync(VehicleMaintenanceFilterDto filter)
        {
            using var c = Connection();
            var sql = @"
                SELECT 
                    m.MaintenanceId, m.VehicleId, v.VehicleRegistrationNo AS VehicleNumber,
                    m.ServiceType, m.ServiceDate, m.Cost, m.VendorCenter, m.NextServiceDue,
                    m.Remarks, m.Status
                FROM VehicleMaintenances m
                LEFT JOIN TransportVehicles v ON m.VehicleId = v.VehicleId
                WHERE m.IsDeleted = 0";
                
            var items = await c.QueryAsync<VehicleMaintenanceDto>(sql);
            var list = items.AsQueryable();

            if (filter.VehicleId.HasValue) list = list.Where(x => x.VehicleId == filter.VehicleId.Value);
            if (filter.FromDate.HasValue) list = list.Where(x => x.ServiceDate >= filter.FromDate.Value.Date);
            if (filter.ToDate.HasValue) list = list.Where(x => x.ServiceDate <= filter.ToDate.Value.Date);
            if (filter.Status.HasValue) list = list.Where(x => x.Status == (filter.Status.Value ? "Active" : "Inactive"));
            
            if (!string.IsNullOrWhiteSpace(filter.Search)) {
                var search = filter.Search.Trim().ToLower();
                list = list.Where(x => x.ServiceType != null && x.ServiceType.ToLower().Contains(search) || x.VendorCenter != null && x.VendorCenter.ToLower().Contains(search) || x.VehicleNumber != null && x.VehicleNumber.ToLower().Contains(search));
            }
            
            var totalCount = list.Count();
            var paged = list.OrderByDescending(x => x.ServiceDate).Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToList();
            
            return (paged, totalCount);
        }

        public async Task<VehicleMaintenanceDto?> GetByIdAsync(long maintenanceId)
        {
            using var c = Connection();
            var sql = @"
                SELECT 
                    m.MaintenanceId, m.VehicleId, v.VehicleRegistrationNo AS VehicleNumber,
                    m.ServiceType, m.ServiceDate, m.Cost, m.VendorCenter, m.NextServiceDue,
                    m.Remarks, m.Status
                FROM VehicleMaintenances m
                LEFT JOIN TransportVehicles v ON m.VehicleId = v.VehicleId
                WHERE m.IsDeleted = 0 AND m.MaintenanceId = @Id";
                
            return await c.QueryFirstOrDefaultAsync<VehicleMaintenanceDto>(sql, new { Id = maintenanceId });
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
                new { p_Id = maintenanceId },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }
        
        public async Task<IEnumerable<VehicleMaintenanceLookupDto>> GetLookupAsync()
        {
            using var c = Connection();
            var sql = "SELECT MaintenanceId, ServiceType FROM VehicleMaintenances WHERE IsDeleted = 0";
            return await c.QueryAsync<VehicleMaintenanceLookupDto>(sql);
        }
    }
}



