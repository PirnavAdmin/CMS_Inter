using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.Vehicle;
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
    public class TransportVehicleRepository : ITransportVehicleRepository
    {
        private readonly AppDbContext _context;

        public TransportVehicleRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<PagedResult<TransportVehicleDto>> GetAllAsync(TransportVehicleFilterDto filter)
        {
            var c = Connection;
            var items = await c.QueryAsync<TransportVehicleDto>(
                "sp_GetTransportVehicles", 
                new 
                { 
                    p_Search = filter.Search ?? "", 
                    p_VehicleType = (string?)null,
                    p_Status = filter.Status.HasValue ? (filter.Status.Value ? (byte)1 : (byte)0) : (byte?)null,
                    p_CampusId = filter.CampusId 
                }, 
                commandType: CommandType.StoredProcedure);
            
            var list = items.AsQueryable();
            if (filter.Status.HasValue) list = list.Where(x => x.Status == (filter.Status.Value ? "Active" : "Inactive"));
            
            var totalCount = list.Count();
            var paged = list.Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToList();
            return new PagedResult<TransportVehicleDto> { Items = paged, TotalCount = totalCount, PageNumber = filter.PageNumber, PageSize = filter.PageSize };
        }

        public async Task<TransportVehicleDto?> GetByIdAsync(long vehicleId)
        {
            var c = Connection;
            return await c.QueryFirstOrDefaultAsync<TransportVehicleDto>(
                "sp_GetTransportVehiclesById", 
                new { p_Id = vehicleId }, 
                commandType: CommandType.StoredProcedure);
        }

        public async Task<long> CreateAsync(CreateTransportVehicleDto dto, long? userId)
        {
            var c = Connection;
            return await c.ExecuteScalarAsync<long>(
                "sp_CreateTransportVehicles",
                new
                {
                    p_VehicleNumber = dto.VehicleNumber,
                    p_VehicleRegistrationNo = dto.RegistrationNumber,
                    p_VehicleName = dto.VehicleNumber,
                    p_VehicleType = dto.VehicleType,
                    p_Make = dto.Manufacturer,
                    p_Model = dto.Model,
                    p_ChassisNumber = dto.ChassisNumber,
                    p_EngineNumber = dto.EngineNumber,
                    p_GpsDeviceId = dto.GpsDeviceId,
                    p_InsuranceNumber = dto.InsuranceNumber,
                    p_InsuranceExpiry = dto.InsuranceExpiry,
                    p_PollutionExpiry = dto.PollutionExpiry,
                    p_FitnessExpiry = dto.FitnessExpiry,
                    p_Capacity = dto.Capacity,
                    p_IsAC = dto.IsAC ? (byte)1 : (byte)0,
                    p_Status = dto.Status ? (byte)1 : (byte)0,
                    p_CreatedBy = userId,
                    p_CampusId = dto.CampusId ?? 1
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(long vehicleId, UpdateTransportVehicleDto dto, long? userId)
        {
            var c = Connection;
            var rows = await c.ExecuteAsync(
                "sp_UpdateTransportVehicles",
                new
                {
                    p_VehicleId = vehicleId,
                    p_VehicleNumber = dto.VehicleNumber,
                    p_VehicleRegistrationNo = dto.RegistrationNumber,
                    p_VehicleName = dto.VehicleNumber,
                    p_VehicleType = dto.VehicleType,
                    p_Make = dto.Manufacturer,
                    p_Model = dto.Model,
                    p_ChassisNumber = dto.ChassisNumber,
                    p_EngineNumber = dto.EngineNumber,
                    p_GpsDeviceId = dto.GpsDeviceId,
                    p_InsuranceNumber = dto.InsuranceNumber,
                    p_InsuranceExpiry = dto.InsuranceExpiry,
                    p_PollutionExpiry = dto.PollutionExpiry,
                    p_FitnessExpiry = dto.FitnessExpiry,
                    p_Capacity = dto.Capacity,
                    p_IsAC = dto.IsAC ? (byte)1 : (byte)0,
                    p_Status = dto.Status ? (byte)1 : (byte)0,
                    p_UpdatedBy = userId,
                    p_CampusId = dto.CampusId ?? 1
                },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(long vehicleId, long? userId)
        {
            var c = Connection;
            var rows = await c.ExecuteAsync(
                "sp_DeleteTransportVehicles", 
                new { p_VehicleId = vehicleId, p_UpdatedBy = userId }, 
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<IEnumerable<TransportVehicleLookupDto>> GetLookupAsync()
        {
            var c = Connection;
            return await c.QueryAsync<TransportVehicleLookupDto>("sp_GetTransportVehicleLookup", commandType: CommandType.StoredProcedure);
        }

        public async Task<TransportVehicleDto?> GetByIdOrNumberAsync(string vehicleIdOrNumber)
        {
            var c = Connection;
            var id = long.TryParse(vehicleIdOrNumber.Trim(), out var i) ? i : -1;
            return await c.QueryFirstOrDefaultAsync<TransportVehicleDto>(
                "sp_GetTransportVehicleByIdOrNumber",
                new { p_SearchId = id, p_SearchStr = vehicleIdOrNumber.Trim() },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> ExistsAsync(string vehicleNumber, string registrationNumber, long? excludeVehicleId = null)
        {
            var c = Connection;
            var count = await c.ExecuteScalarAsync<int>(
                "sp_CheckTransportVehicleExists",
                new { p_VehicleNumber = vehicleNumber.Trim(), p_RegistrationNumber = registrationNumber.Trim(), p_ExcludeId = excludeVehicleId },
                commandType: CommandType.StoredProcedure);
            return count > 0;
        }
    }
}
