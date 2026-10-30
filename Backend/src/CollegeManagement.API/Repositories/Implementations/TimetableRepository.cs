using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Models.Timetable;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class TimetableRepository : ITimetableRepository
    {
        private readonly AppDbContext _context;

        public TimetableRepository(AppDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
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

        public async Task<TimetableResponseDto?> GetByIdAsync(int id)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id, DbType.Int32);

            return await conn.QueryFirstOrDefaultAsync<TimetableResponseDto>(
                "sp_GetTimetableById",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<(IEnumerable<TimetableResponseDto> Items, int TotalCount)> GetPagedAsync(TimetableQueryParams queryParams)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", queryParams.BoardId ?? 0, DbType.Int32);
            parameters.Add("p_AcademicLevelId", queryParams.AcademicLevelId ?? 0, DbType.Int32);
            parameters.Add("p_AcademicYearId", queryParams.AcademicYearId ?? 0, DbType.Int32);
            parameters.Add("p_GroupId", queryParams.GroupId ?? 0, DbType.Int32);
            parameters.Add("p_SectionId", queryParams.SectionId ?? 0, DbType.Int32);
            parameters.Add("p_DayOfWeek", queryParams.DayOfWeek ?? 0, DbType.Int32);
            parameters.Add("p_FacultyId", queryParams.StaffId ?? (queryParams.FacultyId ?? 0), DbType.Int32);
            parameters.Add("p_RoomId", queryParams.RoomId ?? 0, DbType.Int32);
            parameters.Add("p_IsPublished", queryParams.IsPublished.HasValue ? (queryParams.IsPublished.Value ? 1 : 0) : (int?)null, DbType.Int32);
            parameters.Add("p_CampusId", queryParams.CampusId ?? 0, DbType.Int32);

            var items = (await conn.QueryAsync<TimetableResponseDto>(
                "sp_GetTimetables",
                parameters,
                commandType: CommandType.StoredProcedure)).ToList();

            int totalCount = items.Count;
            if (queryParams.PageNumber > 0 && queryParams.PageSize > 0)
            {
                items = items.Skip((queryParams.PageNumber - 1) * queryParams.PageSize).Take(queryParams.PageSize).ToList();
            }

            return (items, totalCount);
        }

        public async Task<IEnumerable<TimetableResponseDto>> GetByFacultyIdAsync(int facultyId, int? academicYearId = null, int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", 0, DbType.Int32);
            parameters.Add("p_AcademicLevelId", 0, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId ?? 0, DbType.Int32);
            parameters.Add("p_GroupId", 0, DbType.Int32);
            parameters.Add("p_SectionId", 0, DbType.Int32);
            parameters.Add("p_DayOfWeek", 0, DbType.Int32);
            parameters.Add("p_FacultyId", facultyId, DbType.Int32);
            parameters.Add("p_RoomId", 0, DbType.Int32);
            parameters.Add("p_IsPublished", null, DbType.Int32);
            parameters.Add("p_CampusId", campusId ?? 0, DbType.Int32);

            return await conn.QueryAsync<TimetableResponseDto>(
                "sp_GetTimetables",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<TimetableResponseDto>> GetBySectionIdAsync(int sectionId, int? academicYearId = null, bool? isPublished = null, int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", 0, DbType.Int32);
            parameters.Add("p_AcademicLevelId", 0, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId ?? 0, DbType.Int32);
            parameters.Add("p_GroupId", 0, DbType.Int32);
            parameters.Add("p_SectionId", sectionId, DbType.Int32);
            parameters.Add("p_DayOfWeek", 0, DbType.Int32);
            parameters.Add("p_FacultyId", 0, DbType.Int32);
            parameters.Add("p_RoomId", 0, DbType.Int32);
            parameters.Add("p_IsPublished", isPublished.HasValue ? (isPublished.Value ? 1 : 0) : (int?)null, DbType.Int32);
            parameters.Add("p_CampusId", campusId ?? 0, DbType.Int32);

            return await conn.QueryAsync<TimetableResponseDto>(
                "sp_GetTimetables",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<TimetableResponseDto>> GetBySectionIdsBatchAsync(IEnumerable<int> sectionIds, int? academicYearId = null, bool? isPublished = null, int? campusId = null)
        {
            var secList = sectionIds?.ToList();
            if (secList == null || !secList.Any()) return Enumerable.Empty<TimetableResponseDto>();

            var result = new List<TimetableResponseDto>();
            foreach (var secId in secList)
            {
                var slots = await GetBySectionIdAsync(secId, academicYearId, isPublished, campusId);
                result.AddRange(slots);
            }

            return result.OrderBy(s => s.SectionId)
                         .ThenBy(s => s.DayOfWeek)
                         .ThenBy(s => s.PeriodNumber)
                         .ThenBy(s => s.StartTime)
                         .ToList();
        }

        public async Task<string?> CheckSlotConflictAsync(int academicYearId, int sectionId, int staffId, int roomId, int dayOfWeek, int periodId, int? excludeId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_SectionId", sectionId, DbType.Int32);
            parameters.Add("p_StaffId", staffId, DbType.Int32);
            parameters.Add("p_RoomId", roomId, DbType.Int32);
            parameters.Add("p_DayOfWeek", dayOfWeek, DbType.Int32);
            parameters.Add("p_PeriodId", periodId, DbType.Int32);
            parameters.Add("p_ExcludeId", excludeId ?? 0, DbType.Int32);

            return await conn.QueryFirstOrDefaultAsync<string?>(
                "sp_CheckSlotConflict",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> AddAsync(CreateTimetableDto dto)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", dto.BoardId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", dto.AcademicLevelId, DbType.Int32);
            parameters.Add("p_AcademicYearId", dto.AcademicYearId, DbType.Int32);
            parameters.Add("p_GroupId", dto.GroupId, DbType.Int32);
            parameters.Add("p_ProgramId", dto.ProgramId ?? 0, DbType.Int32);
            parameters.Add("p_SectionId", dto.SectionId, DbType.Int32);
            parameters.Add("p_DayOfWeek", dto.DayOfWeek, DbType.Int32);
            parameters.Add("p_PeriodId", dto.PeriodId, DbType.Int32);
            parameters.Add("p_SubjectId", dto.SubjectId, DbType.Int32);
            parameters.Add("p_StaffId", dto.StaffId, DbType.Int32);
            parameters.Add("p_RoomId", dto.RoomId, DbType.Int32);
            parameters.Add("p_CampusId", dto.CampusId ?? 0, DbType.Int32);
            parameters.Add("p_IsPublished", dto.IsPublished ? 1 : 0, DbType.Int32);
            parameters.Add("p_ApprovalStatus", dto.IsPublished ? (int)TimetableApprovalStatus.Published : (int)TimetableApprovalStatus.Draft, DbType.Int32);
            parameters.Add("p_Remarks", dto.Remarks ?? string.Empty, DbType.String);

            return await conn.ExecuteScalarAsync<int>(
                "sp_CreateTimetable",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task UpdateAsync(int id, UpdateTimetableDto dto)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id, DbType.Int32);
            parameters.Add("p_BoardId", dto.BoardId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", dto.AcademicLevelId, DbType.Int32);
            parameters.Add("p_AcademicYearId", dto.AcademicYearId, DbType.Int32);
            parameters.Add("p_GroupId", dto.GroupId, DbType.Int32);
            parameters.Add("p_ProgramId", dto.ProgramId ?? 0, DbType.Int32);
            parameters.Add("p_SectionId", dto.SectionId, DbType.Int32);
            parameters.Add("p_DayOfWeek", dto.DayOfWeek, DbType.Int32);
            parameters.Add("p_PeriodId", dto.PeriodId, DbType.Int32);
            parameters.Add("p_SubjectId", dto.SubjectId, DbType.Int32);
            parameters.Add("p_StaffId", dto.StaffId, DbType.Int32);
            parameters.Add("p_RoomId", dto.RoomId, DbType.Int32);
            parameters.Add("p_CampusId", dto.CampusId ?? 0, DbType.Int32);
            parameters.Add("p_IsPublished", dto.IsPublished ? 1 : 0, DbType.Int32);
            parameters.Add("p_ApprovalStatus", dto.IsPublished ? (int)TimetableApprovalStatus.Published : (int)TimetableApprovalStatus.Draft, DbType.Int32);
            parameters.Add("p_Remarks", dto.Remarks ?? string.Empty, DbType.String);

            await conn.ExecuteAsync(
                "sp_UpdateTimetable",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task DeleteAsync(int id)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id, DbType.Int32);

            await conn.ExecuteAsync(
                "sp_DeleteTimetable",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task TogglePublishSlotAsync(int id, bool isPublished)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id, DbType.Int32);
            parameters.Add("p_IsPublished", isPublished ? 1 : 0, DbType.Int32);

            await conn.ExecuteAsync(
                "sp_PublishTimetableSlot",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task PublishSectionTimetableAsync(int sectionId, int academicYearId, bool isPublished)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_SectionId", sectionId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_IsPublished", isPublished ? 1 : 0, DbType.Int32);

            await conn.ExecuteAsync(
                "sp_PublishSectionTimetable",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> HasSectionSlotConflictAsync(int academicYearId, int sectionId, int dayOfWeek, int periodId, int? excludeId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_SectionId", sectionId, DbType.Int32);
            parameters.Add("p_DayOfWeek", dayOfWeek, DbType.Int32);
            parameters.Add("p_PeriodId", periodId, DbType.Int32);
            parameters.Add("p_ExcludeId", excludeId ?? 0, DbType.Int32);

            int count = await conn.ExecuteScalarAsync<int>(
                "sp_CheckSectionSlotConflict",
                parameters,
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> HasFacultySlotConflictAsync(int academicYearId, int facultyId, int dayOfWeek, int periodId, int? excludeId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_FacultyId", facultyId, DbType.Int32);
            parameters.Add("p_DayOfWeek", dayOfWeek, DbType.Int32);
            parameters.Add("p_PeriodId", periodId, DbType.Int32);
            parameters.Add("p_ExcludeId", excludeId ?? 0, DbType.Int32);

            int count = await conn.ExecuteScalarAsync<int>(
                "sp_CheckFacultySlotConflict",
                parameters,
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> HasRoomSlotConflictAsync(int academicYearId, int roomId, int dayOfWeek, int periodId, int? excludeId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_RoomId", roomId, DbType.Int32);
            parameters.Add("p_DayOfWeek", dayOfWeek, DbType.Int32);
            parameters.Add("p_PeriodId", periodId, DbType.Int32);
            parameters.Add("p_ExcludeId", excludeId ?? 0, DbType.Int32);

            int count = await conn.ExecuteScalarAsync<int>(
                "sp_CheckRoomSlotConflict",
                parameters,
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<IEnumerable<AllocatedFacultyDto>> GetAllocatedFacultiesAsync(int? boardId, int? academicLevelId, int? academicYearId, int? groupId, int? sectionId, int? subjectId, int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", boardId ?? 0, DbType.Int32);
            parameters.Add("p_AcademicLevelId", academicLevelId ?? 0, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId ?? 0, DbType.Int32);
            parameters.Add("p_GroupId", groupId ?? 0, DbType.Int32);
            parameters.Add("p_SectionId", sectionId ?? 0, DbType.Int32);
            parameters.Add("p_SubjectId", subjectId ?? 0, DbType.Int32);

            return await conn.QueryAsync<AllocatedFacultyDto>(
                "sp_GetAllocatedFacultiesForSlot",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task CopySectionTimetableAsync(CopyTimetableDto dto)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_SourceAcademicYearId", dto.SourceAcademicYearId, DbType.Int32);
            parameters.Add("p_SourceSectionId", dto.SourceSectionId, DbType.Int32);
            parameters.Add("p_TargetAcademicYearId", dto.TargetAcademicYearId, DbType.Int32);
            parameters.Add("p_TargetSectionId", dto.TargetSectionId, DbType.Int32);

            await conn.ExecuteAsync(
                "sp_CopyTimetable",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
    }
}
