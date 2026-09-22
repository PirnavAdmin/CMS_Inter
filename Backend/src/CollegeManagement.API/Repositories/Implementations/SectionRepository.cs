using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Sections;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class SectionRepository : ISectionRepository
    {
        private readonly AppDbContext _context;

        public SectionRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<IEnumerable<SectionResponse>> GetAllSectionsAsync(SectionFilterDto? filter = null)
        {
            // Resolve foreign keys if string names provided
            int? boardId = (filter?.BoardId.HasValue == true && filter.BoardId.Value > 0) 
                ? filter.BoardId.Value 
                : await ResolveBoardIdAsync(null, filter?.Board);

            int? academicYearId = (filter?.AcademicYearId.HasValue == true && filter.AcademicYearId.Value > 0) 
                ? filter.AcademicYearId.Value 
                : null;

            int? academicLevelId = (filter?.AcademicLevelId.HasValue == true && filter.AcademicLevelId.Value > 0)
                ? filter.AcademicLevelId.Value
                : await ResolveAcademicLevelIdAsync(null, filter?.AcademicLevel ?? filter?.YearOfStudy);

            int? groupId = (filter?.GroupId.HasValue == true && filter.GroupId.Value > 0)
                ? filter.GroupId.Value
                : await ResolveGroupIdAsync(null, filter?.Group);

            int? programId = (filter?.ProgramId.HasValue == true && filter.ProgramId.Value > 0)
                ? filter.ProgramId.Value
                : await ResolveProgramIdAsync(null, filter?.Programme ?? filter?.Program, groupId);

            int? groupProgramId = (filter?.GroupProgramId.HasValue == true && filter.GroupProgramId.Value > 0)
                ? filter.GroupProgramId.Value
                : null;

            string? searchTerm = string.IsNullOrWhiteSpace(filter?.SearchTerm ?? filter?.Search) 
                ? null 
                : (filter?.SearchTerm ?? filter?.Search)!.Trim();

            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", academicLevelId, DbType.Int32);
            parameters.Add("p_GroupId", groupId, DbType.Int32);
            parameters.Add("p_GroupProgramId", groupProgramId, DbType.Int32);
            parameters.Add("p_ProgramId", programId, DbType.Int32);
            parameters.Add("p_SearchTerm", searchTerm, DbType.String);
            parameters.Add("p_IsActive", filter?.IsActive, DbType.Boolean);

            return await Connection.QueryAsync<SectionResponse>(
                "sp_GetAllSections",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<SectionResponse?> GetSectionByIdAsync(int id)
        {
            return await Connection.QueryFirstOrDefaultAsync<SectionResponse>(
                "sp_GetSectionById",
                new { p_SectionId = id },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> CreateSectionAsync(Section section)
        {
            return await Connection.ExecuteScalarAsync<int>(
                "sp_CreateSection",
                new
                {
                    p_BoardId = section.BoardId,
                    p_AcademicYearId = section.AcademicYearId,
                    p_AcademicLevelId = section.AcademicLevelId,
                    p_GroupId = section.GroupId,
                    p_GroupProgramId = section.GroupProgramId,
                    p_ProgramId = section.ProgramId,
                    p_SectionName = section.SectionName,
                    p_RoomId = section.RoomId,
                    p_InchargeId = section.InchargeId,
                    p_MaximumStrength = section.MaximumStrength,
                    p_IsActive = section.IsActive
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateSectionAsync(int id, Section section)
        {
            var affected = await Connection.ExecuteAsync(
                "sp_UpdateSection",
                new
                {
                    p_SectionId = id,
                    p_BoardId = section.BoardId,
                    p_AcademicYearId = section.AcademicYearId,
                    p_AcademicLevelId = section.AcademicLevelId,
                    p_GroupId = section.GroupId,
                    p_GroupProgramId = section.GroupProgramId,
                    p_ProgramId = section.ProgramId,
                    p_SectionName = section.SectionName,
                    p_RoomId = section.RoomId,
                    p_InchargeId = section.InchargeId,
                    p_MaximumStrength = section.MaximumStrength,
                    p_IsActive = section.IsActive
                },
                commandType: CommandType.StoredProcedure);

            return affected > 0;
        }

        public async Task<bool> DeleteSectionAsync(int id)
        {
            var affected = await Connection.ExecuteAsync(
                "sp_DeleteSection",
                new { p_SectionId = id },
                commandType: CommandType.StoredProcedure);

            return affected > 0;
        }

        public async Task<IEnumerable<SectionResponse>> GetSectionsByGroupAsync(int groupId)
        {
            return await Connection.QueryAsync<SectionResponse>(
                "sp_GetSectionsByGroupId",
                new { p_GroupId = groupId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<SectionResponse>> GetSectionsByGroupProgramAsync(int groupProgramId)
        {
            return await Connection.QueryAsync<SectionResponse>(
                "sp_GetSectionsByGroupProgramId",
                new { p_GroupProgramId = groupProgramId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> IsSectionNameDuplicateAsync(
            int? boardId,
            int academicYearId,
            int? academicLevelId,
            int? groupId,
            int? groupProgramId,
            int? programId,
            string sectionName,
            int? excludeSectionId = null)
        {
            var count = await Connection.ExecuteScalarAsync<int>(
                "sp_ValidateSectionNameDuplicate",
                new
                {
                    p_BoardId = boardId,
                    p_AcademicYearId = academicYearId,
                    p_AcademicLevelId = academicLevelId,
                    p_GroupId = groupId,
                    p_GroupProgramId = groupProgramId,
                    p_ProgramId = programId,
                    p_SectionName = sectionName,
                    p_ExcludeSectionId = excludeSectionId
                },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> AcademicYearExistsAsync(int academicYearId)
        {
            var ay = await GetAcademicYearByIdAsync(academicYearId);
            return ay != null;
        }

        public async Task<AcademicYear?> GetAcademicYearByIdAsync(int academicYearId)
        {
            var row = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                "sp_GetAcademicYearValidation",
                new { p_AcademicYearId = academicYearId },
                commandType: CommandType.StoredProcedure);

            if (row == null) return null;

            DateOnly ToDateOnly(dynamic? val)
            {
                if (val == null) return default;
                if (val is DateOnly d) return d;
                if (val is DateTime dt) return DateOnly.FromDateTime(dt);
                if (DateTime.TryParse(val.ToString(), out DateTime parsed)) return DateOnly.FromDateTime(parsed);
                return default;
            }

            DateOnly? ToNullableDateOnly(dynamic? val)
            {
                if (val == null) return null;
                if (val is DateOnly d) return d;
                if (val is DateTime dt) return DateOnly.FromDateTime(dt);
                if (DateTime.TryParse(val.ToString(), out DateTime parsed)) return DateOnly.FromDateTime(parsed);
                return null;
            }

            return new AcademicYear
            {
                AcademicYearId = (int)row.AcademicYearId,
                AcademicYearName = row.AcademicYearName?.ToString() ?? string.Empty,
                StartDate = ToDateOnly(row.StartDate),
                EndDate = ToDateOnly(row.EndDate),
                AdmissionStartDate = ToNullableDateOnly(row.AdmissionStartDate),
                AdmissionEndDate = ToNullableDateOnly(row.AdmissionEndDate),
                IsActive = row.IsActive is bool b ? b : (row.IsActive is int i ? i == 1 : Convert.ToBoolean(row.IsActive))
            };
        }

        public async Task<bool> FacultyExistsAsync(int facultyId)
        {
            try
            {
                var count = await Connection.ExecuteScalarAsync<int>(
                    "SELECT COUNT(1) FROM `Staffs` WHERE Id = @Id AND (IsDeleted = 0 OR IsDeleted IS NULL)",
                    new { Id = facultyId });
                return count > 0;
            }
            catch
            {
                var count = await Connection.ExecuteScalarAsync<int>(
                    "SELECT COUNT(1) FROM `Faculties` WHERE Id = @Id AND (IsDeleted = 0 OR IsDeleted IS NULL)",
                    new { Id = facultyId });
                return count > 0;
            }
        }

        public async Task<bool> RoomExistsAsync(int roomId)
        {
            var room = await Connection.QueryFirstOrDefaultAsync<CollegeManagement.API.Models.Timetable.Room>(
                "sp_GetRoomById",
                new { p_RoomId = roomId },
                commandType: CommandType.StoredProcedure);

            return room != null && room.IsActive;
        }

        public async Task<CollegeManagement.API.Models.Timetable.Room?> GetRoomDetailsAsync(int? roomId, string? roomCode)
        {
            if (roomId.HasValue && roomId.Value > 0)
            {
                return await Connection.QueryFirstOrDefaultAsync<CollegeManagement.API.Models.Timetable.Room>(
                    "sp_GetRoomById",
                    new { p_RoomId = roomId.Value },
                    commandType: CommandType.StoredProcedure);
            }

            if (!string.IsNullOrWhiteSpace(roomCode))
            {
                return await Connection.QueryFirstOrDefaultAsync<CollegeManagement.API.Models.Timetable.Room>(
                    "sp_GetRoomByCode",
                    new { p_RoomCode = roomCode.Trim() },
                    commandType: CommandType.StoredProcedure);
            }

            return null;
        }

        public async Task<SectionResponse?> GetActiveSectionAssignedToRoomAsync(int? roomId, string? roomCode, int? excludeSectionId = null)
        {
            return await Connection.QueryFirstOrDefaultAsync<SectionResponse>(
                "sp_GetActiveSectionAssignedToRoom",
                new
                {
                    p_RoomId = roomId,
                    p_RoomCode = string.IsNullOrWhiteSpace(roomCode) ? null : roomCode.Trim(),
                    p_ExcludeSectionId = excludeSectionId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int?> ResolveBoardIdAsync(int? boardId, string? boardName)
        {
            if (boardId.HasValue && boardId.Value > 0) return boardId.Value;
            if (string.IsNullOrWhiteSpace(boardName)) return null;

            var result = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                "sp_ResolveSectionForeignKeys",
                new
                {
                    p_BoardId = boardId,
                    p_BoardName = boardName?.Trim(),
                    p_AcademicLevelId = (int?)null,
                    p_LevelName = (string?)null,
                    p_GroupId = (int?)null,
                    p_GroupName = (string?)null,
                    p_ProgramId = (int?)null,
                    p_ProgramName = (string?)null,
                    p_GroupProgramId = (int?)null
                },
                commandType: CommandType.StoredProcedure);

            return result?.ResolvedBoardId != null ? (int?)result.ResolvedBoardId : null;
        }

        public async Task<int?> ResolveGroupIdAsync(int? groupId, string? groupName)
        {
            if (groupId.HasValue && groupId.Value > 0) return groupId.Value;
            if (string.IsNullOrWhiteSpace(groupName)) return null;

            var result = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                "sp_ResolveSectionForeignKeys",
                new
                {
                    p_BoardId = (int?)null,
                    p_BoardName = (string?)null,
                    p_AcademicLevelId = (int?)null,
                    p_LevelName = (string?)null,
                    p_GroupId = groupId,
                    p_GroupName = groupName?.Trim(),
                    p_ProgramId = (int?)null,
                    p_ProgramName = (string?)null,
                    p_GroupProgramId = (int?)null
                },
                commandType: CommandType.StoredProcedure);

            return result?.ResolvedGroupId != null ? (int?)result.ResolvedGroupId : null;
        }

        public async Task<int?> ResolveAcademicLevelIdAsync(int? academicLevelId, string? levelName)
        {
            if (academicLevelId.HasValue && academicLevelId.Value > 0) return academicLevelId.Value;
            if (string.IsNullOrWhiteSpace(levelName)) return null;

            var result = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                "sp_ResolveSectionForeignKeys",
                new
                {
                    p_BoardId = (int?)null,
                    p_BoardName = (string?)null,
                    p_AcademicLevelId = academicLevelId,
                    p_LevelName = levelName?.Trim(),
                    p_GroupId = (int?)null,
                    p_GroupName = (string?)null,
                    p_ProgramId = (int?)null,
                    p_ProgramName = (string?)null,
                    p_GroupProgramId = (int?)null
                },
                commandType: CommandType.StoredProcedure);

            return result?.ResolvedAcademicLevelId != null ? (int?)result.ResolvedAcademicLevelId : null;
        }

        public async Task<int?> ResolveProgramIdAsync(int? programId, string? programName, int? groupId)
        {
            if (programId.HasValue && programId.Value > 0) return programId.Value;

            var result = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                "sp_ResolveSectionForeignKeys",
                new
                {
                    p_BoardId = (int?)null,
                    p_BoardName = (string?)null,
                    p_AcademicLevelId = (int?)null,
                    p_LevelName = (string?)null,
                    p_GroupId = groupId,
                    p_GroupName = (string?)null,
                    p_ProgramId = programId,
                    p_ProgramName = programName?.Trim(),
                    p_GroupProgramId = (int?)null
                },
                commandType: CommandType.StoredProcedure);

            return result?.ResolvedProgramId != null ? (int?)result.ResolvedProgramId : null;
        }

        public async Task<int?> ResolveGroupProgramIdAsync(int? groupProgramId, int? groupId, int? programId)
        {
            if (groupProgramId.HasValue && groupProgramId.Value > 0) return groupProgramId.Value;

            var result = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                "sp_ResolveSectionForeignKeys",
                new
                {
                    p_BoardId = (int?)null,
                    p_BoardName = (string?)null,
                    p_AcademicLevelId = (int?)null,
                    p_LevelName = (string?)null,
                    p_GroupId = groupId,
                    p_GroupName = (string?)null,
                    p_ProgramId = programId,
                    p_ProgramName = (string?)null,
                    p_GroupProgramId = groupProgramId
                },
                commandType: CommandType.StoredProcedure);

            return result?.ResolvedGroupProgramId != null ? (int?)result.ResolvedGroupProgramId : null;
        }

        public async Task<(int? GroupId, int? ProgramId)> GetGroupAndProgramByGroupProgramIdAsync(int groupProgramId)
        {
            var row = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                "SELECT GroupId, ProgramId FROM `GroupPrograms` WHERE GroupProgramId = @Id LIMIT 1;",
                new { Id = groupProgramId });

            if (row == null) return (null, null);
            return ((int?)row.GroupId, (int?)row.ProgramId);
        }

        public async Task<bool> IsProgramValidForGroupAsync(int groupId, int programId)
        {
            var count = await Connection.ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM `GroupPrograms` WHERE GroupId = @GroupId AND ProgramId = @ProgramId AND IsActive = 1;",
                new { GroupId = groupId, ProgramId = programId });

            return count > 0;
        }
    }
}
