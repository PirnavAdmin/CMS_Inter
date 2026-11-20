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
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class DesignationRepository : IDesignationRepository
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public DesignationRepository(AppDbContext context, IHttpContextAccessor? httpContextAccessor = null)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        private int? ResolveCollegeId()
        {
            var claim = _httpContextAccessor?.HttpContext?.User?.FindFirst("CollegeId")?.Value
                     ?? _httpContextAccessor?.HttpContext?.User?.FindFirst("collegeId")?.Value;
            if (int.TryParse(claim, out int cid) && cid > 0) return cid;
            return null;
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
            if (campusId == Filters.TenantIsolationActionFilter.NoCampusSentinel)
            {
                return Enumerable.Empty<DesignationResponseDto>();
            }

            string normalizedStaffType = staffType ?? "";
            if (normalizedStaffType.Equals("NonTeaching", StringComparison.OrdinalIgnoreCase))
            {
                normalizedStaffType = "Non-Teaching";
            }

            var conn = await GetOpenConnectionAsync();
            var collegeId = ResolveCollegeId();
            var designations = await conn.QueryAsync<DesignationResponseDto>(
                "sp_GetDesignations",
                new
                {
                    p_IncludeInactive = includeInactive ? 1 : 0,
                    p_StaffType = normalizedStaffType,
                    p_DepartmentId = departmentId ?? 0,
                    p_CampusId = campusId,
                    p_CollegeId = collegeId
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
            try
            {
                var conn = await GetOpenConnectionAsync();
                return await conn.QueryFirstOrDefaultAsync<DesignationResponseDto>(
                    "sp_GetDesignationById",
                    new { p_DesignationId = id, p_CampusId = (int?)null },
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                var desig = await _context.Designations.FindAsync(id);
                if (desig == null) return null;
                return new DesignationResponseDto
                {
                    Id = desig.Id,
                    Name = desig.Name,
                    DepartmentId = desig.DepartmentId,
                    StaffType = desig.StaffType,
                    IsActive = desig.IsActive,
                    CreatedAt = desig.CreatedAt,
                    UpdatedAt = desig.UpdatedAt
                };
            }
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
            int resolvedCollegeId = designation.CollegeId.HasValue && designation.CollegeId.Value > 0 
                ? designation.CollegeId.Value 
                : (designation.CampusId.HasValue ? await conn.ExecuteScalarAsync<int>("SELECT COALESCE((SELECT CollegeId FROM Campuses WHERE CampusId = @CampusId), 1);", new { CampusId = designation.CampusId }) : 1);
            designation.CollegeId = resolvedCollegeId;

            var id = await conn.ExecuteScalarAsync<int>(
                "sp_CreateDesignation",
                new
                {
                    p_Name = designation.Name.Trim(),
                    p_DepartmentId = designation.DepartmentId > 0 ? designation.DepartmentId : 0,
                    p_StaffType = designation.StaffType ?? "Both",
                    p_IsActive = designation.IsActive ? 1 : 0,
                    p_CampusId = designation.CampusId,
                    p_CollegeId = resolvedCollegeId
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
            if (campusId == Filters.TenantIsolationActionFilter.NoCampusSentinel)
            {
                return new DesignationSummaryDto();
            }

            var conn = await GetOpenConnectionAsync();
            var summary = await conn.QueryFirstOrDefaultAsync<DesignationSummaryDto>(
                "sp_GetDesignationSummary",
                new { p_CampusId = campusId },
                commandType: CommandType.StoredProcedure);

            return summary ?? new DesignationSummaryDto();
        }
    }
}
