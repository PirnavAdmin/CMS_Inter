using System.Data;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Dapper;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelBedRepository : IHostelBedRepository
    {
        private readonly IDbConnection _dbConnection;

        public HostelBedRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<IEnumerable<HostelBed>> GetAllAsync(
            int? hostelId = null,
            int? roomId = null,
            string? bedStatus = null,
            string? status = null,
            string? search = null)
        {
            var sql = @"
                SELECT
                    hb.BedId,
                    hb.RoomId,
                    rm.RoomNumber,
                    rm.HostelId,
                    h.HostelName,
                    h.HostelCode,
                    rm.FloorLevel,
                    rtc.RoomTypeSpecification,
                    hb.BedNumber,
                    hb.BedStatus,
                    hb.Status,
                    hb.CreatedAt
                FROM hostel_beds hb
                INNER JOIN room_masters rm
                    ON hb.RoomId = rm.RoomId
                INNER JOIN hostel_blocks h
                    ON rm.HostelId = h.HostelId
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

            if (roomId.HasValue)
            {
                sql += @"
                    AND hb.RoomId = @RoomId
                ";
            }

            if (!string.IsNullOrWhiteSpace(bedStatus))
            {
                sql += @"
                    AND hb.BedStatus = @BedStatus
                ";
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                sql += @"
                    AND hb.Status = @Status
                ";
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                sql += @"
                    AND (
                        hb.BedNumber LIKE @Search
                        OR rm.RoomNumber LIKE @Search
                        OR h.HostelName LIKE @Search
                        OR h.HostelCode LIKE @Search
                    )
                ";
            }

            sql += @"
                ORDER BY
                    h.HostelName,
                    rm.RoomNumber,
                    hb.BedNumber;
            ";

            return await _dbConnection.QueryAsync<HostelBed>(
                sql,
                new
                {
                    HostelId = hostelId,
                    RoomId = roomId,
                    BedStatus = bedStatus,
                    Status = status,
                    Search = $"%{search}%"
                });
        }

        public async Task<HostelBed?> GetByIdAsync(int bedId)
        {
            const string sql = @"
                SELECT
                    hb.BedId,
                    hb.RoomId,
                    rm.RoomNumber,
                    rm.HostelId,
                    h.HostelName,
                    h.HostelCode,
                    rm.FloorLevel,
                    rtc.RoomTypeSpecification,
                    hb.BedNumber,
                    hb.BedStatus,
                    hb.Status,
                    hb.CreatedAt
                FROM hostel_beds hb
                INNER JOIN room_masters rm
                    ON hb.RoomId = rm.RoomId
                INNER JOIN hostel_blocks h
                    ON rm.HostelId = h.HostelId
                INNER JOIN room_type_configs rtc
                    ON rm.RoomTypeId = rtc.RoomTypeId
                WHERE hb.BedId = @BedId;
            ";

            return await _dbConnection
                .QueryFirstOrDefaultAsync<HostelBed>(
                    sql,
                    new { BedId = bedId });
        }

        public async Task<HostelBed?> GetByBedNumberAsync(
            int roomId,
            string bedNumber)
        {
            const string sql = @"
                SELECT
                    hb.BedId,
                    hb.RoomId,
                    rm.RoomNumber,
                    rm.HostelId,
                    h.HostelName,
                    h.HostelCode,
                    rm.FloorLevel,
                    rtc.RoomTypeSpecification,
                    hb.BedNumber,
                    hb.BedStatus,
                    hb.Status,
                    hb.CreatedAt
                FROM hostel_beds hb
                INNER JOIN room_masters rm
                    ON hb.RoomId = rm.RoomId
                INNER JOIN hostel_blocks h
                    ON rm.HostelId = h.HostelId
                INNER JOIN room_type_configs rtc
                    ON rm.RoomTypeId = rtc.RoomTypeId
                WHERE hb.RoomId = @RoomId
                  AND LOWER(hb.BedNumber) = LOWER(@BedNumber)
                LIMIT 1;
            ";

            return await _dbConnection
                .QueryFirstOrDefaultAsync<HostelBed>(
                    sql,
                    new
                    {
                        RoomId = roomId,
                        BedNumber = bedNumber
                    });
        }

        public async Task<int> CreateAsync(HostelBed bed)
        {
            const string sql = @"
                INSERT INTO hostel_beds
                (
                    RoomId,
                    BedNumber,
                    BedStatus,
                    Status
                )
                VALUES
                (
                    @RoomId,
                    @BedNumber,
                    @BedStatus,
                    @Status
                );

                SELECT LAST_INSERT_ID();
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    bed);
        }

        public async Task<bool> UpdateAsync(HostelBed bed)
        {
            const string sql = @"
                UPDATE hostel_beds
                SET
                    RoomId = @RoomId,
                    BedNumber = @BedNumber,
                    BedStatus = @BedStatus,
                    Status = @Status
                WHERE BedId = @BedId;
            ";

            var affectedRows =
                await _dbConnection.ExecuteAsync(
                    sql,
                    bed);

            return affectedRows > 0;
        }

        public async Task<bool> DeleteAsync(int bedId)
        {
            const string sql = @"
                DELETE FROM hostel_beds
                WHERE BedId = @BedId;
            ";

            var affectedRows =
                await _dbConnection.ExecuteAsync(
                    sql,
                    new { BedId = bedId });

            return affectedRows > 0;
        }

        public async Task<bool> ExistsAsync(int bedId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_beds
                WHERE BedId = @BedId;
            ";

            var count =
                await _dbConnection.ExecuteScalarAsync<int>(
                    sql,
                    new { BedId = bedId });

            return count > 0;
        }

        public async Task<bool> RoomExistsAsync(int roomId)
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

        public async Task<int> GetBedCountByRoomAsync(int roomId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_beds
                WHERE RoomId = @RoomId;
            ";

            return await _dbConnection.ExecuteScalarAsync<int>(
                sql,
                new { RoomId = roomId });
        }

        public async Task<int> GetRoomBedCapacityAsync(int roomId)
        {
            const string sql = @"
                SELECT rtc.BedCapacity
                FROM room_masters rm
                INNER JOIN room_type_configs rtc
                    ON rm.RoomTypeId = rtc.RoomTypeId
                WHERE rm.RoomId = @RoomId;
            ";

            return await _dbConnection.ExecuteScalarAsync<int>(
                sql,
                new { RoomId = roomId });
        }
    }
}