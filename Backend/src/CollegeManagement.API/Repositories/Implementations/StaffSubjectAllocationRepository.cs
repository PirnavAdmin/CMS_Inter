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

                var item = list.FirstOrDefault();
                if (item != null) return item;
            }
            catch
            {
            }

            try
            {
                var sql = @"
                    SELECT 
                        a.Id, a.StaffId, a.SubjectId, a.CreatedAt, a.UpdatedAt,
                        s.Id AS StaffRecordId, s.Id, s.EmployeeId, s.FirstName, s.LastName, s.Email, s.Mobile, s.Designation, s.StaffType,
                        sub.SubjectId, sub.SubjectName, sub.SubjectCode, sub.SubjectType,
                        sub.BoardId, sub.GroupId, sub.AcademicLevelId, sub.TotalMarks, sub.PassingMarks, sub.IsActive,
                        COALESCE(b.BoardName, '') AS Board,
                        COALESCE(g.GroupName, '') AS `Group`,
                        COALESCE(al.LevelName, '') AS AcademicLevel
                    FROM StaffSubjectAllocations a
                    INNER JOIN Staffs s ON s.Id = a.StaffId
                    INNER JOIN Subjects sub ON sub.SubjectId = a.SubjectId
                    LEFT JOIN Boards b ON b.BoardId = sub.BoardId
                    LEFT JOIN `Groups` g ON g.GroupId = sub.GroupId
                    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = sub.AcademicLevelId
                    WHERE a.Id = @id;";

                var list = await Connection.QueryAsync<StaffSubjectAllocation, Staff, Subject, StaffSubjectAllocation>(
                    sql,
                    (allocation, staff, subject) =>
                    {
                        allocation.Staff = staff;
                        allocation.Subject = subject;
                        return allocation;
                    },
                    new { id },
                    splitOn: "StaffRecordId,SubjectId");

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

                var result = list.ToList();
                if (result.Any()) return result;
            }
            catch
            {
            }

            try
            {
                var sql = @"
                    SELECT 
                        a.Id, a.StaffId, a.SubjectId, a.CreatedAt, a.UpdatedAt,
                        s.Id AS StaffRecordId, s.Id, s.EmployeeId, s.FirstName, s.LastName, s.Email, s.Mobile, s.Designation, s.StaffType,
                        sub.SubjectId, sub.SubjectName, sub.SubjectCode, sub.SubjectType,
                        sub.BoardId, sub.GroupId, sub.AcademicLevelId, sub.TotalMarks, sub.PassingMarks, sub.IsActive,
                        COALESCE(b.BoardName, '') AS Board,
                        COALESCE(g.GroupName, '') AS `Group`,
                        COALESCE(al.LevelName, '') AS AcademicLevel
                    FROM StaffSubjectAllocations a
                    INNER JOIN Staffs s ON s.Id = a.StaffId
                    INNER JOIN Subjects sub ON sub.SubjectId = a.SubjectId
                    LEFT JOIN Boards b ON b.BoardId = sub.BoardId
                    LEFT JOIN `Groups` g ON g.GroupId = sub.GroupId
                    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = sub.AcademicLevelId
                    WHERE a.StaffId = @staffId
                    ORDER BY a.Id DESC;";

                var list = await Connection.QueryAsync<StaffSubjectAllocation, Staff, Subject, StaffSubjectAllocation>(
                    sql,
                    (allocation, staff, subject) =>
                    {
                        allocation.Staff = staff;
                        allocation.Subject = subject;
                        return allocation;
                    },
                    new { staffId },
                    splitOn: "StaffRecordId,SubjectId");

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

                var result = list.ToList();
                if (result.Any()) return result;
            }
            catch
            {
            }

            try
            {
                var sql = @"
                    SELECT 
                        a.Id, a.StaffId, a.SubjectId, a.CreatedAt, a.UpdatedAt,
                        s.Id AS StaffRecordId, s.Id, s.EmployeeId, s.FirstName, s.LastName, s.Email, s.Mobile, s.Designation, s.StaffType,
                        sub.SubjectId, sub.SubjectName, sub.SubjectCode, sub.SubjectType,
                        sub.BoardId, sub.GroupId, sub.AcademicLevelId, sub.TotalMarks, sub.PassingMarks, sub.IsActive,
                        COALESCE(b.BoardName, '') AS Board,
                        COALESCE(g.GroupName, '') AS `Group`,
                        COALESCE(al.LevelName, '') AS AcademicLevel
                    FROM StaffSubjectAllocations a
                    INNER JOIN Staffs s ON s.Id = a.StaffId
                    INNER JOIN Subjects sub ON sub.SubjectId = a.SubjectId
                    LEFT JOIN Boards b ON b.BoardId = sub.BoardId
                    LEFT JOIN `Groups` g ON g.GroupId = sub.GroupId
                    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = sub.AcademicLevelId
                    WHERE a.SubjectId = @subjectId
                    ORDER BY a.Id DESC;";

                var list = await Connection.QueryAsync<StaffSubjectAllocation, Staff, Subject, StaffSubjectAllocation>(
                    sql,
                    (allocation, staff, subject) =>
                    {
                        allocation.Staff = staff;
                        allocation.Subject = subject;
                        return allocation;
                    },
                    new { subjectId },
                    splitOn: "StaffRecordId,SubjectId");

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
            }

            try
            {
                int count = await Connection.ExecuteScalarAsync<int>(
                    "sp_CheckStaffSubjectAllocationExists",
                    new { p_StaffId = staffId, p_SubjectId = subjectId, p_ExcludeId = excludeId },
                    commandType: CommandType.StoredProcedure);

                return count > 0;
            }
            catch
            {
                var sql = @"
                    SELECT COUNT(*) FROM StaffSubjectAllocations 
                    WHERE StaffId = @staffId AND SubjectId = @subjectId 
                      AND (@excludeId IS NULL OR Id != @excludeId);";

                int count = await Connection.ExecuteScalarAsync<int>(sql, new { staffId, subjectId, excludeId });
                return count > 0;
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
                var sql = @"
                    SELECT 
                        sub.SubjectId, sub.SubjectName, sub.SubjectCode, sub.SubjectType,
                        sub.BoardId, sub.GroupId, sub.AcademicLevelId, sub.TotalMarks, sub.PassingMarks, sub.IsActive,
                        COALESCE(b.BoardName, '') AS Board,
                        COALESCE(g.GroupName, '') AS `Group`,
                        COALESCE(al.LevelName, '') AS AcademicLevel
                    FROM Subjects sub
                    LEFT JOIN Boards b ON b.BoardId = sub.BoardId
                    LEFT JOIN `Groups` g ON g.GroupId = sub.GroupId
                    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = sub.AcademicLevelId
                    WHERE sub.SubjectId = @subjectId;";

                var item = await Connection.QueryFirstOrDefaultAsync<Subject>(sql, new { subjectId });
                if (item != null) return item;
            }
            catch {}

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
            }

            try
            {
                int id = await Connection.ExecuteScalarAsync<int>(
                    "sp_AssignStaffSubject",
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
                var insertSql = @"
                    INSERT INTO StaffSubjectAllocations (StaffId, SubjectId, CreatedAt)
                    VALUES (@sid, @subjectId, UTC_TIMESTAMP());
                    SELECT LAST_INSERT_ID();";

                int id = await Connection.ExecuteScalarAsync<int>(insertSql, new { sid, subjectId = allocation.SubjectId });
                allocation.Id = id;
                return allocation;
            }
        }

        public async Task UpdateAsync(StaffSubjectAllocation allocation)
        {
            int sid = allocation.StaffId;

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
            }

            var sql = @"
                UPDATE StaffSubjectAllocations 
                SET StaffId = @sid, SubjectId = @subjectId, UpdatedAt = UTC_TIMESTAMP()
                WHERE Id = @id;";

            await Connection.ExecuteAsync(sql, new { id = allocation.Id, sid, subjectId = allocation.SubjectId });
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
            }

            var sql = "DELETE FROM StaffSubjectAllocations WHERE Id = @id;";
            await Connection.ExecuteAsync(sql, new { id = allocation.Id });
        }
    }
}
