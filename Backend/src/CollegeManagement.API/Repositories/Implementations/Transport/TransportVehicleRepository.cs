using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.Vehicle;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Common;
using Dapper;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;
using System.Data;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories.Implementations.Transport
{
    public class TransportVehicleRepository : ITransportVehicleRepository
    {
        private readonly AppDbContext _context;
        private readonly Microsoft.AspNetCore.Http.IHttpContextAccessor? _httpContextAccessor;

        public TransportVehicleRepository(AppDbContext context, Microsoft.AspNetCore.Http.IHttpContextAccessor? httpContextAccessor = null)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        private int? ResolveCollegeId() =>
            CollegeManagement.API.Helpers.CampusContextResolver.ResolveCollegeId(_httpContextAccessor?.HttpContext?.User, _httpContextAccessor?.HttpContext?.Request);

        private int? ResolveCampusId() =>
            CollegeManagement.API.Helpers.CampusContextResolver.ResolveCampusId(_httpContextAccessor?.HttpContext?.User, _httpContextAccessor?.HttpContext?.Request);

        private IDbConnection Connection => _context.Database.GetDbConnection();

        private async Task<int> ResolveVehicleCollegeIdAsync(IDbConnection c, int? campusId, int? requestedCollegeId)
        {
            if (campusId.HasValue && campusId.Value > 0)
            {
                var fromCampus = await c.ExecuteScalarAsync<int?>(
                    "SELECT CollegeId FROM Campuses WHERE CampusId = @CampusId LIMIT 1;",
                    new { CampusId = campusId.Value });
                if (fromCampus.HasValue && fromCampus.Value > 0)
                    return fromCampus.Value;
            }
            return requestedCollegeId ?? ResolveCollegeId() ?? throw new ValidationException("Tenant CollegeId is required.");
        }

        private static Exception TranslateVehicleDbException(MySqlException ex, string vehicleNumber)
        {
            if (ex.Number == 1062)
                return new ConflictException($"Vehicle number '{vehicleNumber}' already exists.");
            if (ex.Number == 1452)
                return new ValidationException("Referenced CampusId or foreign key does not exist.");
            return ex;
        }

        public async Task<PagedResult<TransportVehicleDto>> GetAllAsync(TransportVehicleFilterDto filter)
        {
            var c = Connection;
            var collegeId = filter.CollegeId ?? ResolveCollegeId();
            IEnumerable<TransportVehicleDto> items;
            try
            {
                // Pass p_CampusId = NULL to SP so college-scoped records with CampusId IS NULL are also retrieved,
                // then enforce (v.CampusId == filter.CampusId || v.CampusId == null) below.
                const string sql5 = @"CALL sp_GetTransportVehicles(@p_Search, @p_VehicleType, @p_Status, @p_CampusId, @p_CollegeId);";
                items = await c.QueryAsync<TransportVehicleDto>(
                    sql5,
                    new
                    {
                        p_Search = filter.Search ?? "",
                        p_VehicleType = filter.VehicleType,
                        p_Status = filter.Status.HasValue ? (filter.Status.Value ? (byte)1 : (byte)0) : (byte?)null,
                        p_CampusId = (int?)null,
                        p_CollegeId = collegeId
                    },
                    commandType: CommandType.Text);
            }
            catch (Exception ex) when (ex.Message.Contains("Incorrect number of arguments") || ex.Message.Contains("p_CollegeId") || ex.Message.Contains("not found in the collection"))
            {
                const string sql4 = @"CALL sp_GetTransportVehicles(@p_Search, @p_VehicleType, @p_Status, @p_CampusId);";
                items = await c.QueryAsync<TransportVehicleDto>(
                    sql4,
                    new
                    {
                        p_Search = filter.Search ?? "",
                        p_VehicleType = filter.VehicleType,
                        p_Status = filter.Status.HasValue ? (filter.Status.Value ? (byte)1 : (byte)0) : (byte?)null,
                        p_CampusId = (int?)null
                    },
                    commandType: CommandType.Text);
            }

            var list = items.AsQueryable();
            if (collegeId.HasValue && collegeId.Value > 0)
                list = list.Where(v => v.CollegeId == collegeId.Value);
            if (filter.Status.HasValue) list = list.Where(x => x.Status == (filter.Status.Value ? "Active" : "Inactive"));
            if (filter.CampusId.HasValue && filter.CampusId.Value > 0)
                list = list.Where(v => v.CampusId == filter.CampusId.Value || (v.CampusId == null && filter.CampusId.Value == 1 && collegeId == 1));

            var totalCount = list.Count();
            var paged = list.Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToList();
            return new PagedResult<TransportVehicleDto> { Items = paged, TotalCount = totalCount, PageNumber = filter.PageNumber, PageSize = filter.PageSize };
        }

        public async Task<TransportVehicleDto?> GetByIdAsync(long vehicleId)
        {
            var c = Connection;
            var collegeId = ResolveCollegeId();
            const string sql = @"
                SELECT 
                    v.VehicleId,
                    v.CollegeId,
                    v.VehicleNumber,
                    COALESCE(v.VehicleRegistrationNo, v.RegistrationNumber, v.VehicleNumber) AS RegistrationNumber,
                    COALESCE(v.VehicleName, v.VehicleNumber) AS VehicleName,
                    v.VehicleType,
                    COALESCE(v.Make, v.Manufacturer) AS Manufacturer,
                    v.Model,
                    v.ChassisNumber,
                    v.EngineNumber,
                    v.GpsDeviceId,
                    v.InsuranceNumber,
                    v.InsuranceExpiry,
                    v.PollutionExpiry,
                    v.FitnessExpiry,
                    v.Capacity,
                    v.IsAC,
                    CASE WHEN v.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
                    v.CreatedAt,
                    v.CampusId,
                    c.CampusName
                FROM TransportVehicles v
                LEFT JOIN Campuses c ON v.CampusId = c.CampusId
                WHERE v.VehicleId = @Id AND v.IsDeleted = 0
                  AND (@CollegeId IS NULL OR @CollegeId <= 0 OR v.CollegeId = @CollegeId)
                LIMIT 1;";
            return await c.QueryFirstOrDefaultAsync<TransportVehicleDto>(
                sql,
                new { Id = vehicleId, CollegeId = collegeId },
                commandType: CommandType.Text);
        }

        public async Task<long> CreateAsync(CreateTransportVehicleDto dto, long? userId)
        {
            var c = Connection;
            var collegeId = await ResolveVehicleCollegeIdAsync(c, dto.CampusId, dto.CollegeId);
            long newId = 0;

            try
            {
                const string sql21 = @"CALL sp_CreateTransportVehicles(
                    @p_VehicleNumber, @p_VehicleType, @p_Capacity, @p_IsActive, @p_VehicleRegistrationNo,
                    @p_MaximumCapacity, @p_Make, @p_Model, @p_YearOfManufacture, @p_ChassisNumber,
                    @p_EngineNumber, @p_InsuranceExpiry, @p_FitnessExpiry, @p_PollutionExpiry,
                    @p_GpsDeviceId, @p_IsAC, @p_InsuranceNumber, @p_CreatedBy, @p_UpdatedBy, @p_CampusId, @p_CollegeId
                );";

                newId = await c.ExecuteScalarAsync<long>(sql21, new
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
                    p_CampusId = dto.CampusId,
                    p_CollegeId = collegeId
                }, commandType: CommandType.Text);
            }
            catch (MySqlException ex)
            {
                throw TranslateVehicleDbException(ex, dto.VehicleNumber);
            }
            catch (Exception ex) when (ex.Message.Contains("Incorrect number of arguments") || ex.Message.Contains("p_CampusId") || ex.Message.Contains("not found in the collection"))
            {
                try
                {
                    const string sql19 = @"CALL sp_CreateTransportVehicles(
                        @p_VehicleNumber, @p_VehicleType, @p_Capacity, @p_IsActive, @p_VehicleRegistrationNo,
                        @p_MaximumCapacity, @p_Make, @p_Model, @p_YearOfManufacture, @p_ChassisNumber,
                        @p_EngineNumber, @p_InsuranceExpiry, @p_FitnessExpiry, @p_PollutionExpiry,
                        @p_GpsDeviceId, @p_IsAC, @p_InsuranceNumber, @p_CreatedBy, @p_UpdatedBy
                    );";

                    newId = await c.ExecuteScalarAsync<long>(sql19, new
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
                }
                catch (MySqlException sqlEx)
                {
                    throw TranslateVehicleDbException(sqlEx, dto.VehicleNumber);
                }
            }

            if (newId > 0)
            {
                await c.ExecuteAsync(@"
                    UPDATE TransportVehicles
                    SET CampusId = @CampusId,
                        CollegeId = @CollegeId,
                        RegistrationNumber = @RegNo,
                        VehicleRegistrationNo = @RegNo,
                        VehicleName = @VehicleName
                    WHERE VehicleId = @VehicleId;",
                    new
                    {
                        CampusId = dto.CampusId,
                        CollegeId = collegeId,
                        RegNo = dto.RegistrationNumber,
                        VehicleName = dto.VehicleName,
                        VehicleId = newId
                    });
            }

            return newId;
        }

        public async Task<bool> UpdateAsync(long vehicleId, UpdateTransportVehicleDto dto, long? userId)
        {
            var c = Connection;
            var collegeId = await ResolveVehicleCollegeIdAsync(c, dto.CampusId, dto.CollegeId);
            int rows = 0;

            try
            {
                const string sql20 = @"CALL sp_UpdateTransportVehicles(
                    @p_Id, @p_VehicleNumber, @p_VehicleType, @p_Capacity, @p_IsActive, @p_VehicleRegistrationNo,
                    @p_MaximumCapacity, @p_Make, @p_Model, @p_YearOfManufacture, @p_ChassisNumber,
                    @p_EngineNumber, @p_InsuranceExpiry, @p_FitnessExpiry, @p_PollutionExpiry,
                    @p_GpsDeviceId, @p_IsAC, @p_InsuranceNumber, @p_CreatedBy, @p_UpdatedBy, @p_CampusId
                );";

                rows = await c.QueryFirstOrDefaultAsync<int>(sql20, new
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
            }
            catch (MySqlException ex)
            {
                throw TranslateVehicleDbException(ex, dto.VehicleNumber);
            }
            catch (Exception ex) when (ex.Message.Contains("Incorrect number of arguments") || ex.Message.Contains("p_CampusId") || ex.Message.Contains("not found in the collection"))
            {
                try
                {
                    const string sql19 = @"CALL sp_UpdateTransportVehicles(
                        @p_Id, @p_VehicleNumber, @p_VehicleType, @p_Capacity, @p_IsActive, @p_VehicleRegistrationNo,
                        @p_MaximumCapacity, @p_Make, @p_Model, @p_YearOfManufacture, @p_ChassisNumber,
                        @p_EngineNumber, @p_InsuranceExpiry, @p_FitnessExpiry, @p_PollutionExpiry,
                        @p_GpsDeviceId, @p_IsAC, @p_InsuranceNumber, @p_CreatedBy, @p_UpdatedBy
                    );";

                    rows = await c.QueryFirstOrDefaultAsync<int>(sql19, new
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
                }
                catch (MySqlException sqlEx)
                {
                    throw TranslateVehicleDbException(sqlEx, dto.VehicleNumber);
                }
            }

            var directRows = await c.ExecuteAsync(@"
                UPDATE TransportVehicles
                SET CampusId = COALESCE(@CampusId, CampusId),
                    CollegeId = @CollegeId,
                    RegistrationNumber = @RegNo,
                    VehicleRegistrationNo = @RegNo,
                    VehicleName = @VehicleName
                WHERE VehicleId = @VehicleId;",
                new
                {
                    CampusId = dto.CampusId,
                    CollegeId = collegeId,
                    RegNo = dto.RegistrationNumber,
                    VehicleName = dto.VehicleName,
                    VehicleId = vehicleId
                });

            return rows > 0 || directRows > 0;
        }

        public async Task<bool> DeleteAsync(long vehicleId, long? userId)
        {
            var c = Connection;
            var collegeId = ResolveCollegeId();
            var rows = await c.QueryFirstOrDefaultAsync<int>(
                "sp_DeleteTransportVehicles", 
                new { p_Id = vehicleId, p_UpdatedBy = userId, p_CollegeId = collegeId }, 
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<IEnumerable<TransportVehicleLookupDto>> GetLookupAsync()
        {
            var c = Connection;
            return await c.QueryAsync<TransportVehicleLookupDto>(
                "sp_GetTransportVehicleLookup",
                new { p_CampusId = ResolveCampusId(), p_CollegeId = ResolveCollegeId() },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<TransportVehicleDto?> GetByIdOrNumberAsync(string vehicleIdOrNumber)
        {
            var c = Connection;
            var id = long.TryParse(vehicleIdOrNumber.Trim(), out var i) ? i : -1;
            return await c.QueryFirstOrDefaultAsync<TransportVehicleDto>(
                "sp_GetTransportVehicleByIdOrNumber",
                new { p_SearchId = id, p_SearchStr = vehicleIdOrNumber.Trim(), p_CollegeId = ResolveCollegeId() },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> ExistsAsync(string vehicleNumber, string registrationNumber, long? excludeVehicleId = null)
        {
            var c = Connection;
            var count = await c.ExecuteScalarAsync<int>(
                "sp_CheckTransportVehicleExists",
                new { p_VehicleNumber = vehicleNumber.Trim(), p_RegistrationNumber = registrationNumber.Trim(), p_ExcludeId = excludeVehicleId, p_CollegeId = ResolveCollegeId() },
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