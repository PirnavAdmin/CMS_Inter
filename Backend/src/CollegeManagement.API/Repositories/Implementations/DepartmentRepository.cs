using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class DepartmentRepository : IDepartmentRepository
    {
        private readonly AppDbContext _context;

        public DepartmentRepository(AppDbContext context)
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

        public async Task<IEnumerable<Department>> GetActiveDepartmentsAsync()
        {
            return await GetDepartmentsAsync(null, includeInactive: false);
        }

        public async Task<IEnumerable<Department>> GetDepartmentsAsync(string? staffType = null, bool includeInactive = true)
        {
            var dtos = await GetDepartmentDtosAsync(staffType, includeInactive);
            return dtos.Select(d => new Department
            {
                DepartmentId = d.DepartmentId,
                DepartmentName = d.DepartmentName,
                DepartmentCode = d.DepartmentCode,
                StaffType = d.StaffType,
                Description = d.Description,
                IsActive = d.IsActive,
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt
            }).ToList();
        }

        public async Task<IEnumerable<DepartmentResponseDto>> GetDepartmentDtosAsync(string? staffType = null, bool includeInactive = true)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var depts = await conn.QueryAsync<DepartmentResponseDto>(
                    "sp_GetDepartments",
                    new { p_StaffType = staffType ?? "", p_IncludeInactive = includeInactive ? 1 : 0 },
                    commandType: CommandType.StoredProcedure);

                if (depts != null && depts.Any())
                {
                    return depts.ToList();
                }
            }
            catch
            {
                // Fallback to direct optimized SQL with precomputed counts
            }

            const string fallbackSql = @"
                SELECT 
                    d.DepartmentId,
                    d.DepartmentName,
                    d.DepartmentCode,
                    COALESCE(d.StaffType, 'Both') AS StaffType,
                    d.Description,
                    d.IsActive,
                    d.CreatedAt,
                    d.UpdatedAt,
                    COUNT(DISTINCT CASE WHEN des.IsActive = 1 THEN des.Id END) AS DesignationCount,
                    COUNT(DISTINCT CASE WHEN s.IsDeleted = 0 THEN s.Id END) AS StaffCount
                FROM `Departments` d
                LEFT JOIN `Designations` des ON des.DepartmentId = d.DepartmentId
                LEFT JOIN `Staff` s ON s.DepartmentId = d.DepartmentId
                WHERE (@IncludeInactive = 1 OR d.IsActive = 1)
                  AND (
                      @StaffType IS NULL 
                      OR TRIM(@StaffType) = '' 
                      OR LOWER(TRIM(@StaffType)) = 'all' 
                      OR (
                          LOWER(REPLACE(REPLACE(CONVERT(@StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
                          AND LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
                      )
                      OR (
                          LOWER(REPLACE(REPLACE(CONVERT(@StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
                          AND LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
                      )
                      OR LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) = LOWER(REPLACE(REPLACE(CONVERT(@StaffType USING utf8mb4), '-', ''), '_', ''))
                  )
                GROUP BY 
                    d.DepartmentId, 
                    d.DepartmentName, 
                    d.DepartmentCode, 
                    d.StaffType, 
                    d.Description, 
                    d.IsActive, 
                    d.CreatedAt, 
                    d.UpdatedAt
                ORDER BY d.DepartmentName ASC;";

            var fallbackConn = await GetOpenConnectionAsync();
            var results = await fallbackConn.QueryAsync<DepartmentResponseDto>(
                fallbackSql,
                new { StaffType = staffType ?? "", IncludeInactive = includeInactive ? 1 : 0 });

            return results.ToList();
        }

        public async Task<Department?> GetByIdAsync(int id)
        {
            var dto = await GetDtoByIdAsync(id);
            if (dto == null) return null;

            return new Department
            {
                DepartmentId = dto.DepartmentId,
                DepartmentName = dto.DepartmentName,
                DepartmentCode = dto.DepartmentCode,
                StaffType = dto.StaffType,
                Description = dto.Description,
                IsActive = dto.IsActive,
                CreatedAt = dto.CreatedAt,
                UpdatedAt = dto.UpdatedAt
            };
        }

        public async Task<DepartmentResponseDto?> GetDtoByIdAsync(int id)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var dept = await conn.QueryFirstOrDefaultAsync<DepartmentResponseDto>(
                    "sp_GetDepartmentById",
                    new { p_DepartmentId = id },
                    commandType: CommandType.StoredProcedure);

                if (dept != null) return dept;
            }
            catch { }

            const string fallbackSql = @"
                SELECT 
                    d.DepartmentId,
                    d.DepartmentName,
                    d.DepartmentCode,
                    COALESCE(d.StaffType, 'Both') AS StaffType,
                    d.Description,
                    d.IsActive,
                    d.CreatedAt,
                    d.UpdatedAt,
                    COUNT(DISTINCT CASE WHEN des.IsActive = 1 THEN des.Id END) AS DesignationCount,
                    COUNT(DISTINCT CASE WHEN s.IsDeleted = 0 THEN s.Id END) AS StaffCount
                FROM `Departments` d
                LEFT JOIN `Designations` des ON des.DepartmentId = d.DepartmentId
                LEFT JOIN `Staff` s ON s.DepartmentId = d.DepartmentId
                WHERE d.DepartmentId = @DepartmentId
                GROUP BY 
                    d.DepartmentId, 
                    d.DepartmentName, 
                    d.DepartmentCode, 
                    d.StaffType, 
                    d.Description, 
                    d.IsActive, 
                    d.CreatedAt, 
                    d.UpdatedAt
                LIMIT 1;";

            var fallbackConn = await GetOpenConnectionAsync();
            return await fallbackConn.QueryFirstOrDefaultAsync<DepartmentResponseDto>(fallbackSql, new { DepartmentId = id });
        }

        public async Task<Department> AddDepartmentAsync(Department department)
        {
            if (string.IsNullOrWhiteSpace(department.DepartmentCode))
            {
                department.DepartmentCode = $"DEP_{department.DepartmentName.Trim().ToUpper().Replace(" ", "_")}";
            }

            try
            {
                var conn = await GetOpenConnectionAsync();
                const string insertSql = @"
                    INSERT INTO `Departments` 
                        (`DepartmentName`, `DepartmentCode`, `StaffType`, `Description`, `IsActive`, `CreatedAt`)
                    VALUES 
                        (@DepartmentName, @DepartmentCode, @StaffType, @Description, @IsActive, UTC_TIMESTAMP());
                    SELECT LAST_INSERT_ID();";

                var id = await conn.ExecuteScalarAsync<int>(
                    insertSql,
                    new
                    {
                        DepartmentName = department.DepartmentName.Trim(),
                        DepartmentCode = department.DepartmentCode.Trim(),
                        StaffType = department.StaffType ?? "Both",
                        Description = department.Description,
                        IsActive = department.IsActive ? 1 : 0
                    });

                department.DepartmentId = id;
                return department;
            }
            catch
            {
                department.CreatedAt = DateTime.UtcNow;
                await _context.Departments.AddAsync(department);
                await _context.SaveChangesAsync();
                return department;
            }
        }

        public async Task<Department?> UpdateDepartmentAsync(Department department)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                const string updateSql = @"
                    UPDATE `Departments`
                    SET `DepartmentName` = @DepartmentName,
                        `DepartmentCode` = @DepartmentCode,
                        `StaffType` = @StaffType,
                        `Description` = @Description,
                        `IsActive` = @IsActive,
                        `UpdatedAt` = UTC_TIMESTAMP()
                    WHERE `DepartmentId` = @DepartmentId;";

                await conn.ExecuteAsync(
                    updateSql,
                    new
                    {
                        DepartmentId = department.DepartmentId,
                        DepartmentName = department.DepartmentName.Trim(),
                        DepartmentCode = department.DepartmentCode.Trim(),
                        StaffType = department.StaffType ?? "Both",
                        Description = department.Description,
                        IsActive = department.IsActive ? 1 : 0
                    });

                department.UpdatedAt = DateTime.UtcNow;
                return department;
            }
            catch
            {
                var existing = await _context.Departments.FindAsync(department.DepartmentId);
                if (existing == null) return null;

                existing.DepartmentName = department.DepartmentName;
                existing.DepartmentCode = department.DepartmentCode;
                existing.StaffType = department.StaffType ?? "Both";
                existing.Description = department.Description;
                existing.IsActive = department.IsActive;
                existing.UpdatedAt = DateTime.UtcNow;

                _context.Departments.Update(existing);
                await _context.SaveChangesAsync();
                return existing;
            }
        }

        public async Task<bool> DeleteDepartmentAsync(int id)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var rows = await conn.ExecuteAsync(
                    "DELETE FROM `Departments` WHERE `DepartmentId` = @DepartmentId;",
                    new { DepartmentId = id });

                return rows > 0;
            }
            catch
            {
                var existing = await _context.Departments.FindAsync(id);
                if (existing == null) return false;

                _context.Departments.Remove(existing);
                await _context.SaveChangesAsync();
                return true;
            }
        }

        public async Task<DepartmentSummaryDto> GetSummaryAsync()
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var summary = await conn.QueryFirstOrDefaultAsync<DepartmentSummaryDto>(
                    "sp_GetDepartmentSummary",
                    commandType: CommandType.StoredProcedure);

                if (summary != null) return summary;
            }
            catch { }

            const string sql = @"
                SELECT 
                    COUNT(*) AS TotalDepartments,
                    COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveDepartments,
                    COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveDepartments,
                    (SELECT COUNT(*) FROM `Designations` WHERE IsActive = 1) AS TotalDesignations,
                    (SELECT COUNT(*) FROM `Staff` WHERE IsDeleted = 0 AND (Status = 'Active' OR Status IS NULL)) AS TotalStaff
                FROM `Departments`;";

            var fallbackConn = await GetOpenConnectionAsync();
            var result = await fallbackConn.QueryFirstOrDefaultAsync<DepartmentSummaryDto>(sql);
            return result ?? new DepartmentSummaryDto();
        }

        public async Task<(bool HasDependencies, int DesignationCount, int StaffCount)> GetDependenciesAsync(int departmentId)
        {
            var conn = await GetOpenConnectionAsync();

            const string sql = @"
                SELECT 
                    (SELECT COUNT(*) FROM `Designations` WHERE DepartmentId = @DepartmentId AND IsActive = 1) AS DesignationCount,
                    (SELECT COUNT(*) FROM `Staff` WHERE DepartmentId = @DepartmentId AND IsDeleted = 0) AS StaffCount;";

            var res = await conn.QueryFirstOrDefaultAsync<dynamic>(sql, new { DepartmentId = departmentId });
            int designationCount = res?.DesignationCount != null ? Convert.ToInt32(res.DesignationCount) : 0;
            int staffCount = res?.StaffCount != null ? Convert.ToInt32(res.StaffCount) : 0;

            return (designationCount > 0 || staffCount > 0, designationCount, staffCount);
        }

        public async Task<bool> ValidateCodeAsync(string code, int? excludeId = null)
        {
            if (string.IsNullOrWhiteSpace(code)) return true;
            var normalized = code.Trim().ToUpper();

            var conn = await GetOpenConnectionAsync();
            const string sql = @"
                SELECT COUNT(*) FROM `Departments` 
                WHERE UPPER(DepartmentCode) = @Code 
                  AND (@ExcludeId IS NULL OR DepartmentId != @ExcludeId);";

            var count = await conn.ExecuteScalarAsync<int>(sql, new { Code = normalized, ExcludeId = excludeId });
            return count == 0;
        }

        public async Task<bool> ValidateNameAsync(string name, int? excludeId = null)
        {
            if (string.IsNullOrWhiteSpace(name)) return true;
            var normalized = name.Trim().ToUpper();

            var conn = await GetOpenConnectionAsync();
            const string sql = @"
                SELECT COUNT(*) FROM `Departments` 
                WHERE UPPER(DepartmentName) = @Name 
                  AND (@ExcludeId IS NULL OR DepartmentId != @ExcludeId);";

            var count = await conn.ExecuteScalarAsync<int>(sql, new { Name = normalized, ExcludeId = excludeId });
            return count == 0;
        }
    }
}
