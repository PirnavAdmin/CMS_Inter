using System.Data;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Dapper;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class RoomMasterRepository : IRoomMasterRepository
    {
        private readonly IDbConnection _dbConnection;

        public RoomMasterRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<IEnumerable<RoomMaster>> GetAllAsync(
            int? hostelId = null,
            int? roomTypeId = null,
            string? status = null,
            string? search = null)
        {
            var sql = @"
                SELECT
                    rm.RoomId,
                    rm.HostelId,
                    hb.HostelName,
                    hb.HostelCode,
                    rm.RoomTypeId,
                    rtc.RoomTypeSpecification,
                    rtc.BedCapacity,
                    rtc.AcType,
                    rm.FloorLevel,
                    rm.RoomNumber,
                    rm.Status,
                    rm.CreatedAt
                FROM room_masters rm
                INNER JOIN hostel_blocks hb
                    ON rm.HostelId = hb.HostelId
                INNER JOIN room_type_configs rtc
                    ON rm.RoomTypeId = rtc.RoomTypeId
                WHERE 1 = 1
            ";

            if (hostelId.HasValue)
            {
                sql += @"
                    AND rm.HostelId = @HostelId
                ";
            }

            if (roomTypeId.HasValue)
            {
                sql += @"
                    AND rm.RoomTypeId = @RoomTypeId
                ";
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                sql += @"
                    AND rm.Status = @Status
                ";
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                sql += @"
                    AND (
                        rm.RoomNumber LIKE @Search
                        OR rm.FloorLevel LIKE @Search
                        OR hb.HostelName LIKE @Search
                        OR hb.HostelCode LIKE @Search
                        OR rtc.RoomTypeSpecification LIKE @Search
                    )
                ";
            }

            sql += @"
                ORDER BY
                    hb.HostelName,
                    rm.FloorLevel,
                    rm.RoomNumber;
            ";

            return await _dbConnection.QueryAsync<RoomMaster>(
                sql,
                new
                {
                    HostelId = hostelId,
                    RoomTypeId = roomTypeId,
                    Status = status,
                    Search = $"%{search}%"
                });
        }

        public async Task<RoomMaster?> GetByIdAsync(int roomId)
        {
            const string sql = @"
                SELECT
                    rm.RoomId,
                    rm.HostelId,
                    hb.HostelName,
                    hb.HostelCode,
                    rm.RoomTypeId,
                    rtc.RoomTypeSpecification,
                    rtc.BedCapacity,
                    rtc.AcType,
                    rm.FloorLevel,
                    rm.RoomNumber,
                    rm.Status,
                    rm.CreatedAt
                FROM room_masters rm
                INNER JOIN hostel_blocks hb
                    ON rm.HostelId = hb.HostelId
                INNER JOIN room_type_configs rtc
                    ON rm.RoomTypeId = rtc.RoomTypeId
                WHERE rm.RoomId = @RoomId;
            ";

            return await _dbConnection
                .QueryFirstOrDefaultAsync<RoomMaster>(
                    sql,
                    new { RoomId = roomId });
        }

        public async Task<RoomMaster?> GetByRoomNumberAsync(
            int hostelId,
            string roomNumber)
        {
            const string sql = @"
                SELECT
                    rm.RoomId,
                    rm.HostelId,
                    hb.HostelName,
                    hb.HostelCode,
                    rm.RoomTypeId,
                    rtc.RoomTypeSpecification,
                    rtc.BedCapacity,
                    rtc.AcType,
                    rm.FloorLevel,
                    rm.RoomNumber,
                    rm.Status,
                    rm.CreatedAt
                FROM room_masters rm
                INNER JOIN hostel_blocks hb
                    ON rm.HostelId = hb.HostelId
                INNER JOIN room_type_configs rtc
                    ON rm.RoomTypeId = rtc.RoomTypeId
                WHERE rm.HostelId = @HostelId
                  AND LOWER(rm.RoomNumber) = LOWER(@RoomNumber)
                LIMIT 1;
            ";

            return await _dbConnection
                .QueryFirstOrDefaultAsync<RoomMaster>(
                    sql,
                    new
                    {
                        HostelId = hostelId,
                        RoomNumber = roomNumber
                    });
        }

        public async Task<int> CreateAsync(RoomMaster room)
        {
            const string sql = @"
                INSERT INTO room_masters
                (
                    HostelId,
                    RoomTypeId,
                    FloorLevel,
                    RoomNumber,
                    Status
                )
                VALUES
                (
                    @HostelId,
                    @RoomTypeId,
                    @FloorLevel,
                    @RoomNumber,
                    @Status
                );

                SELECT LAST_INSERT_ID();
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    room);
        }

        public async Task<bool> UpdateAsync(RoomMaster room)
        {
            const string sql = @"
                UPDATE room_masters
                SET
                    HostelId = @HostelId,
                    RoomTypeId = @RoomTypeId,
                    FloorLevel = @FloorLevel,
                    RoomNumber = @RoomNumber,
                    Status = @Status
                WHERE RoomId = @RoomId;
            ";

            var affectedRows =
                await _dbConnection.ExecuteAsync(
                    sql,
                    room);

            return affectedRows > 0;
        }

        public async Task<bool> DeleteAsync(int roomId)
        {
            const string sql = @"
                DELETE FROM room_masters
                WHERE RoomId = @RoomId;
            ";

            var affectedRows =
                await _dbConnection.ExecuteAsync(
                    sql,
                    new { RoomId = roomId });

            return affectedRows > 0;
        }

        public async Task<bool> ExistsAsync(int roomId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM room_masters
                WHERE RoomId = @RoomId;
            ";

            var count =
                await _dbConnection.ExecuteScalarAsync<int>(
                    sql,
                    new { RoomId = roomId });

            return count > 0;
        }

        public async Task<bool> HostelExistsAsync(int hostelId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_blocks
                WHERE HostelId = @HostelId;
            ";

            var count =
                await _dbConnection.ExecuteScalarAsync<int>(
                    sql,
                    new { HostelId = hostelId });

            return count > 0;
        }

        public async Task<bool> RoomTypeExistsAsync(int roomTypeId)
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
    }
}
