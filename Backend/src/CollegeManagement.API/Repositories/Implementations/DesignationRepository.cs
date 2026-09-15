using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Models.Faculty;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class DesignationRepository : IDesignationRepository
    {
        private readonly AppDbContext _context;

        public DesignationRepository(AppDbContext context)
        {
            _context = context;
        }

        private async Task<DbConnection> GetOpenConnectionAsync()
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State == ConnectionState.Broken || conn.State == ConnectionState.Closed)
            {
                try { await conn.CloseAsync(); } catch { }
                await _context.Database.OpenConnectionAsync();
            }
            else if (conn.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync();
            }
            return conn;
        }

        public async Task<IEnumerable<Designation>> GetAllAsync(bool includeInactive = false, string? staffType = null, int? departmentId = null)
        {
            var dtos = await GetAllDtosAsync(includeInactive, staffType, departmentId);
            return dtos.Select(d => new Designation
            {
                Id = d.Id,
                Name = d.Name,
                DepartmentId = d.DepartmentId,
                StaffType = d.StaffType,
                IsActive = d.IsActive,
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt
            }).ToList();
        }

        public async Task<IEnumerable<DesignationResponseDto>> GetAllDtosAsync(bool includeInactive = false, string? staffType = null, int? departmentId = null)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var designations = await conn.QueryAsync<DesignationResponseDto>(
                    "sp_GetDesignations",
                    new
                    {
                        p_IncludeInactive = includeInactive ? 1 : 0,
                        p_StaffType = staffType ?? "",
                        p_DepartmentId = departmentId ?? 0
                    },
                    commandType: CommandType.StoredProcedure);

                if (designations != null && designations.Any())
                {
                    return designations.ToList();
                }
            }
            catch
            {
                // Fallback to direct optimized SQL with precomputed counts
            }

            const string fallbackSql = @"
                SELECT 
                    des.Id,
                    des.Name,
                    des.DepartmentId,
                    COALESCE(d.DepartmentName, '') AS DepartmentName,
                    COALESCE(d.DepartmentCode, '') AS DepartmentCode,
                    COALESCE(des.StaffType, 'Both') AS StaffType,
                    des.IsActive,
                    des.CreatedAt,
                    des.UpdatedAt,
                    COUNT(CASE WHEN s.IsDeleted = 0 THEN s.Id END) AS AssignedStaffCount
                FROM `Designations` des
                LEFT JOIN `Departments` d ON d.DepartmentId = des.DepartmentId
                LEFT JOIN `Staff` s ON s.DesignationId = des.Id
                WHERE (@IncludeInactive = 1 OR des.IsActive = 1)
                  AND (@DepartmentId IS NULL OR @DepartmentId <= 0 OR des.DepartmentId = @DepartmentId)
                  AND (
                      @StaffType IS NULL 
                      OR TRIM(@StaffType) = '' 
                      OR LOWER(TRIM(@StaffType)) = 'all' 
                      OR (
                          LOWER(REPLACE(REPLACE(CONVERT(@StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
                          AND LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
                      )
                      OR (
                          LOWER(REPLACE(REPLACE(CONVERT(@StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
                          AND LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
                      )
                      OR LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) = LOWER(REPLACE(REPLACE(CONVERT(@StaffType USING utf8mb4), '-', ''), '_', ''))
                  )
                GROUP BY 
                    des.Id, 
                    des.Name, 
                    des.DepartmentId, 
                    d.DepartmentName, 
                    d.DepartmentCode, 
                    des.StaffType, 
                    des.IsActive, 
                    des.CreatedAt, 
                    des.UpdatedAt
                ORDER BY des.Name ASC;";

            var fallbackConn = await GetOpenConnectionAsync();
            var results = await fallbackConn.QueryAsync<DesignationResponseDto>(
                fallbackSql,
                new
                {
                    IncludeInactive = includeInactive ? 1 : 0,
                    StaffType = staffType ?? "",
                    DepartmentId = departmentId ?? 0
                });

            return results.ToList();
        }

        public async Task<Designation?> GetByIdAsync(int id)
        {
            var dto = await GetDtoByIdAsync(id);
            if (dto == null) return null;

            return new Designation
            {
                Id = dto.Id,
                Name = dto.Name,
                DepartmentId = dto.DepartmentId,
                StaffType = dto.StaffType,
                IsActive = dto.IsActive,
                CreatedAt = dto.CreatedAt,
                UpdatedAt = dto.UpdatedAt
            };
        }

        public async Task<DesignationResponseDto?> GetDtoByIdAsync(int id)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var desig = await conn.QueryFirstOrDefaultAsync<DesignationResponseDto>(
                    "sp_GetDesignationById",
                    new { p_DesignationId = id },
                    commandType: CommandType.StoredProcedure);

                if (desig != null) return desig;
            }
            catch { }

            const string fallbackSql = @"
                SELECT 
                    des.Id,
                    des.Name,
                    des.DepartmentId,
                    COALESCE(d.DepartmentName, '') AS DepartmentName,
                    COALESCE(d.DepartmentCode, '') AS DepartmentCode,
                    COALESCE(des.StaffType, 'Both') AS StaffType,
                    des.IsActive,
                    des.CreatedAt,
                    des.UpdatedAt,
                    COUNT(CASE WHEN s.IsDeleted = 0 THEN s.Id END) AS AssignedStaffCount
                FROM `Designations` des
                LEFT JOIN `Departments` d ON d.DepartmentId = des.DepartmentId
                LEFT JOIN `Staff` s ON s.DesignationId = des.Id
                WHERE des.Id = @DesignationId
                GROUP BY 
                    des.Id, 
                    des.Name, 
                    des.DepartmentId, 
                    d.DepartmentName, 
                    d.DepartmentCode, 
                    des.StaffType, 
                    des.IsActive, 
                    des.CreatedAt, 
                    des.UpdatedAt
                LIMIT 1;";

            var fallbackConn = await GetOpenConnectionAsync();
            return await fallbackConn.QueryFirstOrDefaultAsync<DesignationResponseDto>(fallbackSql, new { DesignationId = id });
        }

        public async Task<Designation?> GetByNameAsync(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return null;
            var conn = await GetOpenConnectionAsync();

            const string sql = @"
                SELECT 
                    des.Id,
                    des.Name,
                    des.DepartmentId,
                    des.StaffType,
                    des.IsActive,
                    des.CreatedAt,
                    des.UpdatedAt
                FROM `Designations` des
                WHERE LOWER(TRIM(des.Name)) = LOWER(TRIM(@Name))
                LIMIT 1;";

            return await conn.QueryFirstOrDefaultAsync<Designation>(sql, new { Name = name.Trim() });
        }

        public async Task<bool> IsNameUniqueAsync(string name, int? excludeId = null)
        {
            if (string.IsNullOrWhiteSpace(name)) return true;
            var conn = await GetOpenConnectionAsync();

            const string sql = @"
                SELECT COUNT(*) FROM `Designations` 
                WHERE LOWER(TRIM(Name)) = LOWER(TRIM(@Name)) 
                  AND (@ExcludeId IS NULL OR Id != @ExcludeId);";

            var count = await conn.ExecuteScalarAsync<int>(sql, new { Name = name.Trim(), ExcludeId = excludeId });
            return count == 0;
        }

        public async Task<bool> IsAssignedToFacultyAsync(int designationId)
        {
            return await IsAssignedToStaffAsync(designationId);
        }

        public async Task<bool> IsAssignedToStaffAsync(int designationId)
        {
            var count = await GetAssignedStaffCountAsync(designationId);
            return count > 0;
        }

        public async Task<int> GetAssignedStaffCountAsync(int designationId)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                const string sql = "SELECT COUNT(*) FROM `Staff` WHERE DesignationId = @DesignationId AND IsDeleted = 0;";
                return await conn.ExecuteScalarAsync<int>(sql, new { DesignationId = designationId });
            }
            catch
            {
                return 0;
            }
        }

        public async Task<Designation> AddAsync(Designation designation)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                const string insertSql = @"
                    INSERT INTO `Designations` 
                        (`Name`, `DepartmentId`, `StaffType`, `IsActive`, `CreatedAt`)
                    VALUES 
                        (@Name, @DepartmentId, @StaffType, @IsActive, UTC_TIMESTAMP());
                    SELECT LAST_INSERT_ID();";

                var id = await conn.ExecuteScalarAsync<int>(
                    insertSql,
                    new
                    {
                        Name = designation.Name.Trim(),
                        DepartmentId = designation.DepartmentId > 0 ? designation.DepartmentId : null,
                        StaffType = designation.StaffType ?? "Both",
                        IsActive = designation.IsActive ? 1 : 0
                    });

                designation.Id = id;
                return designation;
            }
            catch
            {
                designation.CreatedAt = DateTime.UtcNow;
                _context.Designations.Add(designation);
                await _context.SaveChangesAsync();
                return designation;
            }
        }

        public async Task UpdateAsync(Designation designation)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                const string updateSql = @"
                    UPDATE `Designations`
                    SET `Name` = @Name,
                        `DepartmentId` = @DepartmentId,
                        `StaffType` = @StaffType,
                        `IsActive` = @IsActive,
                        `UpdatedAt` = UTC_TIMESTAMP()
                    WHERE `Id` = @Id;";

                await conn.ExecuteAsync(
                    updateSql,
                    new
                    {
                        Id = designation.Id,
                        Name = designation.Name.Trim(),
                        DepartmentId = designation.DepartmentId > 0 ? designation.DepartmentId : null,
                        StaffType = designation.StaffType ?? "Both",
                        IsActive = designation.IsActive ? 1 : 0
                    });
            }
            catch
            {
                var existing = await _context.Designations.FindAsync(designation.Id);
                if (existing != null)
                {
                    existing.Name = designation.Name;
                    existing.DepartmentId = designation.DepartmentId;
                    existing.StaffType = designation.StaffType ?? "Both";
                    existing.IsActive = designation.IsActive;
                    existing.UpdatedAt = DateTime.UtcNow;

                    _context.Designations.Update(existing);
                    await _context.SaveChangesAsync();
                }
            }
        }

        public async Task DeleteAsync(int id)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                await conn.ExecuteAsync("DELETE FROM `Designations` WHERE `Id` = @Id;", new { Id = id });
            }
            catch
            {
                var entity = await _context.Designations.FindAsync(id);
                if (entity != null)
                {
                    _context.Designations.Remove(entity);
                    await _context.SaveChangesAsync();
                }
            }
        }

        public async Task<DesignationSummaryDto> GetSummaryAsync()
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var summary = await conn.QueryFirstOrDefaultAsync<DesignationSummaryDto>(
                    "sp_GetDesignationSummary",
                    commandType: CommandType.StoredProcedure);

                if (summary != null) return summary;
            }
            catch { }

            const string sql = @"
                SELECT 
                    COUNT(*) AS TotalDesignations,
                    COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveDesignations,
                    COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveDesignations,
                    (SELECT COUNT(DISTINCT Id) FROM `Staff` WHERE DesignationId IS NOT NULL AND DesignationId > 0 AND IsDeleted = 0) AS AssignedStaffCount
                FROM `Designations`;";

            var fallbackConn = await GetOpenConnectionAsync();
            var result = await fallbackConn.QueryFirstOrDefaultAsync<DesignationSummaryDto>(sql);
            return result ?? new DesignationSummaryDto();
        }
    }
}
