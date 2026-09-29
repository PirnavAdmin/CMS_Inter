using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

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
            int pageSize,
            int? campusId = null)
        {
            var query = _context.AcademicYears
                .Include(x => x.Board)
                .AsNoTracking()
                .AsQueryable();

            if (campusId.HasValue)
            {
                query = query.Where(x => x.CampusId == campusId.Value);
            }

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

        public async Task<IEnumerable<AcademicYear>> GetForExportAsync(string? search, bool? status, int? campusId = null)
        {
            var query = _context.AcademicYears
                .Include(x => x.Board)
                .AsNoTracking()
                .AsQueryable();

            if (campusId.HasValue)
            {
                query = query.Where(x => x.CampusId == campusId.Value);
            }

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

            try
            {
                await connection.ExecuteAsync(
                    "sp_DeleteAcademicYearWithCascade",
                    new { p_AcademicYearId = id },
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                _context.AcademicYears.Remove(academicYear);
                await _context.SaveChangesAsync();
            }
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
