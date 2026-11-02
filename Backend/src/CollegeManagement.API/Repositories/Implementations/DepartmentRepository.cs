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

        public async Task<IEnumerable<Department>> GetActiveDepartmentsAsync(int? campusId = null)
        {
            return await GetDepartmentsAsync(null, includeInactive: false, campusId: campusId);
        }

        public async Task<IEnumerable<Department>> GetDepartmentsAsync(string? staffType = null, bool includeInactive = true, int? campusId = null)
        {
            var dtos = await GetDepartmentDtosAsync(staffType, includeInactive, campusId);
            return dtos.Select(d => new Department
            {
                DepartmentId = d.DepartmentId,
                DepartmentName = d.DepartmentName,
                DepartmentCode = d.DepartmentCode,
                StaffType = d.StaffType,
                Description = d.Description,
                IsActive = d.IsActive,
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt,
                CampusId = campusId
            }).ToList();
        }

        public async Task<IEnumerable<DepartmentResponseDto>> GetDepartmentDtosAsync(string? staffType = null, bool includeInactive = true, int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var depts = await conn.QueryAsync<DepartmentResponseDto>(
                "sp_GetDepartments",
                new
                {
                    p_StaffType = staffType ?? "",
                    p_IncludeInactive = includeInactive ? 1 : 0,
                    p_CampusId = campusId
                },
                commandType: CommandType.StoredProcedure);

            return depts.ToList();
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
            var conn = await GetOpenConnectionAsync();
            return await conn.QueryFirstOrDefaultAsync<DepartmentResponseDto>(
                "sp_GetDepartmentById",
                new { p_DepartmentId = id },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<Department> AddDepartmentAsync(Department department)
        {
            if (string.IsNullOrWhiteSpace(department.DepartmentCode))
            {
                department.DepartmentCode = $"DEP_{department.DepartmentName.Trim().ToUpper().Replace(" ", "_")}";
            }

            var conn = await GetOpenConnectionAsync();
            var id = await conn.ExecuteScalarAsync<int>(
                "sp_CreateDepartment",
                new
                {
                    p_DepartmentName = department.DepartmentName.Trim(),
                    p_DepartmentCode = department.DepartmentCode.Trim(),
                    p_StaffType = department.StaffType ?? "Both",
                    p_Description = department.Description,
                    p_IsActive = department.IsActive ? 1 : 0,
                    p_CampusId = department.CampusId
                },
                commandType: CommandType.StoredProcedure);

            department.DepartmentId = id;
            return department;
        }

        public async Task<Department?> UpdateDepartmentAsync(Department department)
        {
            var conn = await GetOpenConnectionAsync();
            await conn.ExecuteAsync(
                "sp_UpdateDepartment",
                new
                {
                    p_DepartmentId = department.DepartmentId,
                    p_DepartmentName = department.DepartmentName.Trim(),
                    p_DepartmentCode = department.DepartmentCode.Trim(),
                    p_StaffType = department.StaffType ?? "Both",
                    p_Description = department.Description,
                    p_IsActive = department.IsActive ? 1 : 0,
                    p_CampusId = department.CampusId
                },
                commandType: CommandType.StoredProcedure);

            department.UpdatedAt = DateTime.UtcNow;
            return department;
        }

        public async Task<bool> DeleteDepartmentAsync(int id)
        {
            var conn = await GetOpenConnectionAsync();
            var rows = await conn.ExecuteAsync(
                "sp_DeleteDepartment",
                new { p_DepartmentId = id },
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task<DepartmentSummaryDto> GetSummaryAsync(int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var summary = await conn.QueryFirstOrDefaultAsync<DepartmentSummaryDto>(
                "sp_GetDepartmentSummary",
                new { p_CampusId = campusId },
                commandType: CommandType.StoredProcedure);

            return summary ?? new DepartmentSummaryDto();
        }

        public async Task<(bool HasDependencies, int DesignationCount, int StaffCount)> GetDependenciesAsync(int departmentId)
        {
            var conn = await GetOpenConnectionAsync();
            var res = await conn.QueryFirstOrDefaultAsync<dynamic>(
                "sp_GetDepartmentDependencies",
                new { p_DepartmentId = departmentId },
                commandType: CommandType.StoredProcedure);

            int designationCount = res?.DesignationCount != null ? Convert.ToInt32(res.DesignationCount) : 0;
            int staffCount = res?.StaffCount != null ? Convert.ToInt32(res.StaffCount) : 0;

            return (designationCount > 0 || staffCount > 0, designationCount, staffCount);
        }

        public async Task<bool> ValidateCodeAsync(string code, int? excludeId = null, int? campusId = null)
        {
            if (string.IsNullOrWhiteSpace(code)) return true;
            var normalized = code.Trim().ToUpper();

            var conn = await GetOpenConnectionAsync();
            var count = await conn.ExecuteScalarAsync<int>(
                "sp_ValidateDepartmentCode",
                new { p_Code = normalized, p_ExcludeId = excludeId, p_CampusId = campusId },
                commandType: CommandType.StoredProcedure);

            return count == 0;
        }

        public async Task<bool> ValidateNameAsync(string name, int? excludeId = null, int? campusId = null)
        {
            if (string.IsNullOrWhiteSpace(name)) return true;
            var normalized = name.Trim().ToUpper();

            var conn = await GetOpenConnectionAsync();
            var count = await conn.ExecuteScalarAsync<int>(
                "sp_ValidateDepartmentName",
                new { p_Name = normalized, p_ExcludeId = excludeId, p_CampusId = campusId },
                commandType: CommandType.StoredProcedure);

            return count == 0;
        }
    }
}
