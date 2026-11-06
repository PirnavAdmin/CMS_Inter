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
            IEnumerable<TransportVehicleDto> items;
            try
            {
                const string sql4 = @"CALL sp_GetTransportVehicles(@p_Search, @p_VehicleType, @p_Status, @p_CampusId);";
                items = await c.QueryAsync<TransportVehicleDto>(
                    sql4,
                    new
                    {
                        p_Search = filter.Search ?? "",
                        p_VehicleType = (string?)null,
                        p_Status = filter.Status.HasValue ? (filter.Status.Value ? (byte)1 : (byte)0) : (byte?)null,
                        p_CampusId = filter.CampusId
                    },
                    commandType: CommandType.Text);
            }
            catch (Exception ex) when (ex.Message.Contains("Incorrect number of arguments") || ex.Message.Contains("p_CampusId") || ex.Message.Contains("not found in the collection"))
            {
                const string sql1 = @"CALL sp_GetTransportVehicles(@p_Search);";
                items = await c.QueryAsync<TransportVehicleDto>(
                    sql1,
                    new { p_Search = filter.Search ?? "" },
                    commandType: CommandType.Text);
            }

            var list = items.AsQueryable();
            if (filter.Status.HasValue) list = list.Where(x => x.Status == (filter.Status.Value ? "Active" : "Inactive"));
            if (filter.CampusId.HasValue && filter.CampusId.Value > 0)
                list = list.Where(x => x.CampusId == filter.CampusId.Value);

            var totalCount = list.Count();
            var paged = list.Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToList();
            return new PagedResult<TransportVehicleDto> { Items = paged, TotalCount = totalCount, PageNumber = filter.PageNumber, PageSize = filter.PageSize };
        }

        public async Task<TransportVehicleDto?> GetByIdAsync(long vehicleId)
        {
            var c = Connection;
            const string sql = "CALL sp_GetTransportVehiclesById(@p_Id);";
            return await c.QueryFirstOrDefaultAsync<TransportVehicleDto>(
                sql,
                new { p_Id = vehicleId },
                commandType: CommandType.Text);
        }

        public async Task<long> CreateAsync(CreateTransportVehicleDto dto, long? userId)
        {
            var c = Connection;
            try
            {
                const string sql20 = @"CALL sp_CreateTransportVehicles(
                    @p_VehicleNumber, @p_VehicleType, @p_Capacity, @p_IsActive, @p_VehicleRegistrationNo,
                    @p_MaximumCapacity, @p_Make, @p_Model, @p_YearOfManufacture, @p_ChassisNumber,
                    @p_EngineNumber, @p_InsuranceExpiry, @p_FitnessExpiry, @p_PollutionExpiry,
                    @p_GpsDeviceId, @p_IsAC, @p_InsuranceNumber, @p_CreatedBy, @p_UpdatedBy, @p_CampusId
                );";

                var newId = await c.ExecuteScalarAsync<long>(sql20, new
                {
                    p_VehicleNumber = dto.VehicleNumber,
                    p_VehicleType = dto.VehicleType,
                    p_Capacity = dto.Capacity,
                    p_IsActive = dto.Status ? (byte)1 : (byte)0,
                    p_VehicleRegistrationNo = dto.RegistrationNumber,
                    p_MaximumCapacity = dto.Capacity,
                    p_Make = dto.Manufacturer,
                    p_Model = dto.Model,
                    p_YearOfManufacture = 0,
                    p_ChassisNumber = dto.ChassisNumber,
                    p_EngineNumber = dto.EngineNumber,
                    p_InsuranceExpiry = dto.InsuranceExpiry,
                    p_FitnessExpiry = dto.FitnessExpiry,
                    p_PollutionExpiry = dto.PollutionExpiry,
                    p_GpsDeviceId = dto.GpsDeviceId,
                    p_IsAC = dto.IsAC ? (byte)1 : (byte)0,
                    p_InsuranceNumber = dto.InsuranceNumber,
                    p_CreatedBy = userId,
                    p_UpdatedBy = userId,
                    p_CampusId = dto.CampusId
                }, commandType: CommandType.Text);

                if (newId > 0 && dto.CampusId.HasValue && dto.CampusId.Value > 0)
                {
                    await c.ExecuteAsync("UPDATE TransportVehicles SET CampusId = @CampusId WHERE VehicleId = @VehicleId AND (CampusId IS NULL OR CampusId != @CampusId);",
                        new { CampusId = dto.CampusId.Value, VehicleId = newId });
                }

                return newId;
            }
            catch (Exception ex) when (ex.Message.Contains("Incorrect number of arguments") || ex.Message.Contains("p_CampusId") || ex.Message.Contains("not found in the collection"))
            {
                const string sql19 = @"CALL sp_CreateTransportVehicles(
                    @p_VehicleNumber, @p_VehicleType, @p_Capacity, @p_IsActive, @p_VehicleRegistrationNo,
                    @p_MaximumCapacity, @p_Make, @p_Model, @p_YearOfManufacture, @p_ChassisNumber,
                    @p_EngineNumber, @p_InsuranceExpiry, @p_FitnessExpiry, @p_PollutionExpiry,
                    @p_GpsDeviceId, @p_IsAC, @p_InsuranceNumber, @p_CreatedBy, @p_UpdatedBy
                );";

                var newId = await c.ExecuteScalarAsync<long>(sql19, new
                {
                    p_VehicleNumber = dto.VehicleNumber,
                    p_VehicleType = dto.VehicleType,
                    p_Capacity = dto.Capacity,
                    p_IsActive = dto.Status ? (byte)1 : (byte)0,
                    p_VehicleRegistrationNo = dto.RegistrationNumber,
                    p_MaximumCapacity = dto.Capacity,
                    p_Make = dto.Manufacturer,
                    p_Model = dto.Model,
                    p_YearOfManufacture = 0,
                    p_ChassisNumber = dto.ChassisNumber,
                    p_EngineNumber = dto.EngineNumber,
                    p_InsuranceExpiry = dto.InsuranceExpiry,
                    p_FitnessExpiry = dto.FitnessExpiry,
                    p_PollutionExpiry = dto.PollutionExpiry,
                    p_GpsDeviceId = dto.GpsDeviceId,
                    p_IsAC = dto.IsAC ? (byte)1 : (byte)0,
                    p_InsuranceNumber = dto.InsuranceNumber,
                    p_CreatedBy = userId,
                    p_UpdatedBy = userId
                }, commandType: CommandType.Text);

                if (newId > 0 && dto.CampusId.HasValue && dto.CampusId.Value > 0)
                {
                    await c.ExecuteAsync("UPDATE TransportVehicles SET CampusId = @CampusId WHERE VehicleId = @VehicleId;",
                        new { CampusId = dto.CampusId.Value, VehicleId = newId });
                }

                return newId;
            }
        }

        public async Task<bool> UpdateAsync(long vehicleId, UpdateTransportVehicleDto dto, long? userId)
        {
            var c = Connection;
            try
            {
                const string sql20 = @"CALL sp_UpdateTransportVehicles(
                    @p_Id, @p_VehicleNumber, @p_VehicleType, @p_Capacity, @p_IsActive, @p_VehicleRegistrationNo,
                    @p_MaximumCapacity, @p_Make, @p_Model, @p_YearOfManufacture, @p_ChassisNumber,
                    @p_EngineNumber, @p_InsuranceExpiry, @p_FitnessExpiry, @p_PollutionExpiry,
                    @p_GpsDeviceId, @p_IsAC, @p_InsuranceNumber, @p_CreatedBy, @p_UpdatedBy, @p_CampusId
                );";

                var rows = await c.QueryFirstOrDefaultAsync<int>(sql20, new
                {
                    p_Id = vehicleId,
                    p_VehicleNumber = dto.VehicleNumber,
                    p_VehicleType = dto.VehicleType,
                    p_Capacity = dto.Capacity,
                    p_IsActive = dto.Status ? (byte)1 : (byte)0,
                    p_VehicleRegistrationNo = dto.RegistrationNumber,
                    p_MaximumCapacity = dto.Capacity,
                    p_Make = dto.Manufacturer,
                    p_Model = dto.Model,
                    p_YearOfManufacture = 0,
                    p_ChassisNumber = dto.ChassisNumber,
                    p_EngineNumber = dto.EngineNumber,
                    p_InsuranceExpiry = dto.InsuranceExpiry,
                    p_FitnessExpiry = dto.FitnessExpiry,
                    p_PollutionExpiry = dto.PollutionExpiry,
                    p_GpsDeviceId = dto.GpsDeviceId,
                    p_IsAC = dto.IsAC ? (byte)1 : (byte)0,
                    p_InsuranceNumber = dto.InsuranceNumber,
                    p_CreatedBy = (long?)null,
                    p_UpdatedBy = userId,
                    p_CampusId = dto.CampusId
                }, commandType: CommandType.Text);

                if (dto.CampusId.HasValue && dto.CampusId.Value > 0)
                {
                    await c.ExecuteAsync("UPDATE TransportVehicles SET CampusId = @CampusId WHERE VehicleId = @VehicleId;",
                        new { CampusId = dto.CampusId.Value, VehicleId = vehicleId });
                }

                return rows > 0;
            }
            catch (Exception ex) when (ex.Message.Contains("Incorrect number of arguments") || ex.Message.Contains("p_CampusId") || ex.Message.Contains("not found in the collection"))
            {
                const string sql19 = @"CALL sp_UpdateTransportVehicles(
                    @p_Id, @p_VehicleNumber, @p_VehicleType, @p_Capacity, @p_IsActive, @p_VehicleRegistrationNo,
                    @p_MaximumCapacity, @p_Make, @p_Model, @p_YearOfManufacture, @p_ChassisNumber,
                    @p_EngineNumber, @p_InsuranceExpiry, @p_FitnessExpiry, @p_PollutionExpiry,
                    @p_GpsDeviceId, @p_IsAC, @p_InsuranceNumber, @p_CreatedBy, @p_UpdatedBy
                );";

                var rows = await c.QueryFirstOrDefaultAsync<int>(sql19, new
                {
                    p_Id = vehicleId,
                    p_VehicleNumber = dto.VehicleNumber,
                    p_VehicleType = dto.VehicleType,
                    p_Capacity = dto.Capacity,
                    p_IsActive = dto.Status ? (byte)1 : (byte)0,
                    p_VehicleRegistrationNo = dto.RegistrationNumber,
                    p_MaximumCapacity = dto.Capacity,
                    p_Make = dto.Manufacturer,
                    p_Model = dto.Model,
                    p_YearOfManufacture = 0,
                    p_ChassisNumber = dto.ChassisNumber,
                    p_EngineNumber = dto.EngineNumber,
                    p_InsuranceExpiry = dto.InsuranceExpiry,
                    p_FitnessExpiry = dto.FitnessExpiry,
                    p_PollutionExpiry = dto.PollutionExpiry,
                    p_GpsDeviceId = dto.GpsDeviceId,
                    p_IsAC = dto.IsAC ? (byte)1 : (byte)0,
                    p_InsuranceNumber = dto.InsuranceNumber,
                    p_CreatedBy = (long?)null,
                    p_UpdatedBy = userId
                }, commandType: CommandType.Text);

                if (dto.CampusId.HasValue && dto.CampusId.Value > 0)
                {
                    await c.ExecuteAsync("UPDATE TransportVehicles SET CampusId = @CampusId WHERE VehicleId = @VehicleId;",
                        new { CampusId = dto.CampusId.Value, VehicleId = vehicleId });
                }

                return rows > 0;
            }
        }

        public async Task<bool> DeleteAsync(long vehicleId, long? userId)
        {
            var c = Connection;
            var rows = await c.QueryFirstOrDefaultAsync<int>(
                "sp_DeleteTransportVehicles", 
                new { p_Id = vehicleId, p_UpdatedBy = userId }, 
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

        public async Task<bool> CampusExistsAsync(int campusId)
        {
            var c = Connection;
            const string sql = "SELECT COUNT(1) FROM Campuses WHERE CampusId = @CampusId AND IsActive = 1;";
            var count = await c.ExecuteScalarAsync<int>(sql, new { CampusId = campusId });
            return count > 0;
        }
    }
}