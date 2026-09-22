using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories
{
    public class SubjectRepository : ISubjectRepository
    {
        private readonly AppDbContext _context;

        public SubjectRepository(AppDbContext context) => _context = context;

        private static string Clean(string value) => string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();

        private async Task PopulateNavigationsAsync(List<Subject> subjects)
        {
            if (subjects == null || subjects.Count == 0) return;

            var boardIds = subjects.Where(s => s.BoardId > 0).Select(s => s.BoardId).Distinct().ToList();
            var groupIds = subjects.Where(s => s.GroupId > 0).Select(s => s.GroupId).Distinct().ToList();
            var levelIds = subjects.Where(s => s.AcademicLevelId > 0).Select(s => s.AcademicLevelId).Distinct().ToList();

            var boards = await _context.Boards.AsNoTracking().Where(b => boardIds.Contains(b.BoardId)).ToDictionaryAsync(b => b.BoardId);
            var groups = await _context.Groups.AsNoTracking().Where(g => groupIds.Contains(g.GroupId)).ToDictionaryAsync(g => g.GroupId);
            var levels = await _context.AcademicLevels.AsNoTracking().Where(l => levelIds.Contains(l.AcademicLevelId)).ToDictionaryAsync(l => l.AcademicLevelId);

            foreach (var s in subjects)
            {
                if (s.BoardId > 0 && boards.TryGetValue(s.BoardId, out var b)) s.BoardNavigation = b;
                if (s.GroupId > 0 && groups.TryGetValue(s.GroupId, out var g)) s.GroupNavigation = g;
                if (s.AcademicLevelId > 0 && levels.TryGetValue(s.AcademicLevelId, out var l)) s.AcademicLevelNavigation = l;
            }
        }

        public async Task<IEnumerable<Subject>> GetAllAsync()
        {
            var subjects = await _context.Subjects
                .AsNoTracking()
                .OrderBy(s => s.SubjectId)
                .ToListAsync();

            await PopulateNavigationsAsync(subjects);
            return subjects;
        }

        public async Task<Subject?> GetByIdAsync(int subjectId)
        {
            var subject = await _context.Subjects
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SubjectId == subjectId);

            if (subject != null)
            {
                await PopulateNavigationsAsync(new List<Subject> { subject });
            }

            return subject;
        }

        public async Task<Subject> CreateAsync(Subject subject)
        {
            subject.SubjectName = Clean(subject.SubjectName);
            subject.SubjectCode = Clean(subject.SubjectCode);
            subject.SubjectType = Clean(subject.SubjectType);
            subject.CreatedAt = DateTime.UtcNow;

            await _context.Subjects.AddAsync(subject);
            await _context.SaveChangesAsync();

            return await GetByIdAsync(subject.SubjectId) ?? subject;
        }

        public async Task<Subject?> UpdateAsync(int subjectId, Subject subject)
        {
            var existing = await _context.Subjects.FirstOrDefaultAsync(s => s.SubjectId == subjectId);
            if (existing == null) return null;

            existing.BoardId = subject.BoardId;
            existing.GroupId = subject.GroupId;
            existing.AcademicLevelId = subject.AcademicLevelId;
            existing.SubjectName = Clean(subject.SubjectName);
            existing.SubjectCode = Clean(subject.SubjectCode);
            existing.SubjectType = Clean(subject.SubjectType);
            existing.Theory = subject.Theory;
            existing.Practical = subject.Practical;
            existing.Language = subject.Language;
            existing.Elective = subject.Elective;
            existing.InternalMarks = subject.InternalMarks;
            existing.PracticalMarks = subject.PracticalMarks;
            existing.ExternalMarks = subject.ExternalMarks;
            existing.TotalMarks = subject.TotalMarks;
            existing.PassingMarks = subject.PassingMarks;
            existing.IsActive = subject.IsActive;
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetByIdAsync(subjectId);
        }

        public async Task<bool> DeleteAsync(int subjectId)
        {
            var existing = await _context.Subjects.FirstOrDefaultAsync(s => s.SubjectId == subjectId);
            if (existing == null) return false;

            _context.Subjects.Remove(existing);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<Subject>> GetByGroupIdAsync(int groupId)
        {
            var subjects = await _context.Subjects
                .AsNoTracking()
                .Where(s => s.GroupId == groupId)
                .OrderBy(s => s.SubjectId)
                .ToListAsync();

            await PopulateNavigationsAsync(subjects);
            return subjects;
        }

        public async Task<IEnumerable<Subject>> GetByContextAsync(int boardId, int groupId, int academicLevelId)
        {
            var subjects = await _context.Subjects
                .AsNoTracking()
                .Where(s => (boardId == 0 || s.BoardId == boardId) && (groupId == 0 || s.GroupId == groupId) && (academicLevelId == 0 || s.AcademicLevelId == academicLevelId))
                .OrderBy(s => s.SubjectId)
                .ToListAsync();

            await PopulateNavigationsAsync(subjects);
            return subjects;
        }

        public async Task<IEnumerable<Subject>> SearchAsync(string? search, int? boardId, int? groupId, int? academicLevelId, bool? isActive)
        {
            var query = _context.Subjects
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var cleanSearch = search.Trim().ToLower();
                query = query.Where(s => s.SubjectName.ToLower().Contains(cleanSearch) || s.SubjectCode.ToLower().Contains(cleanSearch));
            }

            if (boardId.HasValue && boardId.Value > 0)
                query = query.Where(s => s.BoardId == boardId.Value);

            if (groupId.HasValue && groupId.Value > 0)
                query = query.Where(s => s.GroupId == groupId.Value);

            if (academicLevelId.HasValue && academicLevelId.Value > 0)
                query = query.Where(s => s.AcademicLevelId == academicLevelId.Value);

            if (isActive.HasValue)
                query = query.Where(s => s.IsActive == isActive.Value);

            var subjects = await query.OrderBy(s => s.SubjectId).ToListAsync();
            await PopulateNavigationsAsync(subjects);
            return subjects;
        }

        public async Task<IEnumerable<Subject>> GetActiveAsync()
        {
            var subjects = await _context.Subjects
                .AsNoTracking()
                .Where(s => s.IsActive)
                .OrderBy(s => s.SubjectId)
                .ToListAsync();

            await PopulateNavigationsAsync(subjects);
            return subjects;
        }

        public async Task<IEnumerable<Subject>> GetByBoardIdAsync(int boardId)
        {
            var subjects = await _context.Subjects
                .AsNoTracking()
                .Where(s => s.BoardId == boardId)
                .OrderBy(s => s.SubjectId)
                .ToListAsync();

            await PopulateNavigationsAsync(subjects);
            return subjects;
        }

        public async Task<bool> SubjectCodeExistsAsync(string subjectCode, int boardId, int groupId, int academicLevelId, int? excludeSubjectId = null)
        {
            var cleanCode = subjectCode.Trim().ToLower();
            return await _context.Subjects.AnyAsync(s =>
                s.SubjectCode.ToLower() == cleanCode &&
                s.BoardId == boardId &&
                s.GroupId == groupId &&
                s.AcademicLevelId == academicLevelId &&
                (!excludeSubjectId.HasValue || s.SubjectId != excludeSubjectId.Value));
        }
    }
}