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
        private IDbConnection Connection() => _context.Database.GetDbConnection();

        public async Task<PagedResult<TransportVehicleAssignmentDto>> GetAllAsync(TransportVehicleAssignmentFilterDto filter)
        {
            using var c = Connection();
            var sql = @"
                SELECT 
                    a.AssignmentId, 
                    a.RouteId, r.RouteName,
                    a.VehicleId, v.VehicleNumber AS VehicleNumber,
                    a.DriverId, 
                    CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS DriverName,
                    st.Mobile AS DriverMobile,
                    a.AttendantId, att.AttendantName,
                    a.EffectiveFrom, a.EffectiveTo, a.Shift, a.Status, a.Remarks,
                    (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudents
                FROM TransportVehicleAssignments a
                LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
                LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
                LEFT JOIN Staff st ON a.DriverId = st.Id
                LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
                WHERE a.IsDeleted = 0";
                
            var items = await c.QueryAsync<TransportVehicleAssignmentDto>(sql);
            var list = items.AsQueryable();

            if (filter.RouteId.HasValue) list = list.Where(x => x.RouteId == filter.RouteId.Value);
            if (filter.VehicleId.HasValue) list = list.Where(x => x.VehicleId == filter.VehicleId.Value);
            if (filter.DriverId.HasValue) list = list.Where(x => x.DriverId == filter.DriverId.Value);
            if (filter.Status.HasValue) list = list.Where(x => x.Status == filter.Status.Value);
            
            if (!string.IsNullOrWhiteSpace(filter.Search)) {
                var search = filter.Search.Trim().ToLower();
                list = list.Where(x => x.RouteName != null && x.RouteName.ToLower().Contains(search) || x.VehicleNumber != null && x.VehicleNumber.ToLower().Contains(search) || x.DriverName != null && x.DriverName.ToLower().Contains(search));
            }
            
            var totalCount = list.Count();
            var paged = list.Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToList();
            
            return new PagedResult<TransportVehicleAssignmentDto> { Items = paged, TotalCount = totalCount, PageNumber = filter.PageNumber, PageSize = filter.PageSize };
        }

        public async Task<TransportVehicleAssignmentDto?> GetByIdAsync(long assignmentId)
        {
            using var c = Connection();
            var sql = @"
                SELECT 
                    a.AssignmentId, 
                    a.RouteId, r.RouteName,
                    a.VehicleId, v.VehicleNumber AS VehicleNumber,
                    a.DriverId, CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS DriverName,
                    a.AttendantId, att.AttendantName,
                    a.EffectiveFrom, a.EffectiveTo, a.Shift, a.Status, a.Remarks,
                    (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudents
                FROM TransportVehicleAssignments a
                LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
                LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
                LEFT JOIN Staff st ON a.DriverId = st.Id
                LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
                WHERE a.IsDeleted = 0 AND a.AssignmentId = @Id";
                
            return await c.QueryFirstOrDefaultAsync<TransportVehicleAssignmentDto>(sql, new { Id = assignmentId });
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
                    p_AttendantId = (long?)null,
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
                    p_AttendantId = (long?)null,
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
                new { p_Id = assignmentId },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> IsVehicleAssignedAsync(long vehicleId, DateTime effectiveFrom, DateTime? effectiveTo, long? excludeAssignmentId = null)
        {
            using var c = Connection();
            var sql = @"SELECT COUNT(*) FROM TransportVehicleAssignments WHERE IsDeleted = 0 AND Status = 1 AND VehicleId = @Vid AND (@ExcludeId IS NULL OR AssignmentId != @ExcludeId) AND (EffectiveTo IS NULL OR EffectiveTo >= @From) AND (@To IS NULL OR EffectiveFrom <= @To)";
            return await c.ExecuteScalarAsync<int>(sql, new { Vid = vehicleId, ExcludeId = excludeAssignmentId, From = effectiveFrom, To = effectiveTo }) > 0;
        }

        public async Task<bool> IsDriverAssignedAsync(long driverId, DateTime effectiveFrom, DateTime? effectiveTo, long? excludeAssignmentId = null)
        {
            using var c = Connection();
            var sql = @"SELECT COUNT(*) FROM TransportVehicleAssignments WHERE IsDeleted = 0 AND Status = 1 AND DriverId = @Did AND (@ExcludeId IS NULL OR AssignmentId != @ExcludeId) AND (EffectiveTo IS NULL OR EffectiveTo >= @From) AND (@To IS NULL OR EffectiveFrom <= @To)";
            return await c.ExecuteScalarAsync<int>(sql, new { Did = driverId, ExcludeId = excludeAssignmentId, From = effectiveFrom, To = effectiveTo }) > 0;
        }

        public async Task<IEnumerable<TransportVehicleAssignmentLookupDto>> GetLookupAsync()
        {
            using var c = Connection();
            var sql = @"
                SELECT 
                    a.AssignmentId, 
                    a.RouteId, r.RouteName,
                    a.VehicleId, v.VehicleNumber AS VehicleNumber,
                    a.DriverId, CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS DriverName
                FROM TransportVehicleAssignments a
                LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
                LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
                LEFT JOIN Staff st ON a.DriverId = st.Id
                WHERE a.IsDeleted = 0 AND a.Status = 1";
            
            var items = await c.QueryAsync<dynamic>(sql);
            return items.Select(x => new TransportVehicleAssignmentLookupDto {
                AssignmentId = x.AssignmentId,
                RouteName = x.RouteName ?? "",
                VehicleNumber = x.VehicleNumber ?? "",
                DriverName = x.DriverName ?? ""
            });
        }
    }
}
