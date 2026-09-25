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
                UpdatedAt = d.UpdatedAt
            }).ToList();
        }

        public async Task<IEnumerable<DesignationResponseDto>> GetAllDtosAsync(bool includeInactive = false, string? staffType = null, int? departmentId = null, int? campusId = null)
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
                        p_DepartmentId = departmentId ?? 0,
                        p_CampusId = campusId
                    },
                    commandType: CommandType.StoredProcedure);

                return designations.ToList();
            }
            catch
            {
                var query = _context.Designations.AsNoTracking().AsQueryable();
                if (!includeInactive)
                {
                    query = query.Where(d => d.IsActive);
                }
                if (departmentId.HasValue && departmentId.Value > 0)
                {
                    query = query.Where(d => d.DepartmentId == departmentId.Value);
                }
                if (!string.IsNullOrWhiteSpace(staffType) && !staffType.Equals("all", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(d => d.StaffType == staffType || d.StaffType == "Both");
                }
                
                if (campusId.HasValue && campusId.Value > 0)
                {
                    query = query.Where(d => d.CampusId == campusId.Value || d.CampusId == null);
                }

                var list = await query.OrderBy(d => d.Name).ToListAsync();
                var deptDict = await _context.Departments.AsNoTracking().ToDictionaryAsync(d => d.DepartmentId, d => d);

                return list.Select(d => new DesignationResponseDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    DepartmentId = d.DepartmentId,
                    DepartmentName = d.DepartmentId.HasValue && deptDict.TryGetValue(d.DepartmentId.Value, out var dept) ? dept.DepartmentName : "",
                    DepartmentCode = d.DepartmentId.HasValue && deptDict.TryGetValue(d.DepartmentId.Value, out var dept2) ? dept2.DepartmentCode : "",
                    StaffType = d.StaffType ?? "Both",
                    IsActive = d.IsActive,
                    CreatedAt = d.CreatedAt,
                    UpdatedAt = d.UpdatedAt,
                    AssignedStaffCount = _context.Staffs.Count(s => s.DesignationId == d.Id && !s.IsDeleted)
                }).ToList();
            }
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
                    new { p_DesignationId = id },
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                var d = await _context.Designations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
                if (d == null) return null;

                var dept = d.DepartmentId.HasValue ? await _context.Departments.AsNoTracking().FirstOrDefaultAsync(x => x.DepartmentId == d.DepartmentId.Value) : null;

                return new DesignationResponseDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    DepartmentId = d.DepartmentId,
                    DepartmentName = dept?.DepartmentName ?? "",
                    DepartmentCode = dept?.DepartmentCode ?? "",
                    StaffType = d.StaffType ?? "Both",
                    IsActive = d.IsActive,
                    CreatedAt = d.CreatedAt,
                    UpdatedAt = d.UpdatedAt,
                    AssignedStaffCount = await _context.Staffs.CountAsync(s => s.DesignationId == d.Id && !s.IsDeleted)
                };
            }
        }

        public async Task<Designation?> GetByNameAsync(string name, int? campusId = null)
        {
            if (string.IsNullOrWhiteSpace(name)) return null;

            try
            {
                var conn = await GetOpenConnectionAsync();
                return await conn.QueryFirstOrDefaultAsync<Designation>(
                    "sp_GetDesignationByName",
                    new { p_Name = name.Trim(), p_CampusId = campusId },
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                var norm = name.Trim().ToLower();
                return await _context.Designations.AsNoTracking().FirstOrDefaultAsync(d => d.Name.ToLower() == norm && (d.CampusId == campusId || d.CampusId == null));
            }
        }

        public async Task<bool> IsNameUniqueAsync(string name, int? excludeId = null, int? campusId = null)
        {
            if (string.IsNullOrWhiteSpace(name)) return true;

            try
            {
                var conn = await GetOpenConnectionAsync();
                var count = await conn.ExecuteScalarAsync<int>(
                    "sp_ValidateDesignationNameUnique",
                    new { p_Name = name.Trim(), p_ExcludeId = excludeId, p_CampusId = campusId },
                    commandType: CommandType.StoredProcedure);

                return count == 0;
            }
            catch
            {
                var norm = name.Trim().ToLower();
                return !await _context.Designations.AnyAsync(d =>
                    d.Name.ToLower() == norm &&
                    (!excludeId.HasValue || d.Id != excludeId.Value) &&
                    (d.CampusId == campusId || d.CampusId == null));
            }
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
                return await conn.ExecuteScalarAsync<int>(
                    "sp_GetDesignationAssignedStaffCount",
                    new { p_DesignationId = designationId },
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await _context.Staffs.CountAsync(s => s.DesignationId == designationId && !s.IsDeleted);
            }
        }

        public async Task<Designation> AddAsync(Designation designation)
        {
            try
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
                    existing.CampusId = designation.CampusId;

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
                await conn.ExecuteAsync(
                    "sp_DeleteDesignation",
                    new { p_Id = id },
                    commandType: CommandType.StoredProcedure);
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

        public async Task<DesignationSummaryDto> GetSummaryAsync(int? campusId = null)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var summary = await conn.QueryFirstOrDefaultAsync<DesignationSummaryDto>(
                    "sp_GetDesignationSummary",
                    new { p_CampusId = campusId },
                    commandType: CommandType.StoredProcedure);

                if (summary != null) return summary;
            }
            catch { }

            return new DesignationSummaryDto
            {
                TotalDesignations = await _context.Designations.CountAsync(d => d.CampusId == campusId || d.CampusId == null),
                ActiveDesignations = await _context.Designations.CountAsync(d => d.IsActive && (d.CampusId == campusId || d.CampusId == null)),
                InactiveDesignations = await _context.Designations.CountAsync(d => !d.IsActive && (d.CampusId == campusId || d.CampusId == null)),
                AssignedStaffCount = await _context.Staffs.CountAsync(s => s.DesignationId.HasValue && s.DesignationId > 0 && !s.IsDeleted && (s.CampusId == campusId || s.CampusId == null))
            };
        }
    }
}
