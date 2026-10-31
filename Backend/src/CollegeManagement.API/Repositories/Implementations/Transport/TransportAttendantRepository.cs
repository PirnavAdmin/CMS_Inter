using CollegeManagement.API.Data;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport.Attendant;
using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories.Implementations.Transport
{
    public class TransportAttendantRepository : ITransportAttendantRepository
    {
        private readonly AppDbContext _context;

        public TransportAttendantRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<PagedResult<TransportAttendantDto>> GetAllAsync(TransportAttendantFilterDto filter)
        {
            var c = Connection;
            var all = await c.QueryAsync<TransportAttendantDto>(
                "sp_GetTransportAttendants",
                new 
                { 
                    p_Search = filter.Search ?? "",
                    p_Status = filter.Status.HasValue ? (filter.Status.Value ? (byte)1 : (byte)0) : (byte?)null,
                    p_CampusId = (int?)null
                },
                commandType: CommandType.StoredProcedure);
                
            var list = all.AsQueryable();
            if (filter.Status.HasValue) list = list.Where(x => x.Status == (filter.Status.Value ? "Active" : "Inactive"));
            
            var totalCount = list.Count();
            var paged = list.Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToList();
            
            return new PagedResult<TransportAttendantDto> { Items = paged, TotalCount = totalCount, PageNumber = filter.PageNumber, PageSize = filter.PageSize };
        }

        public async Task<TransportAttendantDto?> GetByIdAsync(long attendantId)
        {
            var c = Connection;
            return await c.QueryFirstOrDefaultAsync<TransportAttendantDto>(
                "sp_GetTransportAttendantById",
                new { p_Id = attendantId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<long> CreateAsync(CreateTransportAttendantDto dto, long? userId)
        {
            var c = Connection;
            return await c.ExecuteScalarAsync<long>(
                "sp_CreateTransportAttendants",
                new
                {
                    p_StaffId = dto.StaffId,
                    p_EmployeeId = dto.EmployeeId?.Trim(),
                    p_AttendantName = dto.AttendantName?.Trim() ?? string.Empty,
                    p_MobileNumber = dto.MobileNumber?.Trim() ?? string.Empty,
                    p_Gender = dto.Gender?.Trim(),
                    p_BranchName = dto.BranchCampus?.Trim(),
                    p_AlternateMobileNumber = dto.AlternateMobileNumber?.Trim(),
                    p_Address = dto.Address?.Trim(),
                    p_BloodGroup = dto.BloodGroup?.Trim(),
                    p_EmergencyContactName = dto.EmergencyContactName?.Trim(),
                    p_EmergencyContactNumber = dto.EmergencyContactNumber?.Trim(),
                    p_AssignedVehicleId = dto.AssignedVehicleId > 0 ? dto.AssignedVehicleId : (long?)null,
                    p_Status = dto.Status ? (byte)1 : (byte)0,
                    p_CreatedBy = userId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(long attendantId, UpdateTransportAttendantDto dto, long? userId)
        {
            var c = Connection;
            var rows = await c.ExecuteAsync(
                "sp_UpdateTransportAttendants",
                new
                {
                    p_AttendantId = attendantId,
                    p_StaffId = dto.StaffId,
                    p_EmployeeId = dto.EmployeeId?.Trim(),
                    p_AttendantName = dto.AttendantName?.Trim() ?? string.Empty,
                    p_MobileNumber = dto.MobileNumber?.Trim() ?? string.Empty,
                    p_Gender = dto.Gender?.Trim(),
                    p_BranchName = dto.BranchCampus?.Trim(),
                    p_AlternateMobileNumber = dto.AlternateMobileNumber?.Trim(),
                    p_Address = dto.Address?.Trim(),
                    p_BloodGroup = dto.BloodGroup?.Trim(),
                    p_EmergencyContactName = dto.EmergencyContactName?.Trim(),
                    p_EmergencyContactNumber = dto.EmergencyContactNumber?.Trim(),
                    p_AssignedVehicleId = dto.AssignedVehicleId > 0 ? dto.AssignedVehicleId : (long?)null,
                    p_Status = dto.Status ? (byte)1 : (byte)0,
                    p_UpdatedBy = userId
                },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(long attendantId, long? userId)
        {
            var c = Connection;
            var rows = await c.ExecuteAsync(
                "sp_DeleteTransportAttendants",
                new { p_AttendantId = attendantId, p_UpdatedBy = userId },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<IEnumerable<TransportAttendantLookupDto>> GetLookupAsync()
        {
            var c = Connection;
            return await c.QueryAsync<TransportAttendantLookupDto>("sp_GetTransportAttendantLookup", commandType: CommandType.StoredProcedure);
        }

        public async Task<TransportAttendantDto?> GetByIdOrNameAsync(string attendantIdOrName)
        {
            if (string.IsNullOrWhiteSpace(attendantIdOrName)) return null;
            string search = attendantIdOrName.Trim();
            
            var id = long.TryParse(search, out long attendantId) ? attendantId : -1;
            
            var c = Connection;
            return await c.QueryFirstOrDefaultAsync<TransportAttendantDto>(
                "sp_GetTransportAttendantByIdOrName",
                new { p_SearchId = id, p_SearchStr = search },
                commandType: CommandType.StoredProcedure);
        }
    }
}
