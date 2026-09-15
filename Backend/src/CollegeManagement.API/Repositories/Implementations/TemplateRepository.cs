using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Settings;
using CollegeManagement.API.Models.Settings;
using CollegeManagement.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class TemplateRepository : ITemplateRepository
    {
        private readonly AppDbContext _context;

        public TemplateRepository(AppDbContext context)
        {
            _context = context;
        }

        private static List<string> ParsePlaceholders(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<string>();
            try
            {
                var list = JsonSerializer.Deserialize<List<string>>(json);
                return list ?? new List<string>();
            }
            catch
            {
                return new List<string>();
            }
        }

        private static TemplateResponseDto MapToDto(Template t)
        {
            return new TemplateResponseDto
            {
                Id = t.Id,
                TemplateCode = t.TemplateCode,
                Title = t.Title,
                Category = t.Category,
                ContentBody = t.ContentBody,
                Placeholders = ParsePlaceholders(t.PlaceholdersJson),
                IsActive = t.IsActive,
                Version = t.Version,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt
            };
        }

        public async Task<TemplatePagedResponseDto> GetAllAsync(
            int pageNumber,
            int pageSize,
            string? search,
            string? category,
            bool? isActive,
            CancellationToken ct = default)
        {
            var query = _context.Templates.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(t => t.Category == category.Trim());
            }

            if (isActive.HasValue)
            {
                query = query.Where(t => t.IsActive == isActive.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(t =>
                    t.Title.ToLower().Contains(s) ||
                    t.TemplateCode.ToLower().Contains(s) ||
                    t.Category.ToLower().Contains(s) ||
                    t.ContentBody.ToLower().Contains(s));
            }

            var totalCount = await query.CountAsync(ct);

            var page = pageNumber < 1 ? 1 : pageNumber;
            var size = pageSize < 1 ? 10 : pageSize;

            var items = await query
                .OrderBy(t => t.Category)
                .ThenBy(t => t.Title)
                .Skip((page - 1) * size)
                .Take(size)
                .ToListAsync(ct);

            return new TemplatePagedResponseDto
            {
                Items = items.Select(MapToDto).ToList(),
                TotalCount = totalCount,
                PageNumber = page,
                PageSize = size
            };
        }

        public async Task<IReadOnlyList<Template>> GetActiveByCategoryAsync(string? category, CancellationToken ct = default)
        {
            var query = _context.Templates.AsNoTracking().Where(t => t.IsActive);

            if (!string.IsNullOrWhiteSpace(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(t => t.Category == category.Trim());
            }

            return await query.OrderBy(t => t.Title).ToListAsync(ct);
        }

        public async Task<Template?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            return await _context.Templates.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id, ct);
        }

        public async Task<Template?> GetByCodeAsync(string templateCode, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(templateCode)) return null;
            return await _context.Templates
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TemplateCode == templateCode.Trim(), ct);
        }

        public async Task<bool> ExistsByCodeAsync(string templateCode, int? excludeId = null, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(templateCode)) return false;
            var code = templateCode.Trim();
            var query = _context.Templates.AsNoTracking().Where(t => t.TemplateCode == code);
            if (excludeId.HasValue && excludeId.Value > 0)
            {
                query = query.Where(t => t.Id != excludeId.Value);
            }
            return await query.AnyAsync(ct);
        }

        public async Task<Template> CreateAsync(Template template, CancellationToken ct = default)
        {
            template.Version = 1;
            template.CreatedAt = DateTime.UtcNow;
            template.UpdatedAt = DateTime.UtcNow;

            await _context.Templates.AddAsync(template, ct);
            await _context.SaveChangesAsync(ct);
            return template;
        }

        public async Task<Template?> UpdateAsync(int id, Template template, CancellationToken ct = default)
        {
            var existing = await _context.Templates.FirstOrDefaultAsync(t => t.Id == id, ct);
            if (existing == null) return null;

            existing.Title = template.Title.Trim();
            existing.Category = template.Category.Trim();
            existing.ContentBody = template.ContentBody;
            existing.PlaceholdersJson = template.PlaceholdersJson;
            existing.IsActive = template.IsActive;
            existing.Version += 1; // Auto-increment version on every edit
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(ct);
            return existing;
        }

        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            var existing = await _context.Templates.FirstOrDefaultAsync(t => t.Id == id, ct);
            if (existing == null) return false;

            // Soft-delete by default
            existing.IsActive = false;
            existing.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> ToggleActiveAsync(int id, CancellationToken ct = default)
        {
            var existing = await _context.Templates.FirstOrDefaultAsync(t => t.Id == id, ct);
            if (existing == null) return false;

            existing.IsActive = !existing.IsActive;
            existing.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
            return true;
        }
    }
}
