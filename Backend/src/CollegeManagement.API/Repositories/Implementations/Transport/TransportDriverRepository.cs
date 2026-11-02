using CollegeManagement.API.Data;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport.Driver;
using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories.Implementations.Transport
{
    public class TransportDriverRepository : ITransportDriverRepository
    {
        private readonly AppDbContext _context;

        public TransportDriverRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<PagedResult<TransportDriverDto>> GetAllAsync(TransportDriverFilterDto filter)
        {
            var c = Connection;
            using var multi = await c.QueryMultipleAsync(
                "sp_GetTransportDrivers",
                new
                {
                    p_Search = filter.Search ?? "",
                    p_Status = filter.Status.HasValue ? (filter.Status.Value ? (byte)1 : (byte)0) : (byte?)null,
                    p_CampusId = filter.CampusId,
                    p_PageNumber = filter.PageNumber > 0 ? filter.PageNumber : 1,
                    p_PageSize = filter.PageSize > 0 ? filter.PageSize : 20
                },
                commandType: CommandType.StoredProcedure);

            var totalCount = await multi.ReadFirstOrDefaultAsync<int>();
            var items = (await multi.ReadAsync<TransportDriverDto>()).ToList();

            return new PagedResult<TransportDriverDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = filter.PageNumber > 0 ? filter.PageNumber : 1,
                PageSize = filter.PageSize > 0 ? filter.PageSize : 20
            };
        }

        public async Task<TransportDriverDto?> GetByIdAsync(long driverId)
        {
            var c = Connection;
            return await c.QueryFirstOrDefaultAsync<TransportDriverDto>(
                "sp_GetTransportDriversById",
                new { p_Id = driverId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<long> CreateAsync(CreateTransportDriverDto dto, long? userId)
        {
            var c = Connection;
            var licNum = !string.IsNullOrWhiteSpace(dto.LicenseNumber) && !dto.LicenseNumber.Equals("string", System.StringComparison.OrdinalIgnoreCase)
                ? dto.LicenseNumber.Trim()
                : string.Empty;

            var driverName = !string.IsNullOrWhiteSpace(dto.DriverName) && !dto.DriverName.Equals("string", System.StringComparison.OrdinalIgnoreCase)
                ? dto.DriverName.Trim()
                : "Driver";

            return await c.ExecuteScalarAsync<long>(
                "sp_CreateTransportDrivers",
                new
                {
                    p_StaffId = dto.StaffId,
                    p_DriverName = driverName,
                    p_EmployeeId = dto.EmployeeId?.Trim(),
                    p_LicenseNo = licNum,
                    p_LicenseExpiry = dto.LicenseExpiryDate,
                    p_MobileNo = dto.MobileNumber?.Trim() ?? string.Empty,
                    p_AlternateMobileNo = dto.AlternateMobileNumber?.Trim() ?? string.Empty,
                    p_Email = dto.Email?.Trim(),
                    p_Address = dto.Address?.Trim() ?? string.Empty,
                    p_BloodGroup = dto.BloodGroup?.Trim() ?? string.Empty,
                    p_EmergencyContactName = dto.EmergencyContactName?.Trim() ?? string.Empty,
                    p_EmergencyContactNumber = dto.EmergencyContactNumber?.Trim() ?? string.Empty,
                    p_Experience = dto.ExperienceYears > 0 ? dto.ExperienceYears : 5,
                    p_AssignedVehicleId = dto.AssignedVehicleId,
                    p_Status = dto.Status ? (byte)1 : (byte)0,
                    p_CreatedBy = userId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(long driverId, UpdateTransportDriverDto dto, long? userId)
        {
            var c = Connection;
            var rows = await c.ExecuteAsync(
                "sp_UpdateTransportDrivers",
                new
                {
                    p_DriverId = driverId,
                    p_StaffId = dto.StaffId ?? driverId,
                    p_DriverName = dto.DriverName,
                    p_EmployeeId = dto.EmployeeId,
                    p_LicenseNo = dto.LicenseNumber,
                    p_LicenseExpiry = dto.LicenseExpiryDate,
                    p_MobileNo = dto.MobileNumber,
                    p_AlternateMobileNo = dto.AlternateMobileNumber,
                    p_Email = dto.Email,
                    p_Address = dto.Address,
                    p_BloodGroup = dto.BloodGroup,
                    p_EmergencyContactName = dto.EmergencyContactName,
                    p_EmergencyContactNumber = dto.EmergencyContactNumber,
                    p_Experience = dto.ExperienceYears,
                    p_AssignedVehicleId = dto.AssignedVehicleId,
                    p_Status = dto.Status ? (byte)1 : (byte)0,
                    p_UpdatedBy = userId
                },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(long driverId, long? userId)
        {
            var c = Connection;
            var rows = await c.ExecuteAsync(
                "sp_DeleteTransportDrivers",
                new { p_DriverId = driverId, p_UpdatedBy = userId },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> ExistsAsync(string licenceNumber, string mobileNumber, long? excludeDriverId = null)
        {
            var c = Connection;
            var count = await c.ExecuteScalarAsync<int>(
                "sp_CheckTransportDriverExists",
                new { p_LicenseNo = licenceNumber.Trim(), p_MobileNo = mobileNumber.Trim(), p_ExcludeId = excludeDriverId },
                commandType: CommandType.StoredProcedure);
            return count > 0;
        }

        public async Task<IEnumerable<TransportDriverLookupDto>> GetLookupAsync()
        {
            var c = Connection;
            return await c.QueryAsync<TransportDriverLookupDto>("sp_GetTransportDriverLookup", commandType: CommandType.StoredProcedure);
        }

        public async Task<TransportDriverDto?> GetByIdOrNumberAsync(string driverIdOrNumber)
        {
            if (string.IsNullOrWhiteSpace(driverIdOrNumber)) return null;
            var trimmed = driverIdOrNumber.Trim();
            var isNumeric = long.TryParse(trimmed, out var id);

            var c = Connection;
            return await c.QueryFirstOrDefaultAsync<TransportDriverDto>(
                "sp_GetTransportDriverByIdOrNumber",
                new { p_SearchId = isNumeric ? id : -1, p_SearchStr = trimmed },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<DriverDocumentDto>> GetDocumentsAsync(long driverId)
        {
            var c = Connection;
            return await c.QueryAsync<DriverDocumentDto>(
                "sp_GetDriverDocuments",
                new { p_DriverId = driverId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<DriverDocumentDto> CreateDocumentAsync(long driverId, DriverDocumentDto dto)
        {
            var c = Connection;
            var docId = await c.ExecuteScalarAsync<long>(
                "sp_CreateDriverDocument",
                new
                {
                    p_DriverId = driverId,
                    p_DocumentCategory = dto.DocumentCategory,
                    p_DocumentNumber = dto.DocumentNumber,
                    p_BadgeNumber = dto.BadgeNumber,
                    p_IssueDate = !string.IsNullOrWhiteSpace(dto.IssueDate) ? DateTime.Parse(dto.IssueDate) : (DateTime?)null,
                    p_ExpiryDate = !string.IsNullOrWhiteSpace(dto.ExpiryDate) ? DateTime.Parse(dto.ExpiryDate) : (DateTime?)null,
                    p_Status = dto.Status,
                    p_FileName = dto.FileName
                },
                commandType: CommandType.StoredProcedure);

            dto.Id = docId;
            return dto;
        }

        public async Task<bool> DeleteDocumentAsync(long documentId, long driverId)
        {
            var c = Connection;
            var rows = await c.ExecuteScalarAsync<int>(
                "sp_DeleteDriverDocument",
                new { p_DocumentId = documentId, p_DriverId = driverId },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }
    }
}
