using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class TimetableBackupRepository : ITimetableBackupRepository
    {
        private readonly AppDbContext _context;

        public TimetableBackupRepository(AppDbContext context)
        {
            _context = context;
        }

        private async Task<IDbConnection> GetOpenConnectionAsync()
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await conn.OpenAsync();
            }
            return conn;
        }

        public async Task<TimetableBackupResponseDto?> GetPreviousBySectionAsync(int sectionId, int? academicYearId = null)
        {
            var conn = await GetOpenConnectionAsync();

            var header = await conn.QueryFirstOrDefaultAsync<TimetableBackupResponseDto>(
                "sp_GetPreviousTimetable",
                new { p_SectionId = sectionId, p_AcademicYearId = academicYearId ?? 0 },
                commandType: CommandType.StoredProcedure);

            if (header == null) return null;

            var slots = (await conn.QueryAsync<TimetableResponseDto>(
                "sp_GetPreviousTimetableSlots",
                new { p_TimetableBackupId = header.Id },
                commandType: CommandType.StoredProcedure)).ToList();

            header.Slots = slots;
            header.TotalSlots = slots.Count;
            return header;
        }

        public async Task<int> ArchiveSectionTimetableAsync(int sectionId, int academicYearId, string? reason = null, string? user = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_SectionId", sectionId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_ArchiveReason", reason ?? "Archived by user", DbType.String);
            parameters.Add("p_ArchivedBy", user ?? "System", DbType.String);
            parameters.Add("p_NewBackupId", dbType: DbType.Int32, direction: ParameterDirection.Output);

            var backupId = await conn.ExecuteScalarAsync<int>(
                "sp_ArchiveSectionTimetable",
                parameters,
                commandType: CommandType.StoredProcedure);

            if (backupId <= 0)
            {
                backupId = parameters.Get<int>("p_NewBackupId");
            }

            return backupId;
        }

        public async Task<int> SwapRestoreSectionTimetableAsync(int sectionId, int academicYearId, string? user = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_SectionId", sectionId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_RestoredBy", user ?? "System", DbType.String);
            parameters.Add("p_RestoredSlotsCount", dbType: DbType.Int32, direction: ParameterDirection.Output);

            var restoredCount = await conn.ExecuteScalarAsync<int>(
                "sp_SwapSectionTimetableBackup",
                parameters,
                commandType: CommandType.StoredProcedure);

            if (restoredCount <= 0)
            {
                restoredCount = parameters.Get<int>("p_RestoredSlotsCount");
            }

            return restoredCount;
        }

        public async Task DeleteBackupAsync(int sectionId, int academicYearId)
        {
            var conn = await GetOpenConnectionAsync();
            await conn.ExecuteAsync(
                "sp_DeleteTimetableBackup",
                new { p_SectionId = sectionId, p_AcademicYearId = academicYearId },
                commandType: CommandType.StoredProcedure);
        }
    }
}
