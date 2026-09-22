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
            int ver = 1;
            if (!string.IsNullOrWhiteSpace(t.Version))
            {
                var cleaned = t.Version.Trim().TrimStart('v', 'V');
                int.TryParse(cleaned, out ver);
                if (ver < 1) ver = 1;
            }

            return new TemplateResponseDto
            {
                Id = t.Id,
                TemplateCode = t.TemplateCode,
                Title = t.Title,
                Category = t.Category,
                ContentBody = t.ContentBody,
                Placeholders = ParsePlaceholders(t.PlaceholdersJson),
                IsActive = t.IsActive,
                Version = ver,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt
            };
        }

        private static bool _seedsInitialized = false;

        public async Task EnsureSeedsAsync(CancellationToken ct = default)
        {
            if (_seedsInitialized) return;

            var anyExist = await _context.Templates.AnyAsync(ct);
            if (!anyExist)
            {
                var defaultTemplates = new List<Template>
                {
                    new()
                    {
                        TemplateCode = "BONAFIDE_CERT",
                        Title = "Bonafide Certificate",
                        Category = "Certificate",
                        ContentBody = "This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Student ID {{student_id}} is a bonafide student of Pirnav College (Intermediate / Junior College), Vijayawada. He/She is studying in {{group_name}} Group, {{academic_level}} during the academic year {{academic_year}}.",
                        PlaceholdersJson = JsonSerializer.Serialize(new List<string>
                        {
                            "{{student_name}}", "{{student_id}}", "{{admission_no}}", "{{father_name}}",
                            "{{group_name}}", "{{academic_level}}", "{{academic_year}}", "{{purpose}}",
                            "{{certificate_number}}", "{{issue_date}}", "{{place}}"
                        }),
                        IsActive = true,
                        Version = "1",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        TemplateCode = "STUDY_CERT",
                        Title = "Study Certificate",
                        Category = "Certificate",
                        ContentBody = "This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Student ID {{student_id}} has studied in this college during the period from {{study_from}} to {{study_to}} in {{group_name}} Group and appeared for the Intermediate Public Examination conducted by the {{board_name}}.",
                        PlaceholdersJson = JsonSerializer.Serialize(new List<string>
                        {
                            "{{student_name}}", "{{student_id}}", "{{admission_no}}", "{{father_name}}",
                            "{{study_from}}", "{{study_to}}", "{{group_name}}", "{{board_name}}",
                            "{{certificate_number}}", "{{issue_date}}", "{{place}}"
                        }),
                        IsActive = true,
                        Version = "1",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        TemplateCode = "CONDUCT_CERT",
                        Title = "Conduct Certificate",
                        Category = "Certificate",
                        ContentBody = "This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Student ID {{student_id}} has studied in this institution from {{study_from}} to {{study_to}}.\nDuring his/her tenure in this college, his/her character and conduct have been {{conduct_rating}}.",
                        PlaceholdersJson = JsonSerializer.Serialize(new List<string>
                        {
                            "{{student_name}}", "{{student_id}}", "{{admission_no}}", "{{father_name}}",
                            "{{conduct_rating}}", "{{study_from}}", "{{study_to}}",
                            "{{certificate_number}}", "{{issue_date}}", "{{place}}"
                        }),
                        IsActive = true,
                        Version = "1",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        TemplateCode = "TRANSFER_CERT",
                        Title = "Transfer Certificate",
                        Category = "Certificate",
                        ContentBody = "This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Student ID {{student_id}} has studied in this college from {{study_from}} to {{study_to}}.\nHe/She is hereby relieved from this institution as he/she is seeking admission elsewhere. There are no dues towards the college.\nWe wish him/her all the best for his/her future endeavours.",
                        PlaceholdersJson = JsonSerializer.Serialize(new List<string>
                        {
                            "{{student_name}}", "{{student_id}}", "{{admission_no}}", "{{father_name}}",
                            "{{mother_name}}", "{{dob}}", "{{date_of_admission}}", "{{study_from}}",
                            "{{study_to}}", "{{reason_for_leaving}}", "{{dues_cleared}}",
                            "{{certificate_number}}", "{{issue_date}}", "{{place}}"
                        }),
                        IsActive = true,
                        Version = "1",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        TemplateCode = "CUSTOM_CERT",
                        Title = "Others",
                        Category = "Certificate",
                        ContentBody = "This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Student ID {{student_id}}.\nThis is to certify that {{custom_body}}.",
                        PlaceholdersJson = JsonSerializer.Serialize(new List<string>
                        {
                            "{{student_name}}", "{{student_id}}", "{{admission_no}}", "{{father_name}}",
                            "{{custom_body}}", "{{purpose}}", "{{certificate_number}}",
                            "{{issue_date}}", "{{place}}"
                        }),
                        IsActive = true,
                        Version = "1",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        TemplateCode = "STAFF_IMPORT_TEMPLATE",
                        Title = "Staff Excel Import Template",
                        Category = "BulkUpload",
                        ContentBody = "Downloadable 3-column format for Department, Designation and Staff bulk Excel uploads.",
                        PlaceholdersJson = JsonSerializer.Serialize(new List<string> { "DepartmentName", "DepartmentCode", "StaffType" }),
                        IsActive = true,
                        Version = "1",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        TemplateCode = "STUDENT_IMPORT_TEMPLATE",
                        Title = "Student Excel Import Template",
                        Category = "BulkUpload",
                        ContentBody = "Downloadable format for Student Admissions and Enrollment bulk Excel uploads.",
                        PlaceholdersJson = JsonSerializer.Serialize(new List<string> { "StudentName", "AdmissionNo", "Group", "AcademicYear" }),
                        IsActive = true,
                        Version = "1",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    }
                };

                await _context.Templates.AddRangeAsync(defaultTemplates, ct);
                await _context.SaveChangesAsync(ct);
            }

            _seedsInitialized = true;
        }

        public async Task<TemplatePagedResponseDto> GetAllAsync(
            int pageNumber,
            int pageSize,
            string? search,
            string? category,
            bool? isActive,
            CancellationToken ct = default)
        {
            await EnsureSeedsAsync(ct);
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
            await EnsureSeedsAsync(ct);
            return await _context.Templates.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id, ct);
        }

        public async Task<Template?> GetByCodeAsync(string templateCode, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(templateCode)) return null;
            await EnsureSeedsAsync(ct);
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
            template.Version = "1";
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

            int currentVer = 1;
            if (!string.IsNullOrWhiteSpace(existing.Version))
            {
                var cleaned = existing.Version.Trim().TrimStart('v', 'V');
                int.TryParse(cleaned, out currentVer);
                if (currentVer < 1) currentVer = 1;
            }
            existing.Version = (currentVer + 1).ToString();
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
