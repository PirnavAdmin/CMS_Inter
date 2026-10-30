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

        public async Task<TimetableResponseDto?> GetByIdAsync(int id)
        {
            var conn = await GetOpenConnectionAsync();
            return await conn.QueryFirstOrDefaultAsync<TimetableResponseDto>(
                "sp_GetTimetableByIdFull",
                new { p_Id = id },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<(IEnumerable<TimetableResponseDto> Items, int TotalCount)> GetPagedAsync(TimetableQueryParams queryParams)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", queryParams.BoardId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", queryParams.AcademicLevelId, DbType.Int32);
            parameters.Add("p_AcademicYearId", queryParams.AcademicYearId, DbType.Int32);
            parameters.Add("p_GroupId", queryParams.GroupId, DbType.Int32);
            parameters.Add("p_ProgramId", queryParams.ProgramId, DbType.Int32);
            parameters.Add("p_SectionId", queryParams.SectionId, DbType.Int32);
            parameters.Add("p_DayOfWeek", queryParams.DayOfWeek, DbType.Int32);
            parameters.Add("p_StaffId", queryParams.StaffId ?? queryParams.FacultyId, DbType.Int32);
            parameters.Add("p_RoomId", queryParams.RoomId, DbType.Int32);
            parameters.Add("p_IsPublished", queryParams.IsPublished.HasValue ? (queryParams.IsPublished.Value ? 1 : 0) : (int?)null, DbType.Int32);
            parameters.Add("p_ApprovalStatus", (int?)queryParams.ApprovalStatus, DbType.Int32);
            parameters.Add("p_CampusId", queryParams.CampusId, DbType.Int32);
            parameters.Add("p_PageNumber", queryParams.PageNumber, DbType.Int32);
            parameters.Add("p_PageSize", queryParams.PageSize, DbType.Int32);

            using var multi = await conn.QueryMultipleAsync(
                "sp_GetTimetablesPaged",
                parameters,
                commandType: CommandType.StoredProcedure);

            var totalCount = await multi.ReadFirstOrDefaultAsync<int>();
            var items = (await multi.ReadAsync<TimetableResponseDto>()).ToList();
            return (items, totalCount);
        }

        public async Task<IEnumerable<TimetableResponseDto>> GetByFacultyIdAsync(int facultyId, int? academicYearId = null, int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", null, DbType.Int32);
            parameters.Add("p_AcademicLevelId", null, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_GroupId", null, DbType.Int32);
            parameters.Add("p_ProgramId", null, DbType.Int32);
            parameters.Add("p_SectionId", null, DbType.Int32);
            parameters.Add("p_DayOfWeek", null, DbType.Int32);
            parameters.Add("p_StaffId", facultyId, DbType.Int32);
            parameters.Add("p_RoomId", null, DbType.Int32);
            parameters.Add("p_IsPublished", null, DbType.Int32);
            parameters.Add("p_ApprovalStatus", null, DbType.Int32);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            var items = (await conn.QueryAsync<TimetableResponseDto>(
                "sp_GetTimetablesFull",
                parameters,
                commandType: CommandType.StoredProcedure)).ToList();

            if (!items.Any() && (academicYearId.HasValue || campusId.HasValue))
            {
                parameters.Add("p_AcademicYearId", null, DbType.Int32);
                parameters.Add("p_CampusId", null, DbType.Int32);
                items = (await conn.QueryAsync<TimetableResponseDto>(
                    "sp_GetTimetablesFull",
                    parameters,
                    commandType: CommandType.StoredProcedure)).ToList();
            }

            return items;
        }

        public async Task<IEnumerable<TimetableResponseDto>> GetBySectionIdAsync(int sectionId, int? academicYearId = null, bool? isPublished = null, int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", null, DbType.Int32);
            parameters.Add("p_AcademicLevelId", null, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_GroupId", null, DbType.Int32);
            parameters.Add("p_ProgramId", null, DbType.Int32);
            parameters.Add("p_SectionId", sectionId, DbType.Int32);
            parameters.Add("p_DayOfWeek", null, DbType.Int32);
            parameters.Add("p_StaffId", null, DbType.Int32);
            parameters.Add("p_RoomId", null, DbType.Int32);
            parameters.Add("p_IsPublished", isPublished.HasValue ? (isPublished.Value ? 1 : 0) : (int?)null, DbType.Int32);
            parameters.Add("p_ApprovalStatus", null, DbType.Int32);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            return await conn.QueryAsync<TimetableResponseDto>(
                "sp_GetTimetablesFull",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<TimetableResponseDto>> GetBySectionIdsBatchAsync(IEnumerable<int> sectionIds, int? academicYearId = null, bool? isPublished = null, int? campusId = null)
        {
            var secIdList = sectionIds?.Distinct().ToHashSet() ?? new HashSet<int>();
            if (!secIdList.Any()) return Enumerable.Empty<TimetableResponseDto>();

            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", null, DbType.Int32);
            parameters.Add("p_AcademicLevelId", null, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_GroupId", null, DbType.Int32);
            parameters.Add("p_ProgramId", null, DbType.Int32);
            parameters.Add("p_SectionId", null, DbType.Int32);
            parameters.Add("p_DayOfWeek", null, DbType.Int32);
            parameters.Add("p_StaffId", null, DbType.Int32);
            parameters.Add("p_RoomId", null, DbType.Int32);
            parameters.Add("p_IsPublished", isPublished.HasValue ? (isPublished.Value ? 1 : 0) : (int?)null, DbType.Int32);
            parameters.Add("p_ApprovalStatus", null, DbType.Int32);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            var allSlots = await conn.QueryAsync<TimetableResponseDto>(
                "sp_GetTimetablesFull",
                parameters,
                commandType: CommandType.StoredProcedure);

            return allSlots.Where(s => secIdList.Contains(s.SectionId)).ToList();
        }

        public async Task<IEnumerable<TimetableResponseDto>> GetStudentTimetableAsync(int studentId)
        {
            var conn = await GetOpenConnectionAsync();
            return await conn.QueryAsync<TimetableResponseDto>(
                "sp_GetStudentTimetable",
                new { p_StudentId = studentId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<string?> CheckSlotConflictAsync(int academicYearId, int sectionId, int staffId, int roomId, int dayOfWeek, int periodId, int? excludeId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var conflicts = (await conn.QueryAsync<dynamic>(
                "sp_CheckTimetableConflicts",
                new
                {
                    p_AcademicYearId = academicYearId,
                    p_DayOfWeek = dayOfWeek,
                    p_PeriodId = periodId,
                    p_StaffId = staffId,
                    p_SectionId = sectionId,
                    p_RoomId = roomId,
                    p_ExcludeTimetableId = excludeId
                },
                commandType: CommandType.StoredProcedure)).ToList();

            if (!conflicts.Any()) return null;
            string conflictType = Convert.ToString(conflicts.First().ConflictType) ?? string.Empty;
            return conflictType.ToUpperInvariant();
        }

        public async Task<int> AddAsync(CreateTimetableDto dto)
        {
            var conn = await GetOpenConnectionAsync();
            return await conn.ExecuteScalarAsync<int>(
                "sp_CreateTimetable",
                new
                {
                    p_CampusId = dto.CampusId,
                    p_BoardId = dto.BoardId,
                    p_AcademicLevelId = dto.AcademicLevelId,
                    p_AcademicYearId = dto.AcademicYearId,
                    p_GroupId = dto.GroupId,
                    p_ProgramId = dto.ProgramId,
                    p_SectionId = dto.SectionId,
                    p_DayOfWeek = dto.DayOfWeek,
                    p_PeriodId = dto.PeriodId,
                    p_SubjectId = dto.SubjectId,
                    p_FacultyId = dto.StaffId,
                    p_StaffId = dto.StaffId,
                    p_RoomId = dto.RoomId,
                    p_IsPublished = dto.IsPublished ? 1 : 0,
                    p_ApprovalStatus = dto.IsPublished ? (int)TimetableApprovalStatus.Published : (int)TimetableApprovalStatus.Draft,
                    p_Remarks = dto.Remarks,
                    p_SlotType = dto.SlotType ?? "Teaching"
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task UpdateAsync(int id, UpdateTimetableDto dto)
        {
            var conn = await GetOpenConnectionAsync();
            await conn.ExecuteAsync(
                "sp_UpdateTimetable",
                new
                {
                    p_Id = id,
                    p_CampusId = dto.CampusId,
                    p_BoardId = dto.BoardId,
                    p_AcademicLevelId = dto.AcademicLevelId,
                    p_AcademicYearId = dto.AcademicYearId,
                    p_GroupId = dto.GroupId,
                    p_ProgramId = dto.ProgramId,
                    p_SectionId = dto.SectionId,
                    p_DayOfWeek = dto.DayOfWeek,
                    p_PeriodId = dto.PeriodId,
                    p_SubjectId = dto.SubjectId,
                    p_FacultyId = dto.StaffId,
                    p_StaffId = dto.StaffId,
                    p_RoomId = dto.RoomId,
                    p_IsPublished = dto.IsPublished ? 1 : 0,
                    p_ApprovalStatus = dto.IsPublished ? (int)TimetableApprovalStatus.Published : (int)TimetableApprovalStatus.Draft,
                    p_Remarks = dto.Remarks,
                    p_SlotType = dto.SlotType ?? "Teaching"
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task DeleteAsync(int id)
        {
            var conn = await GetOpenConnectionAsync();
            await conn.ExecuteAsync(
                "sp_DeleteTimetable",
                new { p_Id = id },
                commandType: CommandType.StoredProcedure);
        }

        public async Task TogglePublishSlotAsync(int id, bool isPublished)
        {
            var conn = await GetOpenConnectionAsync();
            await conn.ExecuteAsync(
                "sp_TogglePublishSlot",
                new { p_Id = id, p_IsPublished = isPublished ? 1 : 0 },
                commandType: CommandType.StoredProcedure);
        }

        public async Task PublishSectionTimetableAsync(int sectionId, int academicYearId, bool isPublished)
        {
            var conn = await GetOpenConnectionAsync();
            await conn.ExecuteAsync(
                "sp_PublishSectionTimetable",
                new { p_SectionId = sectionId, p_AcademicYearId = academicYearId, p_IsPublished = isPublished ? 1 : 0 },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> ApproveSectionTimetableAsync(int sectionId, int academicYearId)
        {
            var conn = await GetOpenConnectionAsync();
            return await conn.ExecuteScalarAsync<int>(
                "sp_ApproveSectionTimetable",
                new { p_SectionId = sectionId, p_AcademicYearId = academicYearId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> HasSectionSlotConflictAsync(int academicYearId, int sectionId, int dayOfWeek, int periodId, int? excludeId = null)
        {
            var result = await CheckSlotConflictAsync(academicYearId, sectionId, 0, 0, dayOfWeek, periodId, excludeId);
            return result == "SECTION";
        }

        public async Task<bool> HasFacultySlotConflictAsync(int academicYearId, int facultyId, int dayOfWeek, int periodId, int? excludeId = null)
        {
            var result = await CheckSlotConflictAsync(academicYearId, 0, facultyId, 0, dayOfWeek, periodId, excludeId);
            return result == "STAFF";
        }

        public async Task<bool> HasRoomSlotConflictAsync(int academicYearId, int roomId, int dayOfWeek, int periodId, int? excludeId = null)
        {
            var result = await CheckSlotConflictAsync(academicYearId, 0, 0, roomId, dayOfWeek, periodId, excludeId);
            return result == "ROOM";
        }

        public async Task<IEnumerable<AllocatedFacultyDto>> GetAllocatedFacultiesAsync(int? boardId, int? academicLevelId, int? academicYearId, int? groupId, int? sectionId, int? subjectId, int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            return await conn.QueryAsync<AllocatedFacultyDto>(
                "sp_GetAllocatedFaculties",
                new { p_SubjectId = subjectId, p_CampusId = campusId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task CopySectionTimetableAsync(CopyTimetableDto dto)
        {
            var conn = await GetOpenConnectionAsync();
            await conn.ExecuteAsync(
                "sp_CopyTimetable",
                new
                {
                    p_SourceAcademicYearId = dto.SourceAcademicYearId,
                    p_SourceSectionId = dto.SourceSectionId,
                    p_TargetAcademicYearId = dto.TargetAcademicYearId,
                    p_TargetSectionId = dto.TargetSectionId
                },
                commandType: CommandType.StoredProcedure);
        }
    }
}
