using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Settings;
using CollegeManagement.API.Models.Settings;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Services.Implementations
{
    public class TemplateService : ITemplateService
    {
        private readonly ITemplateRepository _repository;
        private readonly AppDbContext _context;

        public TemplateService(ITemplateRepository repository, AppDbContext context)
        {
            _repository = repository;
            _context = context;
        }

        private static List<string> ExtractPlaceholders(string contentBody, List<string>? providedList)
        {
            var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            if (providedList != null && providedList.Any())
            {
                foreach (var p in providedList)
                {
                    if (!string.IsNullOrWhiteSpace(p))
                    {
                        var clean = p.Trim();
                        if (!clean.StartsWith("{{")) clean = "{{" + clean;
                        if (!clean.EndsWith("}}")) clean = clean + "}}";
                        set.Add(clean);
                    }
                }
            }

            if (!string.IsNullOrWhiteSpace(contentBody))
            {
                var matches = Regex.Matches(contentBody, @"\{\{([a-zA-Z0-9_\-]+)\}\}");
                foreach (Match m in matches)
                {
                    if (m.Success)
                    {
                        set.Add(m.Value.ToLowerInvariant());
                    }
                }
            }

            return set.ToList();
        }

        private static TemplateResponseDto MapToDto(Template t)
        {
            List<string> placeholders;
            try
            {
                placeholders = JsonSerializer.Deserialize<List<string>>(t.PlaceholdersJson) ?? new List<string>();
            }
            catch
            {
                placeholders = new List<string>();
            }

            return new TemplateResponseDto
            {
                Id = t.Id,
                TemplateCode = t.TemplateCode,
                Title = t.Title,
                Category = t.Category,
                ContentBody = t.ContentBody,
                Placeholders = placeholders,
                IsActive = t.IsActive,
                Version = t.Version,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt
            };
        }

        public async Task<TemplatePagedResponseDto> GetAllTemplatesAsync(
            int pageNumber,
            int pageSize,
            string? search,
            string? category,
            bool? isActive,
            CancellationToken ct = default)
        {
            return await _repository.GetAllAsync(pageNumber, pageSize, search, category, isActive, ct);
        }

        public async Task<IReadOnlyList<TemplateResponseDto>> GetActiveTemplatesByCategoryAsync(
            string? category,
            CancellationToken ct = default)
        {
            var templates = await _repository.GetActiveByCategoryAsync(category, ct);
            return templates.Select(MapToDto).ToList();
        }

        public async Task<TemplateResponseDto?> GetTemplateByIdAsync(int id, CancellationToken ct = default)
        {
            var template = await _repository.GetByIdAsync(id, ct);
            return template != null ? MapToDto(template) : null;
        }

        public async Task<TemplateResponseDto?> GetTemplateByCodeAsync(string templateCode, CancellationToken ct = default)
        {
            var template = await _repository.GetByCodeAsync(templateCode, ct);
            return template != null ? MapToDto(template) : null;
        }

        public async Task<TemplateResponseDto> CreateTemplateAsync(CreateTemplateDto dto, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dto.TemplateCode))
                throw new ValidationException("Template code is required.");

            if (string.IsNullOrWhiteSpace(dto.Title))
                throw new ValidationException("Template title is required.");

            if (string.IsNullOrWhiteSpace(dto.ContentBody))
                throw new ValidationException("Template content body is required.");

            var cleanCode = dto.TemplateCode.Trim().ToUpperInvariant().Replace(" ", "_");

            var exists = await _repository.ExistsByCodeAsync(cleanCode, null, ct);
            if (exists)
                throw new ValidationException($"Template with code '{cleanCode}' already exists.");

            var placeholders = ExtractPlaceholders(dto.ContentBody, dto.Placeholders);

            var template = new Template
            {
                TemplateCode = cleanCode,
                Title = dto.Title.Trim(),
                Category = string.IsNullOrWhiteSpace(dto.Category) ? "Certificate" : dto.Category.Trim(),
                ContentBody = dto.ContentBody,
                PlaceholdersJson = JsonSerializer.Serialize(placeholders),
                IsActive = dto.IsActive,
                Version = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var created = await _repository.CreateAsync(template, ct);
            return MapToDto(created);
        }

        public async Task<TemplateResponseDto?> UpdateTemplateAsync(int id, UpdateTemplateDto dto, CancellationToken ct = default)
        {
            if (id <= 0)
                throw new ValidationException("Invalid template ID.");

            if (string.IsNullOrWhiteSpace(dto.Title))
                throw new ValidationException("Template title is required.");

            if (string.IsNullOrWhiteSpace(dto.ContentBody))
                throw new ValidationException("Template content body is required.");

            var existing = await _repository.GetByIdAsync(id, ct);
            if (existing == null) return null;

            var placeholders = ExtractPlaceholders(dto.ContentBody, dto.Placeholders);

            var toUpdate = new Template
            {
                Id = id,
                Title = dto.Title.Trim(),
                Category = string.IsNullOrWhiteSpace(dto.Category) ? existing.Category : dto.Category.Trim(),
                ContentBody = dto.ContentBody,
                PlaceholdersJson = JsonSerializer.Serialize(placeholders),
                IsActive = dto.IsActive
            };

            var updated = await _repository.UpdateAsync(id, toUpdate, ct);
            return updated != null ? MapToDto(updated) : null;
        }

        public async Task<bool> DeleteTemplateAsync(int id, CancellationToken ct = default)
        {
            if (id <= 0) return false;
            return await _repository.DeleteAsync(id, ct);
        }

        public async Task<bool> ToggleTemplateActiveAsync(int id, CancellationToken ct = default)
        {
            if (id <= 0) return false;
            return await _repository.ToggleActiveAsync(id, ct);
        }

        public async Task<RenderedTemplateResponseDto> RenderTemplateAsync(
            RenderCertificateTemplateRequestDto request,
            CancellationToken ct = default)
        {
            if (request == null)
                throw new ValidationException("Render request cannot be null.");

            Template? template = null;

            if (!string.IsNullOrWhiteSpace(request.TemplateCode))
            {
                template = await _repository.GetByCodeAsync(request.TemplateCode, ct);
            }

            if (template == null && request.TemplateId.HasValue && request.TemplateId.Value > 0)
            {
                template = await _repository.GetByIdAsync(request.TemplateId.Value, ct);
            }

            // Fallback default
            if (template == null)
            {
                template = await _repository.GetByCodeAsync("BONAFIDE_CERT", ct);
            }

            if (template == null)
            {
                throw new ValidationException("No valid template found to render.");
            }

            // 1. Resolve Student Data if studentId or admissionNo provided
            string studentName = "Sample Student";
            string fatherName = "Sample Father";
            string motherName = "Sample Mother";
            string admissionNo = request.AdmissionNo ?? "ADM2026001";
            string rollNo = "001";
            string academicLevel = "Intermediate 1st Year";
            string groupName = "MPC";
            string sectionName = "A";
            string academicYear = $"{DateTime.UtcNow.Year}-{DateTime.UtcNow.Year + 1}";
            string boardName = "State Board of Intermediate Education";
            string dob = "14/05/2009";
            string bloodGroup = "O+";
            string mobile = "9876543210";

            if (request.StudentId.HasValue && request.StudentId.Value > 0)
            {
                var s = await _context.Students
                    .AsNoTracking()
                    .Include(st => st.GroupNavigation)
                    .Include(st => st.AcademicLevelNavigation)
                    .Include(st => st.AcademicYear)
                    .Include(st => st.BoardNavigation)
                    .Include(st => st.SectionNavigation)
                    .FirstOrDefaultAsync(st => st.StudentId == request.StudentId.Value, ct);

                if (s != null)
                {
                    studentName = s.StudentName;
                    fatherName = s.FatherName ?? "—";
                    motherName = s.MotherName ?? "—";
                    admissionNo = s.AdmissionNo ?? admissionNo;
                    rollNo = s.RollNo ?? s.AdmissionNo ?? rollNo;
                    academicLevel = s.AcademicLevelNavigation?.LevelName ?? academicLevel;
                    groupName = s.GroupNavigation?.GroupName ?? groupName;
                    sectionName = s.SectionNavigation?.SectionName ?? sectionName;
                    academicYear = s.AcademicYear?.AcademicYearName ?? academicYear;
                    boardName = s.BoardNavigation?.BoardName ?? boardName;
                    dob = s.DateOfBirth != default ? s.DateOfBirth.ToString("dd/MM/yyyy") : dob;
                    bloodGroup = s.BloodGroup ?? bloodGroup;
                    mobile = s.MobileNumber ?? mobile;
                }
            }
            else if (!string.IsNullOrWhiteSpace(request.AdmissionNo))
            {
                var s = await _context.Students
                    .AsNoTracking()
                    .Include(st => st.GroupNavigation)
                    .Include(st => st.AcademicLevelNavigation)
                    .Include(st => st.AcademicYear)
                    .Include(st => st.BoardNavigation)
                    .Include(st => st.SectionNavigation)
                    .FirstOrDefaultAsync(st => st.AdmissionNo == request.AdmissionNo.Trim(), ct);

                if (s != null)
                {
                    studentName = s.StudentName;
                    fatherName = s.FatherName ?? "—";
                    motherName = s.MotherName ?? "—";
                    admissionNo = s.AdmissionNo ?? admissionNo;
                    rollNo = s.RollNo ?? s.AdmissionNo ?? rollNo;
                    academicLevel = s.AcademicLevelNavigation?.LevelName ?? academicLevel;
                    groupName = s.GroupNavigation?.GroupName ?? groupName;
                    sectionName = s.SectionNavigation?.SectionName ?? sectionName;
                    academicYear = s.AcademicYear?.AcademicYearName ?? academicYear;
                    boardName = s.BoardNavigation?.BoardName ?? boardName;
                    dob = s.DateOfBirth != default ? s.DateOfBirth.ToString("dd/MM/yyyy") : dob;
                    bloodGroup = s.BloodGroup ?? bloodGroup;
                    mobile = s.MobileNumber ?? mobile;
                }
            }

            var issueDateStr = (request.IssueDate ?? DateTime.UtcNow).ToString("dd/MM/yyyy");
            var certNo = !string.IsNullOrWhiteSpace(request.CertificateNo)
                ? request.CertificateNo
                : $"CERT-{DateTime.UtcNow.Year}-" + new Random().Next(1000, 9999);

            var placeholderValues = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["{{college_name}}"] = "Pirnav Junior College",
                ["{{college_address}}"] = "Madhapur, Hyderabad, Telangana - 500081",
                ["{{board_name}}"] = boardName,
                ["{{certificate_no}}"] = certNo,
                ["{{issue_date}}"] = issueDateStr,
                ["{{student_name}}"] = studentName,
                ["{{father_name}}"] = fatherName,
                ["{{mother_name}}"] = motherName,
                ["{{admission_no}}"] = admissionNo,
                ["{{roll_no}}"] = rollNo,
                ["{{academic_level}}"] = academicLevel,
                ["{{group_name}}"] = groupName,
                ["{{section_name}}"] = sectionName,
                ["{{academic_year}}"] = academicYear,
                ["{{dob}}"] = dob,
                ["{{blood_group}}"] = bloodGroup,
                ["{{mobile}}"] = mobile,
                ["{{valid_upto}}"] = $"31/05/{DateTime.UtcNow.Year + 1}",
                ["{{conduct}}"] = !string.IsNullOrWhiteSpace(request.Conduct) ? request.Conduct : "Exemplary",
                ["{{purpose}}"] = !string.IsNullOrWhiteSpace(request.Purpose) ? request.Purpose : "Higher Education / Verification",
                ["{{remarks}}"] = request.Remarks ?? string.Empty,
                ["{{issued_by}}"] = !string.IsNullOrWhiteSpace(request.IssuedBy) ? request.IssuedBy : "Principal"
            };

            // Apply custom overrides if any
            if (request.CustomPlaceholders != null)
            {
                foreach (var kvp in request.CustomPlaceholders)
                {
                    var key = kvp.Key.Trim();
                    if (!key.StartsWith("{{")) key = "{{" + key;
                    if (!key.EndsWith("}}")) key = key + "}}";
                    placeholderValues[key] = kvp.Value;
                }
            }

            // Replace in content body
            var renderedHtml = template.ContentBody;
            foreach (var kvp in placeholderValues)
            {
                renderedHtml = Regex.Replace(
                    renderedHtml,
                    Regex.Escape(kvp.Key),
                    kvp.Value ?? string.Empty,
                    RegexOptions.IgnoreCase);
            }

            return new RenderedTemplateResponseDto
            {
                TemplateCode = template.TemplateCode,
                Title = template.Title,
                Category = template.Category,
                RenderedHtml = renderedHtml,
                AppliedPlaceholders = placeholderValues,
                Version = template.Version
            };
        }
    }
}
