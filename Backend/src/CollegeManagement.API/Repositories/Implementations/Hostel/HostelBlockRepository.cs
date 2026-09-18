using System.Data;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Dapper;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelBlockRepository : IHostelBlockRepository
    {
        private readonly IDbConnection _dbConnection;

        public HostelBlockRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<IEnumerable<HostelBlock>> GetAllAsync(
            string? search = null,
            string? status = null)
        {
            var sql = @"
                SELECT
                    HostelId,
                    HostelName,
                    HostelCode,
                    HostelType,
                    TotalFloors,
                    WardenName,
                    PrimaryMobileNumber,
                    AlternateMobileNumber,
                    Email,
                    Status,
                    Address,
                    CreatedAt
                FROM hostel_blocks
                WHERE 1 = 1
            ";

            if (!string.IsNullOrWhiteSpace(search))
            {
                sql += @"
                    AND (
                        HostelName LIKE @Search
                        OR HostelCode LIKE @Search
                        OR HostelType LIKE @Search
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
                ORDER BY HostelName;
            ";

            return await _dbConnection.QueryAsync<HostelBlock>(
                sql,
                new
                {
                    Search = $"%{search}%",
                    Status = status
                });
        }

        public async Task<HostelBlock?> GetByIdAsync(int hostelId)
        {
            const string sql = @"
                SELECT
                    HostelId,
                    HostelName,
                    HostelCode,
                    HostelType,
                    TotalFloors,
                    WardenName,
                    PrimaryMobileNumber,
                    AlternateMobileNumber,
                    Email,
                    Status,
                    Address,
                    CreatedAt
                FROM hostel_blocks
                WHERE HostelId = @HostelId;
            ";

            return await _dbConnection
                .QueryFirstOrDefaultAsync<HostelBlock>(
                    sql,
                    new { HostelId = hostelId });
        }

        public async Task<HostelBlock?> GetByCodeAsync(string hostelCode)
        {
            const string sql = @"
                SELECT
                    HostelId,
                    HostelName,
                    HostelCode,
                    HostelType,
                    TotalFloors,
                    WardenName,
                    PrimaryMobileNumber,
                    AlternateMobileNumber,
                    Email,
                    Status,
                    Address,
                    CreatedAt
                FROM hostel_blocks
                WHERE LOWER(HostelCode) = LOWER(@HostelCode)
                LIMIT 1;
            ";

            return await _dbConnection
                .QueryFirstOrDefaultAsync<HostelBlock>(
                    sql,
                    new { HostelCode = hostelCode });
        }

        public async Task<int> CreateAsync(HostelBlock hostelBlock)
        {
            const string sql = @"
                INSERT INTO hostel_blocks
                (
                    HostelName,
                    HostelCode,
                    HostelType,
                    TotalFloors,
                    WardenName,
                    PrimaryMobileNumber,
                    AlternateMobileNumber,
                    Email,
                    Status,
                    Address
                )
                VALUES
                (
                    @HostelName,
                    @HostelCode,
                    @HostelType,
                    @TotalFloors,
                    @WardenName,
                    @PrimaryMobileNumber,
                    @AlternateMobileNumber,
                    @Email,
                    @Status,
                    @Address
                );

                SELECT LAST_INSERT_ID();
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    hostelBlock);
        }

        public async Task<bool> UpdateAsync(HostelBlock hostelBlock)
        {
            const string sql = @"
                UPDATE hostel_blocks
                SET
                    HostelName = @HostelName,
                    HostelCode = @HostelCode,
                    HostelType = @HostelType,
                    TotalFloors = @TotalFloors,
                    PrimaryMobileNumber = @PrimaryMobileNumber,
                    AlternateMobileNumber = @AlternateMobileNumber,
                    Email = @Email,
                    Status = @Status,
                    Address = @Address
                WHERE HostelId = @HostelId;
            ";

            var affectedRows =
                await _dbConnection.ExecuteAsync(
                    sql,
                    hostelBlock);

            return affectedRows > 0;
        }

        public async Task<bool> DeleteAsync(int hostelId)
        {
            const string sql = @"
                DELETE FROM hostel_blocks
                WHERE HostelId = @HostelId;
            ";

            var affectedRows =
                await _dbConnection.ExecuteAsync(
                    sql,
                    new { HostelId = hostelId });

            return affectedRows > 0;
        }

        public async Task<bool> ExistsAsync(int hostelId)
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
    }
}