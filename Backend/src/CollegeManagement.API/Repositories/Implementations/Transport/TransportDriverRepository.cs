using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport;
using CollegeManagement.API.Dtos.Transport.Attendant;
using CollegeManagement.API.Dtos.Transport.Dashboard;
using CollegeManagement.API.Dtos.Transport.Driver;
using CollegeManagement.API.Dtos.Transport.Operations;
using CollegeManagement.API.Dtos.Transport.PickupPoint;
using CollegeManagement.API.Dtos.Transport.Reports;
using CollegeManagement.API.Dtos.Transport.StudentTransportAssignment;
using CollegeManagement.API.Dtos.Transport.Vehicle;
using CollegeManagement.API.Dtos.Transport.VehicleAssignment;
using CollegeManagement.API.Dtos.Transport.VehicleMaintenance;

using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace CollegeManagement.API.Repositories.Implementations.Transport
{
    public class TransportDriverRepository : ITransportDriverRepository
    {
        private readonly AppDbContext _context;

        public TransportDriverRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection() => _context.Database.GetDbConnection();

        public async Task<PagedResult<TransportDriverDto>> GetAllAsync(TransportDriverFilterDto filter)
        {
            using var c = Connection();
            var all = await c.QueryAsync<TransportDriverDto>(
                "sp_GetTransportDrivers",
                new { p_Search = filter.Search ?? "" },
                commandType: CommandType.StoredProcedure);
            
            if (filter.Status.HasValue) all = all.Where(x => x.Status == (filter.Status.Value ? "Active" : "Inactive"));
            
            var totalCount = all.Count();
            
            // Pagination in memory because Dapper SP returns everything for simplicity
            var items = all
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToList();
                
            return new PagedResult<TransportDriverDto> { Items = items, TotalCount = totalCount, PageNumber = filter.PageNumber, PageSize = filter.PageSize };
        }

        public async Task<TransportDriverDto?> GetByIdAsync(long driverId)
        {
            using var c = Connection();
            return await c.QueryFirstOrDefaultAsync<TransportDriverDto>(
                "sp_GetTransportDriversById",
                new { p_Id = driverId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<long> CreateAsync(CreateTransportDriverDto dto, long? userId)
        {
            using var c = Connection();
            var rand = Random.Shared.Next(1000, 9999);
            var empId = !string.IsNullOrWhiteSpace(dto.EmployeeId) && !dto.EmployeeId.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.EmployeeId.Trim() : $"DRV-{rand}";
            var licNum = !string.IsNullOrWhiteSpace(dto.LicenceNumber) && !dto.LicenceNumber.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.LicenceNumber.Trim() : $"LIC-{rand}";
            var mobNum = !string.IsNullOrWhiteSpace(dto.MobileNumber) && !dto.MobileNumber.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.MobileNumber.Trim() : $"98765{rand}";

            var driverName = !string.IsNullOrWhiteSpace(dto.DriverName) && !dto.DriverName.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.DriverName.Trim() : "Driver";

            return await c.ExecuteScalarAsync<long>(
                "sp_CreateTransportDrivers",
                new
                {
                    p_DriverName = driverName,
                    p_EmployeeId = empId,
                    p_MobileNumber = mobNum,
                    p_AlternateMobileNumber = dto.AlternateMobileNumber?.Trim() ?? string.Empty,
                    p_Email = dto.Email?.Trim(),
                    p_LicenceNumber = licNum,
                    p_LicenceExpiry = dto.LicenceExpiry,
                    p_Address = dto.Address?.Trim() ?? string.Empty,
                    p_BloodGroup = dto.BloodGroup?.Trim() ?? string.Empty,
                    p_EmergencyContactName = dto.EmergencyContactName?.Trim() ?? string.Empty,
                    p_EmergencyContactNumber = dto.EmergencyContactNumber?.Trim() ?? string.Empty,
                    
                    p_Status = dto.Status,
                    p_CreatedBy = userId,
                    p_UpdatedBy = (long?)null
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(long driverId, UpdateTransportDriverDto dto, long? userId)
        {
            using var c = Connection();
            var rows = await c.ExecuteAsync(
                "sp_UpdateTransportDrivers",
                new
                {
                    p_Id = driverId,
                    p_DriverName = dto.DriverName,
                    p_EmployeeId = dto.EmployeeId,
                    p_MobileNumber = dto.MobileNumber,
                    p_AlternateMobileNumber = dto.AlternateMobileNumber,
                    p_Email = dto.Email,
                    p_LicenceNumber = dto.LicenceNumber,
                    p_LicenceExpiry = dto.LicenceExpiry,
                    p_Address = dto.Address,
                    p_BloodGroup = dto.BloodGroup,
                    p_EmergencyContactName = dto.EmergencyContactName,
                    p_EmergencyContactNumber = dto.EmergencyContactNumber,
                    
                    p_Status = dto.Status,
                    p_CreatedBy = (long?)null,
                    p_UpdatedBy = userId
                },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(long driverId, long? userId)
        {
            using var c = Connection();
            var rows = await c.ExecuteAsync(
                "sp_DeleteTransportDrivers",
                new { p_Id = driverId },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> ExistsAsync(string licenceNumber, string mobileNumber, long? excludeDriverId = null)
        {
            using var c = Connection();
            var sql = "SELECT COUNT(*) FROM TransportDrivers WHERE IsDeleted = 0 AND (LOWER(LicenceNumber) = @Licence OR LOWER(MobileNumber) = @Mobile) AND (@ExcludeId IS NULL OR DriverId != @ExcludeId)";
            var count = await c.ExecuteScalarAsync<int>(sql, new { Licence = licenceNumber.Trim().ToLower(), Mobile = mobileNumber.Trim().ToLower(), ExcludeId = excludeDriverId });
            return count > 0;
        }

        public async Task<IEnumerable<TransportDriverLookupDto>> GetLookupAsync()
        {
            using var c = Connection();
            var sql = "SELECT DriverId, DriverName, MobileNumber, LicenceNumber FROM TransportDrivers WHERE IsDeleted = 0 AND Status = 1 ORDER BY DriverName";
            return await c.QueryAsync<TransportDriverLookupDto>(sql);
        }

        public async Task<TransportDriverDto?> GetByIdOrNumberAsync(string driverIdOrNumber)
        {
            using var c = Connection();
            var sql = "SELECT * FROM TransportDrivers WHERE IsDeleted = 0 AND (DriverId = @Search OR LOWER(LicenceNumber) = @SearchStr OR LOWER(DriverName) = @SearchStr OR LOWER(MobileNumber) = @SearchStr) LIMIT 1";
            return await c.QueryFirstOrDefaultAsync<TransportDriverDto>(sql, new { Search = long.TryParse(driverIdOrNumber, out var id) ? id : -1, SearchStr = driverIdOrNumber.Trim().ToLower() });
        }
    }
}






