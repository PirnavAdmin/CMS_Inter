using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.AcademicCalendar;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class AcademicCalendarRepository : IAcademicCalendarRepository
    {
        private readonly AppDbContext _context;

        public AcademicCalendarRepository(AppDbContext context)
        {
            _context = context;
        }

        private IQueryable<AcademicCalendarEvent> BaseQuery()
        {
            return _context.AcademicCalendarEvents
                .Include(e => e.Board)
                .Include(e => e.AcademicYear)
                .Include(e => e.Campus)
                .Include(e => e.AcademicLevel)
                .Include(e => e.Group)
                .Include(e => e.Program)
                .Include(e => e.Section)
                .Where(e => !e.IsDeleted);
        }

        public async Task<(List<AcademicCalendarEvent> Items, int TotalCount)> GetPagedEventsAsync(AcademicCalendarFilterDto filter)
        {
            var query = BaseQuery();

            if (filter.AcademicYearId.HasValue && filter.AcademicYearId > 0)
                query = query.Where(e => e.AcademicYearId == filter.AcademicYearId.Value);

            if (filter.BoardId.HasValue && filter.BoardId > 0)
                query = query.Where(e => e.BoardId == filter.BoardId.Value);

            if (filter.CampusId.HasValue && filter.CampusId > 0)
                query = query.Where(e => e.CampusId == null || e.CampusId == filter.CampusId.Value);

            if (filter.AcademicLevelId.HasValue && filter.AcademicLevelId > 0)
                query = query.Where(e => e.AcademicLevelId == null || e.AcademicLevelId == filter.AcademicLevelId.Value);

            if (filter.GroupId.HasValue && filter.GroupId > 0)
                query = query.Where(e => e.GroupId == null || e.GroupId == filter.GroupId.Value);

            if (filter.ProgramId.HasValue && filter.ProgramId > 0)
                query = query.Where(e => e.ProgramId == null || e.ProgramId == filter.ProgramId.Value);

            if (filter.SectionId.HasValue && filter.SectionId > 0)
                query = query.Where(e => e.SectionId == null || e.SectionId == filter.SectionId.Value);

            if (!string.IsNullOrWhiteSpace(filter.EventType))
                query = query.Where(e => e.EventType.ToLower() == filter.EventType.ToLower());

            if (!string.IsNullOrWhiteSpace(filter.Status))
                query = query.Where(e => e.Status.ToLower() == filter.Status.ToLower());

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var term = filter.Search.Trim().ToLower();
                query = query.Where(e => e.Title.ToLower().Contains(term) || (e.Description != null && e.Description.ToLower().Contains(term)));
            }

            if (filter.StartDate.HasValue)
                query = query.Where(e => e.EndDate >= filter.StartDate.Value);

            if (filter.EndDate.HasValue)
                query = query.Where(e => e.StartDate <= filter.EndDate.Value);

            if (filter.Month.HasValue && filter.Year.HasValue)
            {
                var monthStart = new DateTime(filter.Year.Value, filter.Month.Value, 1);
                var monthEnd = monthStart.AddMonths(1).AddTicks(-1);
                query = query.Where(e => e.StartDate <= monthEnd && e.EndDate >= monthStart);
            }
            else if (filter.Year.HasValue)
            {
                var yearStart = new DateTime(filter.Year.Value, 1, 1);
                var yearEnd = new DateTime(filter.Year.Value, 12, 31, 23, 59, 59);
                query = query.Where(e => e.StartDate <= yearEnd && e.EndDate >= yearStart);
            }

            int totalCount = await query.CountAsync();

            int page = filter.Page > 0 ? filter.Page : 1;
            int pageSize = filter.PageSize > 0 ? filter.PageSize : 50;

            var items = await query
                .OrderBy(e => e.StartDate)
                .ThenBy(e => e.StartTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .AsNoTracking()
                .ToListAsync();

            return (items, totalCount);
        }

        public async Task<List<AcademicCalendarEvent>> GetEventsByRangeAsync(
            DateTime startDate,
            DateTime endDate,
            int? boardId = null,
            int? academicYearId = null,
            int? campusId = null,
            int? academicLevelId = null,
            int? groupId = null)
        {
            var query = BaseQuery()
                .Where(e => e.StartDate <= endDate && e.EndDate >= startDate);

            if (boardId.HasValue && boardId > 0)
                query = query.Where(e => e.BoardId == boardId.Value);

            if (academicYearId.HasValue && academicYearId > 0)
                query = query.Where(e => e.AcademicYearId == academicYearId.Value);

            if (campusId.HasValue && campusId > 0)
                query = query.Where(e => e.CampusId == null || e.CampusId == campusId.Value);

            if (academicLevelId.HasValue && academicLevelId > 0)
                query = query.Where(e => e.AcademicLevelId == null || e.AcademicLevelId == academicLevelId.Value);

            if (groupId.HasValue && groupId > 0)
                query = query.Where(e => e.GroupId == null || e.GroupId == groupId.Value);

            return await query
                .OrderBy(e => e.StartDate)
                .ThenBy(e => e.StartTime)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<AcademicCalendarEvent?> GetByIdAsync(int eventId)
        {
            return await BaseQuery()
                .FirstOrDefaultAsync(e => e.EventId == eventId);
        }

        public async Task<AcademicCalendarMetricsDto> GetMetricsAsync(int? academicYearId, int? boardId, int? campusId)
        {
            var query = _context.AcademicCalendarEvents.Where(e => !e.IsDeleted);

            if (academicYearId.HasValue && academicYearId > 0)
                query = query.Where(e => e.AcademicYearId == academicYearId.Value);

            if (boardId.HasValue && boardId > 0)
                query = query.Where(e => e.BoardId == boardId.Value);

            if (campusId.HasValue && campusId > 0)
                query = query.Where(e => e.CampusId == null || e.CampusId == campusId.Value);

            var today = DateTime.UtcNow.Date;

            var list = await query
                .Select(e => new { e.EventType, e.StartDate, e.EndDate, e.Status })
                .AsNoTracking()
                .ToListAsync();

            var metrics = new AcademicCalendarMetricsDto
            {
                TotalEvents = list.Count,
                UpcomingEvents = list.Count(e => e.EndDate.Date >= today && e.Status != "Cancelled"),
                Examinations = list.Count(e => e.EventType.Equals("Examinations", StringComparison.OrdinalIgnoreCase) ||
                                               e.EventType.Equals("Practical Examinations", StringComparison.OrdinalIgnoreCase)),
                Holidays = list.Count(e => e.EventType.Equals("Holidays", StringComparison.OrdinalIgnoreCase))
            };

            // Group counts
            var grouped = list
                .GroupBy(e => e.EventType)
                .ToDictionary(g => g.Key, g => g.Count());

            metrics.EventTypeCounts = grouped;

            return metrics;
        }

        public async Task<List<AcademicCalendarEvent>> GetUpcomingEventsAsync(int? academicYearId, int? boardId, int? campusId, int count = 5)
        {
            var today = DateTime.UtcNow.Date;
            var query = BaseQuery()
                .Where(e => e.EndDate.Date >= today && e.Status != "Cancelled");

            if (academicYearId.HasValue && academicYearId > 0)
                query = query.Where(e => e.AcademicYearId == academicYearId.Value);

            if (boardId.HasValue && boardId > 0)
                query = query.Where(e => e.BoardId == boardId.Value);

            if (campusId.HasValue && campusId > 0)
                query = query.Where(e => e.CampusId == null || e.CampusId == campusId.Value);

            return await query
                .OrderBy(e => e.StartDate)
                .ThenBy(e => e.StartTime)
                .Take(count)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<AcademicCalendarEvent> CreateAsync(AcademicCalendarEvent entity)
        {
            entity.CreatedAt = DateTime.UtcNow;
            await _context.AcademicCalendarEvents.AddAsync(entity);
            await _context.SaveChangesAsync();
            return entity;
        }

        public async Task<AcademicCalendarEvent> UpdateAsync(AcademicCalendarEvent entity)
        {
            entity.UpdatedAt = DateTime.UtcNow;
            _context.AcademicCalendarEvents.Update(entity);
            await _context.SaveChangesAsync();
            return entity;
        }

        public async Task<bool> DeleteAsync(int eventId, int? deletedBy = null)
        {
            var entity = await _context.AcademicCalendarEvents.FindAsync(eventId);
            if (entity == null || entity.IsDeleted) return false;

            entity.IsDeleted = true;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = deletedBy;

            await _context.SaveChangesAsync();
            return true;
        }
    }
}
