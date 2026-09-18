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

        private IDbConnection Connection() => new MySqlConnector.MySqlConnection(_context.Database.GetConnectionString());

        public async Task<PagedResult<StudentTransportAssignmentDto>> GetAllAsync(StudentTransportAssignmentFilterDto filter)
        {
            using var c = Connection();
            var all = await c.QueryAsync<StudentTransportAssignmentDto>(
                "sp_GetStudentTransportAssignments",
                new
                {
                    p_AdmissionNo = filter.AdmissionNo,
                    p_RouteId = filter.RouteId,
                    p_PickupPointId = filter.PickupPointId,
                    p_VehicleAssignmentId = filter.VehicleAssignmentId,
                    p_TransportType = filter.TransportType,
                    p_Status = filter.Status,
                    p_Search = filter.Search ?? ""
                },
                commandType: CommandType.StoredProcedure);

            var totalCount = all.Count();
            var paged = all.Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToList();
            
            return new PagedResult<StudentTransportAssignmentDto> { Items = paged, TotalCount = totalCount, PageNumber = filter.PageNumber, PageSize = filter.PageSize };
        }

        public async Task<StudentTransportAssignmentDto?> GetByIdAsync(long assignmentId)
        {
            using var c = Connection();
            return await c.QueryFirstOrDefaultAsync<StudentTransportAssignmentDto>(
                "sp_GetStudentTransportAssignmentById",
                new { p_Id = assignmentId },
                commandType: CommandType.StoredProcedure);
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
            var rows = await c.ExecuteAsync(
                "sp_DeleteStudentTransportAssignments",
                new { p_Id = assignmentId, p_UpdatedBy = userId },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> HasActiveAssignmentAsync(string admissionNo, long? excludeAssignmentId = null)
        {
            return await HasOverlappingAssignmentAsync(admissionNo, DateTime.UtcNow, null, excludeAssignmentId);
        }
        
        public async Task<bool> HasOverlappingAssignmentAsync(string admissionNo, DateTime effectiveFrom, DateTime? effectiveTo, long? excludeAssignmentId = null)
        {
            using var c = Connection();
            var count = await c.ExecuteScalarAsync<int>(
                "sp_CheckStudentTransportOverlapping",
                new { p_AdmissionNo = admissionNo, p_EffectiveFrom = effectiveFrom, p_EffectiveTo = effectiveTo, p_ExcludeAssignmentId = excludeAssignmentId },
                commandType: CommandType.StoredProcedure);
            return count > 0;
        }
        
        public async Task<IEnumerable<StudentTransportAssignmentLookupDto>> GetLookupAsync()
        {
            using var c = Connection();
            return await c.QueryAsync<StudentTransportAssignmentLookupDto>(
                "sp_GetStudentTransportAssignmentLookup",
                commandType: CommandType.StoredProcedure);
        }
    }
}
