using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.Vehicle;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Common;
using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace CollegeManagement.API.Repositories.Implementations.Transport
{
    public class TransportVehicleRepository : ITransportVehicleRepository
    {
        private readonly AppDbContext _context;

        public TransportVehicleRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection() => _context.Database.GetDbConnection();

        public async Task<PagedResult<TransportVehicleDto>> GetAllAsync(TransportVehicleFilterDto filter)
        {
            using var c = Connection();
            var items = await c.QueryAsync<TransportVehicleDto>("sp_GetTransportVehicles", new { p_Search = filter.Search ?? "" }, commandType: CommandType.StoredProcedure);
            
            var list = items.AsQueryable();
            if (filter.Status.HasValue) list = list.Where(x => x.Status == (filter.Status.Value ? "Active" : "Inactive"));
            
            var totalCount = list.Count();
            var paged = list.Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToList();
            return new PagedResult<TransportVehicleDto> { Items = paged, TotalCount = totalCount, PageNumber = filter.PageNumber, PageSize = filter.PageSize };
        }

        public async Task<TransportVehicleDto?> GetByIdAsync(long vehicleId)
        {
            using var c = Connection();
            return await c.QueryFirstOrDefaultAsync<TransportVehicleDto>("sp_GetTransportVehiclesById", new { p_Id = vehicleId }, commandType: CommandType.StoredProcedure);
        }

        public async Task<long> CreateAsync(CreateTransportVehicleDto dto, long? userId)
        {
            using var c = Connection();
            return await c.ExecuteScalarAsync<long>(
                "sp_CreateTransportVehicles",
                new
                {
                    p_VehicleNumber = dto.VehicleNumber,
                    p_VehicleType = dto.VehicleType,
                    p_Capacity = dto.Capacity,
                    p_IsActive = dto.Status,
                    p_VehicleRegistrationNo = dto.RegistrationNumber,
                    p_MaximumCapacity = dto.Capacity,
                    p_Make = dto.Manufacturer,
                    p_Model = dto.Model,
                    p_YearOfManufacture = (int?)null,
                    p_ChassisNumber = dto.ChassisNumber,
                    p_EngineNumber = dto.EngineNumber,
                    p_InsuranceExpiry = dto.InsuranceExpiry,
                    p_FitnessExpiry = dto.FitnessExpiry,
                    p_PollutionExpiry = dto.PollutionExpiry,
                    p_RoadTaxExpiry = (DateTime?)null,
                    p_Status = dto.Status,
                    p_CreatedBy = userId,
                    p_UpdatedBy = (long?)null
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(long vehicleId, UpdateTransportVehicleDto dto, long? userId)
        {
            using var c = Connection();
            var rows = await c.ExecuteAsync(
                "sp_UpdateTransportVehicles",
                new
                {
                    p_Id = vehicleId,
                    p_VehicleNumber = dto.VehicleNumber,
                    p_VehicleType = dto.VehicleType,
                    p_Capacity = dto.Capacity,
                    p_IsActive = dto.Status,
                    p_VehicleRegistrationNo = dto.RegistrationNumber,
                    p_MaximumCapacity = dto.Capacity,
                    p_Make = dto.Manufacturer,
                    p_Model = dto.Model,
                    p_YearOfManufacture = (int?)null,
                    p_ChassisNumber = dto.ChassisNumber,
                    p_EngineNumber = dto.EngineNumber,
                    p_InsuranceExpiry = dto.InsuranceExpiry,
                    p_FitnessExpiry = dto.FitnessExpiry,
                    p_PollutionExpiry = dto.PollutionExpiry,
                    p_RoadTaxExpiry = (DateTime?)null,
                    p_Status = dto.Status,
                    p_CreatedBy = (long?)null,
                    p_UpdatedBy = userId
                },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(long vehicleId, long? userId)
        {
            using var c = Connection();
            var rows = await c.ExecuteAsync("sp_DeleteTransportVehicles", new { p_Id = vehicleId }, commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<IEnumerable<TransportVehicleLookupDto>> GetLookupAsync()
        {
            using var c = Connection();
            var sql = "SELECT VehicleId, VehicleNumber FROM TransportVehicles WHERE IsDeleted = 0";
            return await c.QueryAsync<TransportVehicleLookupDto>(sql);
        }

        public async Task<TransportVehicleDto?> GetByIdOrNumberAsync(string vehicleIdOrNumber)
        {
            using var c = Connection();
            var sql = "SELECT * FROM TransportVehicles WHERE IsDeleted = 0 AND (VehicleId = @Search OR LOWER(VehicleNumber) = @SearchStr OR LOWER(VehicleRegistrationNo) = @SearchStr) LIMIT 1";
            var id = long.TryParse(vehicleIdOrNumber.Trim(), out var i) ? i : -1;
            return await c.QueryFirstOrDefaultAsync<TransportVehicleDto>(sql, new { Search = id, SearchStr = vehicleIdOrNumber.Trim().ToLower() });
        }

        public async Task<bool> ExistsAsync(string vehicleNumber, string registrationNumber, long? excludeVehicleId = null)
        {
            using var c = Connection();
            var sql = "SELECT COUNT(*) FROM TransportVehicles WHERE IsDeleted = 0 AND (LOWER(VehicleNumber) = @Num OR LOWER(VehicleRegistrationNo) = @Reg) AND (@ExcludeId IS NULL OR VehicleId != @ExcludeId)";
            var count = await c.ExecuteScalarAsync<int>(sql, new { Num = vehicleNumber.Trim().ToLower(), Reg = registrationNumber.Trim().ToLower(), ExcludeId = excludeVehicleId });
            return count > 0;
        }
    }
}




