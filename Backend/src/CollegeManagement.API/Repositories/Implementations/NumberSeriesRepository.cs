using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models.Settings;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class NumberSeriesRepository : INumberSeriesRepository
    {
        private readonly AppDbContext _context;

        public NumberSeriesRepository(AppDbContext context)
        {
            _context = context;
        }

        private async Task<DbConnection> GetOpenConnectionAsync()
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync();
            }
            return conn;
        }

        public async Task EnsureTableAndSeedsAsync()
        {
            // Table structure and initial seeds are fully managed via SQL migrations & stored procedures.
            await Task.CompletedTask;
        }

        public async Task<IEnumerable<NumberSeriesConfiguration>> GetAllAsync(int? campusId = null, bool includeSubCounters = false)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", campusId);
            parameters.Add("p_IncludeSubCounters", includeSubCounters ? (byte)1 : (byte)0);

            var result = await conn.QueryAsync<NumberSeriesConfiguration>(
                "sp_GetNumberSeriesConfigurations",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        public async Task<NumberSeriesConfiguration?> GetByCodeAsync(string seriesCode, int? campusId = null)
        {
            if (string.IsNullOrWhiteSpace(seriesCode)) return null;

            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_SeriesCode", seriesCode.Trim());
            parameters.Add("p_CampusId", campusId);

            return await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(
                "sp_GetNumberSeriesByCode",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<NumberSeriesConfiguration?> UpdateByCodeAsync(
            string seriesCode,
            string prefix,
            string formatPattern,
            int numberLength,
            int startNumber,
            string? description,
            int? campusId = null,
            bool? isActive = null,
            string? seriesName = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_SeriesCode", seriesCode.Trim());
            parameters.Add("p_Prefix", prefix?.Trim() ?? string.Empty);
            parameters.Add("p_FormatPattern", formatPattern?.Trim() ?? string.Empty);
            parameters.Add("p_NumberLength", numberLength);
            parameters.Add("p_StartNumber", startNumber);
            parameters.Add("p_Description", description?.Trim());
            parameters.Add("p_CampusId", campusId);
            parameters.Add("p_IsActive", isActive.HasValue ? (isActive.Value ? (byte)1 : (byte)0) : (byte?)null);
            parameters.Add("p_SeriesName", string.IsNullOrWhiteSpace(seriesName) ? null : seriesName.Trim());

            return await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(
                "sp_UpdateNumberSeriesByCode",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<NumberSeriesConfiguration?> GenerateNextSequenceAsync(string seriesCode, int? campusId = null, string? baseSeriesCode = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_SeriesCode", seriesCode.Trim());
            parameters.Add("p_CampusId", campusId);
            parameters.Add("p_BaseSeriesCode", string.IsNullOrWhiteSpace(baseSeriesCode) ? null : baseSeriesCode.Trim());
            parameters.Add("p_BaseCode", string.IsNullOrWhiteSpace(baseSeriesCode) ? null : baseSeriesCode.Trim());

            return await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(
                "sp_GenerateNextNumberSeries",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        private static (string Name, string Prefix, string Pattern, int Length, int Start) GetDefaultSeriesDefinition(string code)
        {
            var normalized = code.ToUpperInvariant().Trim();
            return normalized switch
            {
                "CERTIFICATE_NO" or "CERTIFICATE_NUMBER" => ("Certificate Number", "CERT-", "{PREFIX}{YYYY}{SEQ}", 5, 1),
                "ADMISSION_NO" => ("Admission Number", "ADM", "{PREFIX}{YY}{SEQ}", 5, 1),
                "TEACHING_STAFF_ID" => ("Teaching Staff ID", "PCTCH", "{PREFIX}{SEQ}", 4, 1),
                "NON_TEACHING_STAFF_ID" => ("Non-Teaching Staff ID", "PCNT", "{PREFIX}{SEQ}", 4, 1),
                "EMPLOYEE_ID" => ("Employee ID", "EMP", "{PREFIX}{SEQ}", 4, 1),
                "ROLL_NO" => ("Student Roll Number", "R", "{PREFIX}{SEQ}", 3, 1),
                "RECEIPT_NO" => ("Fee Receipt Number", "RCP-", "{PREFIX}{YYYY}{SEQ}", 5, 1),
                "STUDENT_ID" => ("Student ID", "STU", "{PREFIX}{SEQ}", 5, 1),
                "EXAM_CODE" => ("Exam Code", "EXM", "{PREFIX}{YY}{SEQ}", 3, 1),
                _ => (code, code.Substring(0, Math.Min(4, code.Length)).ToUpperInvariant(), "{PREFIX}{SEQ}", 4, 1)
            };
        }

        public async Task<int> GetMaxSequenceForBaseSeriesAsync(string baseSeriesCode, int? campusId = null, string? board = null, string? academicYear = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BaseSeriesCode", baseSeriesCode.Trim());
            parameters.Add("p_BaseCode", baseSeriesCode.Trim());
            parameters.Add("p_CampusId", campusId);
            parameters.Add("p_Board", board);
            parameters.Add("p_AcademicYear", academicYear);

            var maxSeq = await conn.ExecuteScalarAsync<int?>(
                "sp_GetMaxSequenceForBaseSeries",
                parameters,
                commandType: CommandType.StoredProcedure);

            return maxSeq ?? 0;
        }

        public async Task<bool> DeleteByCodeAsync(string seriesCode, int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_SeriesCode", seriesCode.Trim());
            parameters.Add("p_CampusId", campusId);

            var deletedId = await conn.ExecuteScalarAsync<int?>(
                "sp_DeleteNumberSeriesByCode",
                parameters,
                commandType: CommandType.StoredProcedure);

            return deletedId.HasValue && deletedId.Value > 0;
        }
    }
}
