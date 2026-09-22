using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class StaffSubjectAllocationRepository : IStaffSubjectAllocationRepository
    {
        private readonly AppDbContext _context;

        public StaffSubjectAllocationRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<StaffSubjectAllocation?> GetByIdAsync(int id)
        {
            try
            {
                var list = await Connection.QueryAsync<StaffSubjectAllocation, Staff, Subject, StaffSubjectAllocation>(
                    "sp_GetSubjectAllocationById",
                    (allocation, staff, subject) =>
                    {
                        allocation.Staff = staff;
                        allocation.Subject = subject;
                        return allocation;
                    },
                    new { p_Id = id },
                    splitOn: "StaffRecordId,SubjectId",
                    commandType: CommandType.StoredProcedure);

                return list.FirstOrDefault();
            }
            catch
            {
                return await _context.StaffSubjectAllocations
                    .Include(a => a.Staff)
                    .Include(a => a.Subject)
                        .ThenInclude(s => s!.BoardNavigation)
                    .Include(a => a.Subject)
                        .ThenInclude(s => s!.GroupNavigation)
                    .Include(a => a.Subject)
                        .ThenInclude(s => s!.AcademicLevelNavigation)
                    .FirstOrDefaultAsync(a => a.Id == id);
            }
        }

        public async Task<List<StaffSubjectAllocation>> GetByStaffIdAsync(int staffId)
        {
            try
            {
                var list = await Connection.QueryAsync<StaffSubjectAllocation, Staff, Subject, StaffSubjectAllocation>(
                    "sp_GetSubjectAllocationsByStaffId",
                    (allocation, staff, subject) =>
                    {
                        allocation.Staff = staff;
                        allocation.Subject = subject;
                        return allocation;
                    },
                    new { p_StaffId = staffId },
                    splitOn: "StaffRecordId,SubjectId",
                    commandType: CommandType.StoredProcedure);

                return list.ToList();
            }
            catch
            {
                return await _context.StaffSubjectAllocations
                    .Include(a => a.Staff)
                    .Include(a => a.Subject)
                        .ThenInclude(s => s!.BoardNavigation)
                    .Include(a => a.Subject)
                        .ThenInclude(s => s!.GroupNavigation)
                    .Include(a => a.Subject)
                        .ThenInclude(s => s!.AcademicLevelNavigation)
                    .Where(a => a.StaffId == staffId)
                    .OrderByDescending(a => a.Id)
                    .ToListAsync();
            }
        }

        public async Task<List<StaffSubjectAllocation>> GetBySubjectIdAsync(int subjectId)
        {
            try
            {
                var list = await Connection.QueryAsync<StaffSubjectAllocation, Staff, Subject, StaffSubjectAllocation>(
                    "sp_GetSubjectAllocationsBySubjectId",
                    (allocation, staff, subject) =>
                    {
                        allocation.Staff = staff;
                        allocation.Subject = subject;
                        return allocation;
                    },
                    new { p_SubjectId = subjectId },
                    splitOn: "StaffRecordId,SubjectId",
                    commandType: CommandType.StoredProcedure);

                return list.ToList();
            }
            catch
            {
                return await _context.StaffSubjectAllocations
                    .Include(a => a.Staff)
                    .Include(a => a.Subject)
                        .ThenInclude(s => s!.BoardNavigation)
                    .Include(a => a.Subject)
                        .ThenInclude(s => s!.GroupNavigation)
                    .Include(a => a.Subject)
                        .ThenInclude(s => s!.AcademicLevelNavigation)
                    .Where(a => a.SubjectId == subjectId)
                    .OrderByDescending(a => a.Id)
                    .ToListAsync();
            }
        }

        public async Task<bool> ExistsAllocationAsync(int staffId, int subjectId, int? excludeId = null)
        {
            try
            {
                int count = await Connection.ExecuteScalarAsync<int>(
                    "sp_CheckDuplicateStaffSubjectAllocation",
                    new { p_StaffId = staffId, p_SubjectId = subjectId, p_ExcludeId = excludeId },
                    commandType: CommandType.StoredProcedure);

                return count > 0;
            }
            catch
            {
                return await _context.StaffSubjectAllocations.AnyAsync(a =>
                    a.StaffId == staffId && a.SubjectId == subjectId &&
                    (!excludeId.HasValue || a.Id != excludeId.Value));
            }
        }

        public async Task<int?> ResolveSubjectIdAsync(int? subjectId, string board, string academicYear, string group, string academicLevel, string section, string subjectName)
        {
            if (subjectId.HasValue && subjectId.Value > 0)
                return subjectId.Value;

            try
            {
                var id = await Connection.ExecuteScalarAsync<int?>(
                    "sp_ResolveSubjectId",
                    new
                    {
                        p_SubjectName = subjectName?.Trim(),
                        p_Board = board?.Trim(),
                        p_Group = group?.Trim(),
                        p_AcademicLevel = academicLevel?.Trim()
                    },
                    commandType: CommandType.StoredProcedure);

                if (id.HasValue && id.Value > 0) return id.Value;
            }
            catch
            {
            }

            var query = _context.Subjects.AsQueryable();
            if (!string.IsNullOrWhiteSpace(subjectName))
            {
                var name = subjectName.Trim().ToLower();
                var s = await query.FirstOrDefaultAsync(x => x.SubjectName.ToLower() == name || x.SubjectCode.ToLower() == name);
                if (s != null) return s.SubjectId;
            }

            var first = await query.FirstOrDefaultAsync();
            return first?.SubjectId;
        }

        public async Task<Subject?> GetSubjectByIdAsync(int subjectId)
        {
            try
            {
                var item = await Connection.QueryFirstOrDefaultAsync<Subject>(
                    "sp_GetSubjectById",
                    new { p_SubjectId = subjectId },
                    commandType: CommandType.StoredProcedure);

                if (item != null) return item;
            }
            catch { }

            return await _context.Subjects.AsNoTracking().FirstOrDefaultAsync(s => s.SubjectId == subjectId);
        }

        public async Task<StaffSubjectAllocation> AddAsync(StaffSubjectAllocation allocation)
        {
            int sid = allocation.StaffId;

            try
            {
                int id = await Connection.ExecuteScalarAsync<int>(
                    "sp_CreateStaffSubjectAllocation",
                    new
                    {
                        p_StaffId = sid,
                        p_SubjectId = allocation.SubjectId
                    },
                    commandType: CommandType.StoredProcedure);

                allocation.Id = id;
                return allocation;
            }
            catch
            {
                allocation.CreatedAt = DateTime.UtcNow;
                await _context.StaffSubjectAllocations.AddAsync(allocation);
                await _context.SaveChangesAsync();
                return allocation;
            }
        }

        public async Task UpdateAsync(StaffSubjectAllocation allocation)
        {
            try
            {
                await Connection.ExecuteAsync(
                    "sp_UpdateStaffSubjectAllocation",
                    new { p_Id = allocation.Id, p_SubjectId = allocation.SubjectId },
                    commandType: CommandType.StoredProcedure);
                return;
            }
            catch
            {
                var existing = await _context.StaffSubjectAllocations.FindAsync(allocation.Id);
                if (existing != null)
                {
                    existing.StaffId = allocation.StaffId;
                    existing.SubjectId = allocation.SubjectId;
                    existing.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
            }
        }

        public async Task DeleteAsync(StaffSubjectAllocation allocation)
        {
            try
            {
                await Connection.ExecuteAsync(
                    "sp_DeleteStaffSubjectAllocation",
                    new { p_Id = allocation.Id },
                    commandType: CommandType.StoredProcedure);
                return;
            }
            catch
            {
                var existing = await _context.StaffSubjectAllocations.FindAsync(allocation.Id);
                if (existing != null)
                {
                    _context.StaffSubjectAllocations.Remove(existing);
                    await _context.SaveChangesAsync();
                }
            }
        }
    }
}
