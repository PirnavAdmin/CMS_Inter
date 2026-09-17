using System.Data;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Dapper;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class RoomTypeConfigRepository : IRoomTypeConfigRepository
    {
        private readonly IDbConnection _dbConnection;

        public RoomTypeConfigRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<IEnumerable<RoomTypeConfig>> GetAllAsync(
            string? search = null,
            string? status = null)
        {
            var sql = @"
                SELECT
                    RoomTypeId,
                    RoomTypeSpecification,
                    BedCapacity,
                    AcType,
                    Status,
                    Description,
                    CreatedAt
                FROM room_type_configs
                WHERE 1 = 1
            ";

            if (!string.IsNullOrWhiteSpace(search))
            {
                sql += @"
                    AND (
                        RoomTypeSpecification LIKE @Search
                        OR AcType LIKE @Search
                    )
                ";
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                sql += @"
                    AND Status = @Status
                ";
            }

            sql += @"
                ORDER BY RoomTypeSpecification;
            ";

            return await _dbConnection.QueryAsync<RoomTypeConfig>(
                sql,
                new
                {
                    Search = $"%{search}%",
                    Status = status
                });
        }

        public async Task<RoomTypeConfig?> GetByIdAsync(int roomTypeId)
        {
            const string sql = @"
                SELECT
                    RoomTypeId,
                    RoomTypeSpecification,
                    BedCapacity,
                    AcType,
                    Status,
                    Description,
                    CreatedAt
                FROM room_type_configs
                WHERE RoomTypeId = @RoomTypeId;
            ";

            return await _dbConnection
                .QueryFirstOrDefaultAsync<RoomTypeConfig>(
                    sql,
                    new { RoomTypeId = roomTypeId });
        }

        public async Task<RoomTypeConfig?> GetBySpecificationAsync(
            string roomTypeSpecification)
        {
            const string sql = @"
                SELECT
                    RoomTypeId,
                    RoomTypeSpecification,
                    BedCapacity,
                    AcType,
                    Status,
                    Description,
                    CreatedAt
                FROM room_type_configs
                WHERE LOWER(RoomTypeSpecification) =
                      LOWER(@RoomTypeSpecification)
                LIMIT 1;
            ";

            return await _dbConnection
                .QueryFirstOrDefaultAsync<RoomTypeConfig>(
                    sql,
                    new
                    {
                        RoomTypeSpecification =
                            roomTypeSpecification
                    });
        }

        public async Task<int> CreateAsync(
            RoomTypeConfig roomTypeConfig)
        {
            const string sql = @"
                INSERT INTO room_type_configs
                (
                    RoomTypeSpecification,
                    BedCapacity,
                    AcType,
                    Status,
                    Description
                )
                VALUES
                (
                    @RoomTypeSpecification,
                    @BedCapacity,
                    @AcType,
                    @Status,
                    @Description
                );

                SELECT LAST_INSERT_ID();
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    roomTypeConfig);
        }

        public async Task<bool> UpdateAsync(
            RoomTypeConfig roomTypeConfig)
        {
            const string sql = @"
                UPDATE room_type_configs
                SET
                    RoomTypeSpecification = @RoomTypeSpecification,
                    BedCapacity = @BedCapacity,
                    AcType = @AcType,
                    Status = @Status,
                    Description = @Description
                WHERE RoomTypeId = @RoomTypeId;
            ";

            var affectedRows =
                await _dbConnection.ExecuteAsync(
                    sql,
                    roomTypeConfig);

            return affectedRows > 0;
        }

        public async Task<bool> DeleteAsync(int roomTypeId)
        {
            const string sql = @"
                DELETE FROM room_type_configs
                WHERE RoomTypeId = @RoomTypeId;
            ";

            var affectedRows =
                await _dbConnection.ExecuteAsync(
                    sql,
                    new { RoomTypeId = roomTypeId });

            return affectedRows > 0;
        }

        public async Task<bool> ExistsAsync(int roomTypeId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM room_type_configs
                WHERE RoomTypeId = @RoomTypeId;
            ";

            var count =
                await _dbConnection.ExecuteScalarAsync<int>(
                    sql,
                    new { RoomTypeId = roomTypeId });

            return count > 0;
        }

        public async Task<bool> IsInUseAsync(int roomTypeId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM room_masters
                WHERE RoomTypeId = @RoomTypeId;
            ";

            var count =
                await _dbConnection.ExecuteScalarAsync<int>(
                    sql,
                    new { RoomTypeId = roomTypeId });

            return count > 0;
        }
    }
}