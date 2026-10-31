using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.StudentTransportAssignment;
using CollegeManagement.API.Dtos;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Common;
using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories.Implementations.Transport
{
    public class StudentTransportAssignmentRepository : IStudentTransportAssignmentRepository
    {
        private readonly AppDbContext _context;

        public StudentTransportAssignmentRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<PagedResult<StudentTransportAssignmentDto>> GetAllAsync(StudentTransportAssignmentFilterDto filter)
        {
            var c = Connection;
            var all = await c.QueryAsync<StudentTransportAssignmentDto>(
                "sp_GetStudentTransportAssignments",
                new
                {
                    p_AdmissionNo = filter.AdmissionNo,
                    p_RouteId = filter.RouteId,
                    p_PickupPointId = filter.PickupPointId,
                    p_VehicleAssignmentId = filter.VehicleAssignmentId,
                    p_TransportType = filter.TransportType,
                    p_Status = filter.Status.HasValue ? (filter.Status.Value ? (byte)1 : (byte)0) : (byte?)null,
                    p_Search = filter.Search ?? ""
                },
                commandType: CommandType.StoredProcedure);

            var totalCount = all.Count();
            var paged = all.Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToList();
            
            return new PagedResult<StudentTransportAssignmentDto> { Items = paged, TotalCount = totalCount, PageNumber = filter.PageNumber, PageSize = filter.PageSize };
        }

        public async Task<StudentTransportAssignmentDto?> GetByIdAsync(long assignmentId)
        {
            var c = Connection;
            return await c.QueryFirstOrDefaultAsync<StudentTransportAssignmentDto>(
                "sp_GetStudentTransportAssignmentById",
                new { p_Id = assignmentId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<long> CreateAsync(CreateStudentTransportAssignmentDto dto, long? userId)
        {
            var c = Connection;
            return await c.ExecuteScalarAsync<long>(
                "sp_CreateStudentTransportAssignments",
                new
                {
                    p_StudentId = (long?)null,
                    p_AdmissionNo = dto.AdmissionNo,
                    p_RouteId = dto.RouteId,
                    p_PickupPointId = dto.PickupPointId,
                    p_VehicleAssignmentId = dto.VehicleAssignmentId,
                    p_EffectiveFrom = dto.EffectiveFrom,
                    p_EffectiveTo = dto.EffectiveTo,
                    p_TransportType = dto.TransportType ?? "Both",
                    p_Remarks = dto.Remarks,
                    p_Status = dto.Status ? (byte)1 : (byte)0,
                    p_CreatedBy = userId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(long assignmentId, UpdateStudentTransportAssignmentDto dto, long? userId)
        {
            var c = Connection;
            var rows = await c.ExecuteAsync(
                "sp_UpdateStudentTransportAssignments",
                new
                {
                    p_StudentTransportAssignmentId = assignmentId,
                    p_StudentId = (long?)null,
                    p_AdmissionNo = dto.AdmissionNo,
                    p_RouteId = dto.RouteId,
                    p_PickupPointId = dto.PickupPointId,
                    p_VehicleAssignmentId = dto.VehicleAssignmentId,
                    p_EffectiveFrom = dto.EffectiveFrom,
                    p_EffectiveTo = dto.EffectiveTo,
                    p_TransportType = dto.TransportType ?? "Both",
                    p_Remarks = dto.Remarks,
                    p_Status = dto.Status ? (byte)1 : (byte)0,
                    p_UpdatedBy = userId
                },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(long assignmentId, long? userId)
        {
            var c = Connection;
            var rows = await c.ExecuteAsync(
                "sp_DeleteStudentTransportAssignments",
                new { p_StudentTransportAssignmentId = assignmentId, p_UpdatedBy = userId },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> HasOverlappingAssignmentAsync(string admissionNo, DateTime effectiveFrom, DateTime? effectiveTo, long? excludeAssignmentId = null)
        {
            var c = Connection;
            var count = await c.ExecuteScalarAsync<int>(
                "sp_CheckStudentTransportOverlapping",
                new
                {
                    p_AdmissionNo = admissionNo,
                    p_EffectiveFrom = effectiveFrom,
                    p_EffectiveTo = effectiveTo,
                    p_ExcludeAssignmentId = excludeAssignmentId
                },
                commandType: CommandType.StoredProcedure);
            return count > 0;
        }
        
        public async Task<IEnumerable<StudentTransportAssignmentLookupDto>> GetLookupAsync()
        {
            var c = Connection;
            return await c.QueryAsync<StudentTransportAssignmentLookupDto>(
                "sp_GetStudentTransportAssignmentLookup",
                commandType: CommandType.StoredProcedure);
        }

        public async Task<StudentTransportResponseDto?> GetStudentTransportDetailsAsync(int studentId)
        {
            var c = Connection;
            return await c.QueryFirstOrDefaultAsync<StudentTransportResponseDto>(
                "sp_GetStudentTransportDetails",
                new { p_StudentId = (long)studentId },
                commandType: CommandType.StoredProcedure);
        }
    }
}
