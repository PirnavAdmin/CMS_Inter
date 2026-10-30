using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Settings;
using CollegeManagement.API.Models.Settings;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class TemplateRepository : ITemplateRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<TemplateRepository>? _logger;

        public TemplateRepository(AppDbContext context, ILogger<TemplateRepository>? logger = null)
        {
            _context = context;
            _logger = logger;
        }

        private async Task<DbConnection> GetOpenConnectionAsync(CancellationToken ct = default)
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync(ct);
            }
            return conn;
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

        private static TemplateResponseDto MapRowToDto(dynamic row)
        {
            var dict = (IDictionary<string, object>)row;
            int ver = 1;
            if (dict.ContainsKey("Version") && dict["Version"] != null)
            {
                var cleaned = dict["Version"].ToString()?.Trim().TrimStart('v', 'V');
                int.TryParse(cleaned, out ver);
                if (ver < 1) ver = 1;
            }

            string placeholdersJson = dict.ContainsKey("PlaceholdersJson") && dict["PlaceholdersJson"] != null
                ? dict["PlaceholdersJson"].ToString() ?? "[]"
                : "[]";

            return new TemplateResponseDto
            {
                Id = Convert.ToInt32(dict["Id"]),
                TemplateCode = dict["TemplateCode"]?.ToString() ?? string.Empty,
                Title = dict["Title"]?.ToString() ?? string.Empty,
                Category = dict["Category"]?.ToString() ?? string.Empty,
                ContentBody = dict["ContentBody"]?.ToString() ?? string.Empty,
                Placeholders = ParsePlaceholders(placeholdersJson),
                IsActive = Convert.ToBoolean(dict["IsActive"]),
                Version = ver,
                CreatedAt = Convert.ToDateTime(dict["CreatedAt"]),
                UpdatedAt = Convert.ToDateTime(dict["UpdatedAt"])
            };
        }

        private static Template MapRowToEntity(dynamic row)
        {
            var dict = (IDictionary<string, object>)row;
            return new Template
            {
                Id = Convert.ToInt32(dict["Id"]),
                TemplateCode = dict["TemplateCode"]?.ToString() ?? string.Empty,
                Title = dict["Title"]?.ToString() ?? string.Empty,
                Category = dict["Category"]?.ToString() ?? string.Empty,
                ContentBody = dict["ContentBody"]?.ToString() ?? string.Empty,
                PlaceholdersJson = dict.ContainsKey("PlaceholdersJson") && dict["PlaceholdersJson"] != null ? dict["PlaceholdersJson"].ToString() ?? "[]" : "[]",
                IsActive = Convert.ToBoolean(dict["IsActive"]),
                Version = dict.ContainsKey("Version") && dict["Version"] != null ? dict["Version"].ToString() ?? "1" : "1",
                CampusId = dict.ContainsKey("CampusId") && dict["CampusId"] != null && dict["CampusId"] != DBNull.Value ? Convert.ToInt32(dict["CampusId"]) : null,
                CreatedAt = Convert.ToDateTime(dict["CreatedAt"]),
                UpdatedAt = Convert.ToDateTime(dict["UpdatedAt"])
            };
        }

        public async Task EnsureSeedsAsync(CancellationToken ct = default)
        {
            await Task.CompletedTask;
        }

        public async Task<TemplatePagedResponseDto> GetAllAsync(
            int pageNumber,
            int pageSize,
            string? search,
            string? category,
            bool? isActive,
            int? campusId = null,
            CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_PageNumber", pageNumber);
            parameters.Add("p_PageSize", pageSize);
            parameters.Add("p_Search", string.IsNullOrWhiteSpace(search) ? null : search.Trim());
            parameters.Add("p_Category", string.IsNullOrWhiteSpace(category) ? null : category.Trim());
            parameters.Add("p_IsActive", isActive.HasValue ? (isActive.Value ? 1 : 0) : null);
            parameters.Add("p_CampusId", campusId);

            using var multi = await conn.QueryMultipleAsync(
                new CommandDefinition(
                    "sp_GetTemplates",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            int totalCount = await multi.ReadFirstOrDefaultAsync<int>();
            var rows = (await multi.ReadAsync()).ToList();

            var items = rows.Select(MapRowToDto).ToList();

            return new TemplatePagedResponseDto
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pageNumber < 1 ? 1 : pageNumber,
                PageSize = pageSize < 1 ? 10 : pageSize
            };
        }

        public async Task<IReadOnlyList<Template>> GetActiveByCategoryAsync(string? category, int? campusId = null, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_Category", string.IsNullOrWhiteSpace(category) ? null : category.Trim());
            parameters.Add("p_CampusId", campusId);

            var rows = await conn.QueryAsync(
                new CommandDefinition(
                    "sp_GetActiveTemplatesByCategory",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            return rows.Select(MapRowToEntity).ToList();
        }

        public async Task<Template?> GetByIdAsync(int id, int? campusId = null, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_CampusId", campusId);

            var row = await conn.QueryFirstOrDefaultAsync(
                new CommandDefinition(
                    "sp_GetTemplateById",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            return row == null ? null : MapRowToEntity(row);
        }

        public async Task<Template?> GetByCodeAsync(string templateCode, int? campusId = null, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(templateCode)) return null;

            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_TemplateCode", templateCode.Trim());
            parameters.Add("p_CampusId", campusId);

            var row = await conn.QueryFirstOrDefaultAsync(
                new CommandDefinition(
                    "sp_GetTemplateByCode",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            return row == null ? null : MapRowToEntity(row);
        }

        public async Task<bool> ExistsByCodeAsync(string templateCode, int? excludeId = null, int? campusId = null, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(templateCode)) return false;

            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_TemplateCode", templateCode.Trim());
            parameters.Add("p_ExcludeId", excludeId);
            parameters.Add("p_CampusId", campusId);

            var count = await conn.ExecuteScalarAsync<int>(
                new CommandDefinition(
                    "sp_CheckTemplateExistsByCode",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            return count > 0;
        }

        public async Task<Template> CreateAsync(Template template, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_TemplateCode", template.TemplateCode.Trim());
            parameters.Add("p_Title", template.Title.Trim());
            parameters.Add("p_Category", template.Category.Trim());
            parameters.Add("p_ContentBody", template.ContentBody);
            parameters.Add("p_PlaceholdersJson", template.PlaceholdersJson);
            parameters.Add("p_IsActive", template.IsActive ? 1 : 0);
            parameters.Add("p_CampusId", template.CampusId);

            var row = await conn.QueryFirstOrDefaultAsync(
                new CommandDefinition(
                    "sp_CreateTemplate",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            return row == null ? template : MapRowToEntity(row);
        }

        public async Task<Template?> UpdateAsync(int id, Template template, int? campusId = null, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_Title", template.Title.Trim());
            parameters.Add("p_Category", template.Category.Trim());
            parameters.Add("p_ContentBody", template.ContentBody);
            parameters.Add("p_PlaceholdersJson", template.PlaceholdersJson);
            parameters.Add("p_IsActive", template.IsActive ? 1 : 0);
            parameters.Add("p_CampusId", campusId);

            var row = await conn.QueryFirstOrDefaultAsync(
                new CommandDefinition(
                    "sp_UpdateTemplate",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            return row == null ? null : MapRowToEntity(row);
        }

        public async Task<bool> DeleteAsync(int id, int? campusId = null, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_CampusId", campusId);

            var rows = await conn.ExecuteAsync(
                new CommandDefinition(
                    "sp_DeleteTemplate",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            return rows > 0;
        }

        public async Task<bool> ToggleActiveAsync(int id, int? campusId = null, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_CampusId", campusId);

            var rows = await conn.ExecuteAsync(
                new CommandDefinition(
                    "sp_ToggleTemplateActive",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            return rows > 0;
        }

        public async Task<StudentTemplateLookupDto?> GetStudentPreviewDetailsAsync(int? studentId, string? admissionNo, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_StudentId", studentId);
            parameters.Add("p_AdmissionNo", admissionNo);

            return await conn.QueryFirstOrDefaultAsync<StudentTemplateLookupDto>(
                new CommandDefinition(
                    "sp_GetStudentDetailsForTemplatePreview",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));
        }
    }
}
