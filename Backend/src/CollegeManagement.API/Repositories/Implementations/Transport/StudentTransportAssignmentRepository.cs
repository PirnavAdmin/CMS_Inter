using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.StudentTransportAssignment;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Common;
using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Data;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Implementations.Transport
{
    public class StudentTransportAssignmentRepository : IStudentTransportAssignmentRepository
    {
        private readonly AppDbContext _context;

        public StudentTransportAssignmentRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection() => _context.Database.GetDbConnection();

        public async Task<PagedResult<StudentTransportAssignmentDto>> GetAllAsync(StudentTransportAssignmentFilterDto filter)
        {
            using var c = Connection();
            var sql = @"
                SELECT 
                    s.StudentTransportId AS AssignmentId, s.AdmissionNo, 
                    s.RouteId, r.RouteName,
                    s.PickupPointId, p.StopName AS PickupPointName,
                    s.VehicleAssignmentId, v.VehicleRegistrationNo AS VehicleNumber,
                    s.EffectiveFrom, s.EffectiveTo, s.TransportType, 
                    s.Status, s.Status AS StatusText, s.Remarks
                FROM StudentTransportAssignments s
                LEFT JOIN TransportRoutes r ON s.RouteId = r.RouteId
                LEFT JOIN PickupPoints p ON s.PickupPointId = p.PickupPointId
                LEFT JOIN TransportVehicleAssignments va ON s.VehicleAssignmentId = va.AssignmentId
                LEFT JOIN TransportVehicles v ON va.VehicleId = v.VehicleId
                WHERE s.IsDeleted = 0";
                
            var items = await c.QueryAsync<StudentTransportAssignmentDto>(sql);
            var list = items.AsQueryable();

            if (!string.IsNullOrWhiteSpace(filter.AdmissionNo)) list = list.Where(x => x.AdmissionNo == filter.AdmissionNo.Trim());
            if (filter.RouteId.HasValue) list = list.Where(x => x.RouteId == filter.RouteId.Value);
            if (filter.PickupPointId.HasValue) list = list.Where(x => x.PickupPointId == filter.PickupPointId.Value);
            if (filter.VehicleAssignmentId.HasValue) list = list.Where(x => x.VehicleAssignmentId == filter.VehicleAssignmentId.Value);
            if (!string.IsNullOrWhiteSpace(filter.TransportType)) list = list.Where(x => x.TransportType == filter.TransportType);
            if (filter.Status.HasValue) list = list.Where(x => x.Status == filter.Status.Value);
            
            if (!string.IsNullOrWhiteSpace(filter.Search)) {
                var search = filter.Search.Trim().ToLower();
                list = list.Where(x => x.AdmissionNo.ToLower().Contains(search) || x.RouteName != null && x.RouteName.ToLower().Contains(search) || x.PickupPointName != null && x.PickupPointName.ToLower().Contains(search) || x.VehicleNumber != null && x.VehicleNumber.ToLower().Contains(search));
            }
            
            var totalCount = list.Count();
            var paged = list.Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToList();
            
            return new PagedResult<StudentTransportAssignmentDto> { Items = paged, TotalCount = totalCount, PageNumber = filter.PageNumber, PageSize = filter.PageSize };
        }

        public async Task<StudentTransportAssignmentDto?> GetByIdAsync(long assignmentId)
        {
            using var c = Connection();
            var sql = @"
                SELECT 
                    s.StudentTransportId AS AssignmentId, s.AdmissionNo, 
                    s.RouteId, r.RouteName,
                    s.PickupPointId, p.StopName AS PickupPointName,
                    s.VehicleAssignmentId, v.VehicleRegistrationNo AS VehicleNumber,
                    s.EffectiveFrom, s.EffectiveTo, s.TransportType, 
                    s.Status, s.Status AS StatusText, s.Remarks
                FROM StudentTransportAssignments s
                LEFT JOIN TransportRoutes r ON s.RouteId = r.RouteId
                LEFT JOIN PickupPoints p ON s.PickupPointId = p.PickupPointId
                LEFT JOIN TransportVehicleAssignments va ON s.VehicleAssignmentId = va.AssignmentId
                LEFT JOIN TransportVehicles v ON va.VehicleId = v.VehicleId
                WHERE s.IsDeleted = 0 AND s.StudentTransportId = @Id";
                
            return await c.QueryFirstOrDefaultAsync<StudentTransportAssignmentDto>(sql, new { Id = assignmentId });
        }

        public async Task<long> CreateAsync(CreateStudentTransportAssignmentDto dto, long? userId)
        {
            using var c = Connection();
            return await c.ExecuteScalarAsync<long>(
                "sp_CreateStudentTransportAssignments",
                new
                {
                    p_AdmissionNo = dto.AdmissionNo,
                    p_RouteId = dto.RouteId,
                    p_PickupPointId = dto.PickupPointId,
                    p_VehicleAssignmentId = dto.VehicleAssignmentId,
                    p_EffectiveFrom = dto.EffectiveFrom,
                    p_EffectiveTo = dto.EffectiveTo,
                    p_TransportType = dto.TransportType ?? "TwoWay",
                    p_Remarks = dto.Remarks,
                    p_Status = dto.Status,
                    p_IsDeleted = false,
                    p_CreatedBy = userId,
                    p_UpdatedBy = (long?)null
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(long assignmentId, UpdateStudentTransportAssignmentDto dto, long? userId)
        {
            using var c = Connection();
            var rows = await c.ExecuteAsync(
                "sp_UpdateStudentTransportAssignments",
                new
                {
                    p_Id = assignmentId,
                    p_AdmissionNo = dto.AdmissionNo,
                    p_RouteId = dto.RouteId,
                    p_PickupPointId = dto.PickupPointId,
                    p_VehicleAssignmentId = dto.VehicleAssignmentId,
                    p_EffectiveFrom = dto.EffectiveFrom,
                    p_EffectiveTo = dto.EffectiveTo,
                    p_TransportType = dto.TransportType ?? "TwoWay",
                    p_Remarks = dto.Remarks,
                    p_Status = dto.Status,
                    p_IsDeleted = false,
                    p_CreatedBy = (long?)null,
                    p_UpdatedBy = userId
                },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(long assignmentId, long? userId)
        {
            using var c = Connection();
            var rows = await c.ExecuteAsync("sp_DeleteStudentTransportAssignments", new { p_Id = assignmentId }, commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> HasActiveAssignmentAsync(string admissionNo, long? excludeAssignmentId = null)
        {
            return await HasOverlappingAssignmentAsync(admissionNo, DateTime.UtcNow, null, excludeAssignmentId);
        }
        
        public async Task<bool> HasOverlappingAssignmentAsync(string admissionNo, DateTime effectiveFrom, DateTime? effectiveTo, long? excludeAssignmentId = null)
        {
            using var c = Connection();
            var sql = "SELECT COUNT(*) FROM StudentTransportAssignments WHERE IsDeleted = 0 AND Status = 1 AND AdmissionNo = @Adm AND (@ExcludeId IS NULL OR StudentTransportId != @ExcludeId) AND (EffectiveTo IS NULL OR EffectiveTo >= @From) AND (@To IS NULL OR EffectiveFrom <= @To)";
            return await c.ExecuteScalarAsync<int>(sql, new { Adm = admissionNo, ExcludeId = excludeAssignmentId, From = effectiveFrom, To = effectiveTo }) > 0;
        }
        
        public async Task<IEnumerable<StudentTransportAssignmentLookupDto>> GetLookupAsync()
        {
            using var c = Connection();
            var sql = "SELECT StudentTransportId AS AssignmentId, AdmissionNo FROM StudentTransportAssignments WHERE IsDeleted = 0 AND Status = 1";
            return await c.QueryAsync<StudentTransportAssignmentLookupDto>(sql);
        }
    }
}



