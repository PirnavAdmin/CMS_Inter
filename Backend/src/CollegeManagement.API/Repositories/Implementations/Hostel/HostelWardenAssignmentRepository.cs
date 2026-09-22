using System.Data;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Dapper;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelWardenAssignmentRepository
        : IHostelWardenAssignmentRepository
    {
        private readonly IDbConnection _dbConnection;

        public HostelWardenAssignmentRepository(
            IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<IEnumerable<HostelWardenAssignment>>
            GetAllAsync(
                int? hostelId = null,
                int? staffId = null,
                string? status = null,
                string? search = null)
        {
            var sql = @"
                SELECT
                    hwa.WardenAssignmentId,
                    hwa.StaffId,
                    s.EmployeeId,
                    s.FirstName,
                    s.MiddleName,
                    s.LastName,
                    CONCAT_WS(
                        ' ',
                        s.FirstName,
                        NULLIF(s.MiddleName, ''),
                        s.LastName
                    ) AS WardenName,
                    hwa.HostelId,
                    hb.HostelName,
                    hb.HostelCode,
                    hb.HostelType,
                    hwa.AssignmentDate,
                    hwa.Status,
                    hwa.CreatedAt
                FROM hostel_warden_assignments hwa
                INNER JOIN Staff s
                    ON hwa.StaffId = s.Id
                INNER JOIN hostel_blocks hb
                    ON hwa.HostelId = hb.HostelId
                WHERE 1 = 1
            ";

            if (hostelId.HasValue)
            {
                sql += @"
                    AND hwa.HostelId = @HostelId
                ";
            }

            if (staffId.HasValue)
            {
                sql += @"
                    AND hwa.StaffId = @StaffId
                ";
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                sql += @"
                    AND hwa.Status = @Status
                ";
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                sql += @"
                    AND (
                        s.EmployeeId LIKE @Search
                        OR s.FirstName LIKE @Search
                        OR s.LastName LIKE @Search
                        OR hb.HostelName LIKE @Search
                        OR hb.HostelCode LIKE @Search
                    )
                ";
            }

            sql += @"
                ORDER BY
                    hwa.AssignmentDate DESC,
                    hb.HostelName;
            ";

            return await _dbConnection
                .QueryAsync<HostelWardenAssignment>(
                    sql,
                    new
                    {
                        HostelId = hostelId,
                        StaffId = staffId,
                        Status = status,
                        Search = $"%{search}%"
                    });
        }

        public async Task<HostelWardenAssignment?>
            GetByIdAsync(int wardenAssignmentId)
        {
            const string sql = @"
                SELECT
                    hwa.WardenAssignmentId,
                    hwa.StaffId,
                    s.EmployeeId,
                    s.FirstName,
                    s.MiddleName,
                    s.LastName,
                    CONCAT_WS(
                        ' ',
                        s.FirstName,
                        NULLIF(s.MiddleName, ''),
                        s.LastName
                    ) AS WardenName,
                    hwa.HostelId,
                    hb.HostelName,
                    hb.HostelCode,
                    hb.HostelType,
                    hwa.AssignmentDate,
                    hwa.Status,
                    hwa.CreatedAt
                FROM hostel_warden_assignments hwa
                INNER JOIN Staff s
                    ON hwa.StaffId = s.Id
                INNER JOIN hostel_blocks hb
                    ON hwa.HostelId = hb.HostelId
                WHERE hwa.WardenAssignmentId =
                      @WardenAssignmentId;
            ";

            return await _dbConnection
                .QueryFirstOrDefaultAsync<HostelWardenAssignment>(
                    sql,
                    new
                    {
                        WardenAssignmentId =
                            wardenAssignmentId
                    });
        }

        public async Task<HostelWardenAssignment?>
            GetActiveByHostelAsync(int hostelId)
        {
            const string sql = @"
                SELECT
                    hwa.WardenAssignmentId,
                    hwa.StaffId,
                    s.EmployeeId,
                    s.FirstName,
                    s.MiddleName,
                    s.LastName,
                    CONCAT_WS(
                        ' ',
                        s.FirstName,
                        NULLIF(s.MiddleName, ''),
                        s.LastName
                    ) AS WardenName,
                    hwa.HostelId,
                    hb.HostelName,
                    hb.HostelCode,
                    hb.HostelType,
                    hwa.AssignmentDate,
                    hwa.Status,
                    hwa.CreatedAt
                FROM hostel_warden_assignments hwa
                INNER JOIN Staff s
                    ON hwa.StaffId = s.Id
                INNER JOIN hostel_blocks hb
                    ON hwa.HostelId = hb.HostelId
                WHERE hwa.HostelId = @HostelId
                  AND LOWER(hwa.Status) = 'active'
                ORDER BY hwa.AssignmentDate DESC
                LIMIT 1;
            ";

            return await _dbConnection
                .QueryFirstOrDefaultAsync<HostelWardenAssignment>(
                    sql,
                    new { HostelId = hostelId });
        }

        public async Task<HostelWardenAssignment?>
            GetActiveByStaffAsync(int staffId)
        {
            const string sql = @"
                SELECT
                    hwa.WardenAssignmentId,
                    hwa.StaffId,
                    s.EmployeeId,
                    s.FirstName,
                    s.MiddleName,
                    s.LastName,
                    CONCAT_WS(
                        ' ',
                        s.FirstName,
                        NULLIF(s.MiddleName, ''),
                        s.LastName
                    ) AS WardenName,
                    hwa.HostelId,
                    hb.HostelName,
                    hb.HostelCode,
                    hb.HostelType,
                    hwa.AssignmentDate,
                    hwa.Status,
                    hwa.CreatedAt
                FROM hostel_warden_assignments hwa
                INNER JOIN Staff s
                    ON hwa.StaffId = s.Id
                INNER JOIN hostel_blocks hb
                    ON hwa.HostelId = hb.HostelId
                WHERE hwa.StaffId = @StaffId
                  AND LOWER(hwa.Status) = 'active'
                ORDER BY hwa.AssignmentDate DESC
                LIMIT 1;
            ";

            return await _dbConnection
                .QueryFirstOrDefaultAsync<HostelWardenAssignment>(
                    sql,
                    new { StaffId = staffId });
        }

        public async Task<int> CreateAsync(
            HostelWardenAssignment assignment)
        {
            const string sql = @"
                INSERT INTO hostel_warden_assignments
                (
                    StaffId,
                    HostelId,
                    AssignmentDate,
                    Status
                )
                VALUES
                (
                    @StaffId,
                    @HostelId,
                    @AssignmentDate,
                    @Status
                );

                SELECT LAST_INSERT_ID();
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    assignment);
        }

        public async Task<bool> UpdateAsync(
            HostelWardenAssignment assignment)
        {
            const string sql = @"
                UPDATE hostel_warden_assignments
                SET
                    StaffId = @StaffId,
                    HostelId = @HostelId,
                    AssignmentDate = @AssignmentDate,
                    Status = @Status
                WHERE WardenAssignmentId =
                      @WardenAssignmentId;
            ";

            var affectedRows =
                await _dbConnection.ExecuteAsync(
                    sql,
                    assignment);

            return affectedRows > 0;
        }

        public async Task<bool> DeleteAsync(
            int wardenAssignmentId)
        {
            const string sql = @"
                DELETE FROM hostel_warden_assignments
                WHERE WardenAssignmentId =
                      @WardenAssignmentId;
            ";

            var affectedRows =
                await _dbConnection.ExecuteAsync(
                    sql,
                    new
                    {
                        WardenAssignmentId =
                            wardenAssignmentId
                    });

            return affectedRows > 0;
        }

        public async Task<bool> ExistsAsync(
            int wardenAssignmentId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_warden_assignments
                WHERE WardenAssignmentId =
                      @WardenAssignmentId;
            ";

            var count =
                await _dbConnection.ExecuteScalarAsync<int>(
                    sql,
                    new
                    {
                        WardenAssignmentId =
                            wardenAssignmentId
                    });

            return count > 0;
        }

        public async Task<bool> StaffExistsAsync(int staffId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM Staff
                WHERE Id = @StaffId;
            ";

            var count =
                await _dbConnection.ExecuteScalarAsync<int>(
                    sql,
                    new { StaffId = staffId });

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
    }
}