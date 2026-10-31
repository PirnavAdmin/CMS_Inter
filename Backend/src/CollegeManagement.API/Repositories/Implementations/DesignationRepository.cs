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

        public async Task<IEnumerable<Designation>> GetAllAsync(bool includeInactive = false, string? staffType = null, int? departmentId = null, int? campusId = null)
        {
            var dtos = await GetAllDtosAsync(includeInactive, staffType, departmentId, campusId);
            return dtos.Select(d => new Designation
            {
                Id = d.Id,
                Name = d.Name,
                DepartmentId = d.DepartmentId,
                StaffType = d.StaffType,
                IsActive = d.IsActive,
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt,
                CampusId = campusId
            }).ToList();
        }

        public async Task<IEnumerable<DesignationResponseDto>> GetAllDtosAsync(bool includeInactive = false, string? staffType = null, int? departmentId = null, int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var designations = await conn.QueryAsync<DesignationResponseDto>(
                "sp_GetDesignations",
                new
                {
                    p_IncludeInactive = includeInactive ? 1 : 0,
                    p_StaffType = staffType ?? "",
                    p_DepartmentId = departmentId ?? 0,
                    p_CampusId = campusId
                },
                commandType: CommandType.StoredProcedure);

            return designations.ToList();
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
            var conn = await GetOpenConnectionAsync();
            return await conn.QueryFirstOrDefaultAsync<DesignationResponseDto>(
                "sp_GetDesignationById",
                new { p_DesignationId = id },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<Designation?> GetByNameAsync(string name, int? campusId = null)
        {
            if (string.IsNullOrWhiteSpace(name)) return null;

            var conn = await GetOpenConnectionAsync();
            return await conn.QueryFirstOrDefaultAsync<Designation>(
                "sp_GetDesignationByName",
                new { p_Name = name.Trim(), p_CampusId = campusId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> IsNameUniqueAsync(string name, int? excludeId = null, int? campusId = null)
        {
            if (string.IsNullOrWhiteSpace(name)) return true;

            var conn = await GetOpenConnectionAsync();
            var count = await conn.ExecuteScalarAsync<int>(
                "sp_ValidateDesignationNameUnique",
                new { p_Name = name.Trim(), p_ExcludeId = excludeId, p_CampusId = campusId },
                commandType: CommandType.StoredProcedure);

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
            var conn = await GetOpenConnectionAsync();
            return await conn.ExecuteScalarAsync<int>(
                "sp_GetDesignationAssignedStaffCount",
                new { p_DesignationId = designationId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<Designation> AddAsync(Designation designation)
        {
            var conn = await GetOpenConnectionAsync();
            var id = await conn.ExecuteScalarAsync<int>(
                "sp_CreateDesignation",
                new
                {
                    p_Name = designation.Name.Trim(),
                    p_DepartmentId = designation.DepartmentId > 0 ? designation.DepartmentId : 0,
                    p_StaffType = designation.StaffType ?? "Both",
                    p_IsActive = designation.IsActive ? 1 : 0,
                    p_CampusId = designation.CampusId
                },
                commandType: CommandType.StoredProcedure);

            designation.Id = id;
            return designation;
        }

        public async Task UpdateAsync(Designation designation)
        {
            var conn = await GetOpenConnectionAsync();
            await conn.ExecuteAsync(
                "sp_UpdateDesignation",
                new
                {
                    p_Id = designation.Id,
                    p_Name = designation.Name.Trim(),
                    p_DepartmentId = designation.DepartmentId > 0 ? designation.DepartmentId : 0,
                    p_StaffType = designation.StaffType ?? "Both",
                    p_IsActive = designation.IsActive ? 1 : 0,
                    p_CampusId = designation.CampusId
                },
                commandType: CommandType.StoredProcedure);

            designation.UpdatedAt = DateTime.UtcNow;
        }

        public async Task DeleteAsync(int id)
        {
            var conn = await GetOpenConnectionAsync();
            await conn.ExecuteAsync(
                "sp_DeleteDesignation",
                new { p_Id = id },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<DesignationSummaryDto> GetSummaryAsync(int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var summary = await conn.QueryFirstOrDefaultAsync<DesignationSummaryDto>(
                "sp_GetDesignationSummary",
                new { p_CampusId = campusId },
                commandType: CommandType.StoredProcedure);

            return summary ?? new DesignationSummaryDto();
        }
    }
}
