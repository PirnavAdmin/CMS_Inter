using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class AcademicYearRepository : IAcademicYearRepository
    {
        private readonly AppDbContext _context;

        public AcademicYearRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<AcademicYear>> GetAllAsync()
        {
            return await _context.AcademicYears
                .Include(x => x.Board)
                .AsNoTracking()
                .OrderByDescending(x => x.StartDate)
                .ToListAsync();
        }

        public async Task<(IEnumerable<AcademicYear> Items, int TotalCount)> GetPagedAsync(
            string? search,
            bool? status,
            int pageNumber,
            int pageSize)
        {
            var query = _context.AcademicYears
                .Include(x => x.Board)
                .AsNoTracking()
                .AsQueryable();

            if (status.HasValue)
            {
                query = query.Where(x => x.IsActive == status.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(x =>
                    x.AcademicYearName.ToLower().Contains(term) ||
                    (x.Board != null && x.Board.BoardName.ToLower().Contains(term)) ||
                    (x.Description != null && x.Description.ToLower().Contains(term)));
            }

            int totalCount = await query.CountAsync();

            int skip = (pageNumber - 1) * pageSize;
            var items = await query
                .OrderByDescending(x => x.StartDate)
                .Skip(skip)
                .Take(pageSize)
                .ToListAsync();

            return (items, totalCount);
        }

        public async Task<IEnumerable<AcademicYear>> GetForExportAsync(string? search, bool? status)
        {
            var query = _context.AcademicYears
                .Include(x => x.Board)
                .AsNoTracking()
                .AsQueryable();

            if (status.HasValue)
            {
                query = query.Where(x => x.IsActive == status.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(x =>
                    x.AcademicYearName.ToLower().Contains(term) ||
                    (x.Board != null && x.Board.BoardName.ToLower().Contains(term)) ||
                    (x.Description != null && x.Description.ToLower().Contains(term)));
            }

            return await query
                .OrderByDescending(x => x.StartDate)
                .ToListAsync();
        }

        public async Task<AcademicYear?> GetByIdAsync(int id)
        {
            return await _context.AcademicYears
                .Include(x => x.Board)
                .FirstOrDefaultAsync(x => x.AcademicYearId == id);
        }

        public async Task AddAsync(AcademicYear academicYear)
        {
            await _context.AcademicYears.AddAsync(academicYear);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(AcademicYear academicYear)
        {
            _context.AcademicYears.Update(academicYear);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(AcademicYear academicYear)
        {
            var id = academicYear.AcademicYearId;

            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            using var cmd = connection.CreateCommand();

            cmd.CommandText = "SET FOREIGN_KEY_CHECKS = 0;";
            await cmd.ExecuteNonQueryAsync();

            string[] cleanupSqls = new[]
            {
                $"DELETE FROM Results WHERE ExamId IN (SELECT ExamId FROM Examinations WHERE AcademicYearId = {id});",
                $"DELETE FROM Examinations WHERE AcademicYearId = {id};",
                $"DELETE FROM Marks WHERE AcademicYearId = {id};",
                $"DELETE FROM FeeStructures WHERE AcademicYearId = {id};",
                $"DELETE FROM Timetables WHERE AcademicYearId = {id};",
                $"DELETE FROM AttendanceSessions WHERE AcademicYearId = {id};",
                $"DELETE FROM Groups WHERE AcademicYearId = {id};",
                $"UPDATE Students SET AcademicYearId = NULL WHERE AcademicYearId = {id};",
                $"UPDATE StudentAdmissions SET AcademicYearId = NULL WHERE AcademicYearId = {id};",
                $"DELETE FROM AcademicYears WHERE AcademicYearId = {id};"
            };

            foreach (var sql in cleanupSqls)
            {
                try
                {
                    cmd.CommandText = sql;
                    await cmd.ExecuteNonQueryAsync();
                }
                catch
                {
                    // Ignore optional non-existent tables during cascade cleanup
                }
            }

            cmd.CommandText = "SET FOREIGN_KEY_CHECKS = 1;";
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task DeactivateAllExceptAsync(int activeId)
        {
            var otherActiveYears = await _context.AcademicYears
                .Where(x => x.IsActive && x.AcademicYearId != activeId)
                .ToListAsync();

            foreach (var year in otherActiveYears)
            {
                year.IsActive = false;
            }

            if (otherActiveYears.Any())
            {
                await _context.SaveChangesAsync();
            }
        }
    }
}
