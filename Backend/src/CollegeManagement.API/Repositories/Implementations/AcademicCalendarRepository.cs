using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.AcademicCalendar;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Settings;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    /// <summary>
    /// Academic Calendar repository refactored to 100% Stored Procedures via Dapper.
    /// Fully compliant with architectural Rule 2 (Pure SP, zero inline SQL/LINQ for data operations).
    /// </summary>
    public class AcademicCalendarRepository : IAcademicCalendarRepository
    {
        private readonly AppDbContext _context;

        public AcademicCalendarRepository(AppDbContext context)
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

        public async Task<(List<AcademicCalendarEvent> Items, int TotalCount)> GetPagedEventsAsync(AcademicCalendarFilterDto filter)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_AcademicYearId", filter.AcademicYearId > 0 ? filter.AcademicYearId : null, DbType.Int32);
            parameters.Add("p_BoardId", filter.BoardId > 0 ? filter.BoardId : null, DbType.Int32);
            parameters.Add("p_CampusId", filter.CampusId > 0 ? filter.CampusId : null, DbType.Int32);
            parameters.Add("p_AcademicLevelId", filter.AcademicLevelId > 0 ? filter.AcademicLevelId : null, DbType.Int32);
            parameters.Add("p_GroupId", filter.GroupId > 0 ? filter.GroupId : null, DbType.Int32);
            parameters.Add("p_ProgramId", filter.ProgramId > 0 ? filter.ProgramId : null, DbType.Int32);
            parameters.Add("p_SectionId", filter.SectionId > 0 ? filter.SectionId : null, DbType.Int32);
            parameters.Add("p_EventType", string.IsNullOrWhiteSpace(filter.EventType) ? null : filter.EventType.Trim(), DbType.String);
            parameters.Add("p_Status", string.IsNullOrWhiteSpace(filter.Status) ? null : filter.Status.Trim(), DbType.String);
            parameters.Add("p_Search", string.IsNullOrWhiteSpace(filter.Search) ? null : filter.Search.Trim(), DbType.String);
            parameters.Add("p_StartDate", filter.StartDate, DbType.DateTime);
            parameters.Add("p_EndDate", filter.EndDate, DbType.DateTime);
            parameters.Add("p_Month", filter.Month > 0 ? filter.Month : null, DbType.Int32);
            parameters.Add("p_Year", filter.Year > 0 ? filter.Year : null, DbType.Int32);
            parameters.Add("p_Page", filter.Page > 0 ? filter.Page : 1, DbType.Int32);
            parameters.Add("p_PageSize", filter.PageSize > 0 ? filter.PageSize : 50, DbType.Int32);

            using var multi = await conn.QueryMultipleAsync(
                "sp_GetAcademicCalendarEventsPaged",
                parameters,
                commandType: CommandType.StoredProcedure);

            var totalCount = await multi.ReadFirstOrDefaultAsync<int>();
            var rows = await multi.ReadAsync<AcademicCalendarDbRow>();
            var items = rows.Select(r => r.ToEntity()).ToList();

            return (items, totalCount);
        }

        public async Task<List<AcademicCalendarEvent>> GetEventsByRangeAsync(
            DateTime startDate,
            DateTime endDate,
            int? boardId = null,
            int? academicYearId = null,
            int? campusId = null,
            int? academicLevelId = null,
            int? groupId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_StartDate", startDate, DbType.DateTime);
            parameters.Add("p_EndDate", endDate, DbType.DateTime);
            parameters.Add("p_BoardId", boardId > 0 ? boardId : null, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId > 0 ? academicYearId : null, DbType.Int32);
            parameters.Add("p_CampusId", campusId > 0 ? campusId : null, DbType.Int32);
            parameters.Add("p_AcademicLevelId", academicLevelId > 0 ? academicLevelId : null, DbType.Int32);
            parameters.Add("p_GroupId", groupId > 0 ? groupId : null, DbType.Int32);

            var rows = await conn.QueryAsync<AcademicCalendarDbRow>(
                "sp_GetAcademicCalendarEventsByRange",
                parameters,
                commandType: CommandType.StoredProcedure);

            return rows.Select(r => r.ToEntity()).ToList();
        }

        public async Task<AcademicCalendarEvent?> GetByIdAsync(int eventId)
        {
            var conn = await GetOpenConnectionAsync();
            var row = await conn.QueryFirstOrDefaultAsync<AcademicCalendarDbRow>(
                "sp_GetAcademicCalendarEventById",
                new { p_EventId = eventId },
                commandType: CommandType.StoredProcedure);

            return row?.ToEntity();
        }

        public async Task<AcademicCalendarMetricsDto> GetMetricsAsync(int? academicYearId, int? boardId, int? campusId)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_AcademicYearId", academicYearId > 0 ? academicYearId : null, DbType.Int32);
            parameters.Add("p_BoardId", boardId > 0 ? boardId : null, DbType.Int32);
            parameters.Add("p_CampusId", campusId > 0 ? campusId : null, DbType.Int32);

            using var multi = await conn.QueryMultipleAsync(
                "sp_GetAcademicCalendarMetrics",
                parameters,
                commandType: CommandType.StoredProcedure);

            var metrics = await multi.ReadFirstOrDefaultAsync<AcademicCalendarMetricsDto>() ?? new AcademicCalendarMetricsDto();
            var grouped = await multi.ReadAsync<EventTypeCountRow>();

            metrics.EventTypeCounts = grouped.ToDictionary(
                r => r.EventType,
                r => r.Count);

            return metrics;
        }

        private class EventTypeCountRow
        {
            public string EventType { get; set; } = string.Empty;
            public int Count { get; set; }
        }

        public async Task<List<AcademicCalendarEvent>> GetUpcomingEventsAsync(int? academicYearId, int? boardId, int? campusId, int count = 5)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_AcademicYearId", academicYearId > 0 ? academicYearId : null, DbType.Int32);
            parameters.Add("p_BoardId", boardId > 0 ? boardId : null, DbType.Int32);
            parameters.Add("p_CampusId", campusId > 0 ? campusId : null, DbType.Int32);
            parameters.Add("p_Count", count > 0 ? count : 5, DbType.Int32);

            var rows = await conn.QueryAsync<AcademicCalendarDbRow>(
                "sp_GetUpcomingAcademicCalendarEvents",
                parameters,
                commandType: CommandType.StoredProcedure);

            return rows.Select(r => r.ToEntity()).ToList();
        }

        public async Task<AcademicCalendarEvent> CreateAsync(AcademicCalendarEvent entity)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_Title", entity.Title, DbType.String);
            parameters.Add("p_EventType", entity.EventType, DbType.String);
            parameters.Add("p_Description", entity.Description, DbType.String);
            parameters.Add("p_StartDate", entity.StartDate, DbType.DateTime);
            parameters.Add("p_EndDate", entity.EndDate, DbType.DateTime);
            parameters.Add("p_IsAllDay", entity.IsAllDay ? 1 : 0, DbType.Int32);
            parameters.Add("p_StartTime", entity.StartTime, DbType.String);
            parameters.Add("p_EndTime", entity.EndTime, DbType.String);
            parameters.Add("p_Status", entity.Status, DbType.String);
            parameters.Add("p_CampusId", entity.CampusId > 0 ? entity.CampusId : null, DbType.Int32);
            parameters.Add("p_BoardId", entity.BoardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", entity.AcademicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", entity.AcademicLevelId > 0 ? entity.AcademicLevelId : null, DbType.Int32);
            parameters.Add("p_GroupId", entity.GroupId > 0 ? entity.GroupId : null, DbType.Int32);
            parameters.Add("p_ProgramId", entity.ProgramId > 0 ? entity.ProgramId : null, DbType.Int32);
            parameters.Add("p_SectionId", entity.SectionId > 0 ? entity.SectionId : null, DbType.Int32);
            parameters.Add("p_Location", entity.Location, DbType.String);
            parameters.Add("p_IsPublished", entity.IsPublished ? 1 : 0, DbType.Int32);
            parameters.Add("p_PublishedAt", entity.PublishedAt, DbType.DateTime);
            parameters.Add("p_PublishedBy", entity.PublishedBy, DbType.Int32);
            parameters.Add("p_CreatedBy", entity.CreatedBy, DbType.Int32);

            var createdRow = await conn.QueryFirstOrDefaultAsync<AcademicCalendarDbRow>(
                "sp_CreateAcademicCalendarEvent",
                parameters,
                commandType: CommandType.StoredProcedure);

            return createdRow != null ? createdRow.ToEntity() : entity;
        }

        public async Task<AcademicCalendarEvent> UpdateAsync(AcademicCalendarEvent entity)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_EventId", entity.EventId, DbType.Int32);
            parameters.Add("p_Title", entity.Title, DbType.String);
            parameters.Add("p_EventType", entity.EventType, DbType.String);
            parameters.Add("p_Description", entity.Description, DbType.String);
            parameters.Add("p_StartDate", entity.StartDate, DbType.DateTime);
            parameters.Add("p_EndDate", entity.EndDate, DbType.DateTime);
            parameters.Add("p_IsAllDay", entity.IsAllDay ? 1 : 0, DbType.Int32);
            parameters.Add("p_StartTime", entity.StartTime, DbType.String);
            parameters.Add("p_EndTime", entity.EndTime, DbType.String);
            parameters.Add("p_Status", entity.Status, DbType.String);
            parameters.Add("p_CampusId", entity.CampusId > 0 ? entity.CampusId : null, DbType.Int32);
            parameters.Add("p_BoardId", entity.BoardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", entity.AcademicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", entity.AcademicLevelId > 0 ? entity.AcademicLevelId : null, DbType.Int32);
            parameters.Add("p_GroupId", entity.GroupId > 0 ? entity.GroupId : null, DbType.Int32);
            parameters.Add("p_ProgramId", entity.ProgramId > 0 ? entity.ProgramId : null, DbType.Int32);
            parameters.Add("p_SectionId", entity.SectionId > 0 ? entity.SectionId : null, DbType.Int32);
            parameters.Add("p_Location", entity.Location, DbType.String);
            parameters.Add("p_IsPublished", entity.IsPublished ? 1 : 0, DbType.Int32);
            parameters.Add("p_PublishedAt", entity.PublishedAt, DbType.DateTime);
            parameters.Add("p_PublishedBy", entity.PublishedBy, DbType.Int32);
            parameters.Add("p_UpdatedBy", entity.UpdatedBy, DbType.Int32);

            var updatedRow = await conn.QueryFirstOrDefaultAsync<AcademicCalendarDbRow>(
                "sp_UpdateAcademicCalendarEvent",
                parameters,
                commandType: CommandType.StoredProcedure);

            return updatedRow != null ? updatedRow.ToEntity() : entity;
        }

        public async Task<AcademicCalendarEvent?> PublishAsync(int eventId, int? publishedBy = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_EventId", eventId, DbType.Int32);
            parameters.Add("p_PublishedBy", publishedBy, DbType.Int32);

            var row = await conn.QueryFirstOrDefaultAsync<AcademicCalendarDbRow>(
                "sp_PublishAcademicCalendarEvent",
                parameters,
                commandType: CommandType.StoredProcedure);

            return row?.ToEntity();
        }

        public async Task<bool> DeleteAsync(int eventId, int? deletedBy = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_EventId", eventId, DbType.Int32);
            parameters.Add("p_DeletedBy", deletedBy, DbType.Int32);

            var affectedRows = await conn.ExecuteScalarAsync<int>(
                "sp_DeleteAcademicCalendarEvent",
                parameters,
                commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        private class AcademicCalendarDbRow
        {
            public int EventId { get; set; }
            public string Title { get; set; } = string.Empty;
            public string EventType { get; set; } = string.Empty;
            public string? Description { get; set; }
            public DateTime StartDate { get; set; }
            public DateTime EndDate { get; set; }
            public bool IsAllDay { get; set; }
            public string? StartTime { get; set; }
            public string? EndTime { get; set; }
            public string Status { get; set; } = string.Empty;
            public int? CampusId { get; set; }
            public string? CampusName { get; set; }
            public int BoardId { get; set; }
            public string? BoardName { get; set; }
            public int AcademicYearId { get; set; }
            public string? AcademicYearName { get; set; }
            public int? AcademicLevelId { get; set; }
            public string? AcademicLevelName { get; set; }
            public int? GroupId { get; set; }
            public string? GroupName { get; set; }
            public int? ProgramId { get; set; }
            public string? ProgramName { get; set; }
            public int? SectionId { get; set; }
            public string? SectionName { get; set; }
            public string? Location { get; set; }
            public bool IsPublished { get; set; }
            public DateTime? PublishedAt { get; set; }
            public int? PublishedBy { get; set; }
            public DateTime CreatedAt { get; set; }
            public int? CreatedBy { get; set; }
            public DateTime? UpdatedAt { get; set; }
            public int? UpdatedBy { get; set; }

            public AcademicCalendarEvent ToEntity()
            {
                var e = new AcademicCalendarEvent
                {
                    EventId = EventId,
                    Title = Title,
                    EventType = EventType,
                    Description = Description,
                    StartDate = StartDate,
                    EndDate = EndDate,
                    IsAllDay = IsAllDay,
                    StartTime = StartTime,
                    EndTime = EndTime,
                    Status = Status,
                    CampusId = CampusId,
                    BoardId = BoardId,
                    AcademicYearId = AcademicYearId,
                    AcademicLevelId = AcademicLevelId,
                    GroupId = GroupId,
                    ProgramId = ProgramId,
                    SectionId = SectionId,
                    Location = Location,
                    IsPublished = IsPublished,
                    PublishedAt = PublishedAt,
                    PublishedBy = PublishedBy,
                    CreatedAt = CreatedAt,
                    CreatedBy = CreatedBy,
                    UpdatedAt = UpdatedAt,
                    UpdatedBy = UpdatedBy,
                    IsDeleted = false
                };

                if (CampusId.HasValue && !string.IsNullOrWhiteSpace(CampusName))
                    e.Campus = new Campus { CampusId = CampusId.Value, CampusName = CampusName };

                if (!string.IsNullOrWhiteSpace(BoardName))
                    e.Board = new Board { BoardId = BoardId, BoardName = BoardName };

                if (!string.IsNullOrWhiteSpace(AcademicYearName))
                    e.AcademicYear = new AcademicYear { AcademicYearId = AcademicYearId, AcademicYearName = AcademicYearName };

                if (AcademicLevelId.HasValue && !string.IsNullOrWhiteSpace(AcademicLevelName))
                    e.AcademicLevel = new AcademicLevel { AcademicLevelId = AcademicLevelId.Value, LevelName = AcademicLevelName };

                if (GroupId.HasValue && !string.IsNullOrWhiteSpace(GroupName))
                    e.Group = new Group { GroupId = GroupId.Value, GroupName = GroupName };

                if (ProgramId.HasValue && !string.IsNullOrWhiteSpace(ProgramName))
                    e.Program = new AcademicProgram { ProgramId = ProgramId.Value, ProgramName = ProgramName };

                if (SectionId.HasValue && !string.IsNullOrWhiteSpace(SectionName))
                    e.Section = new Section { SectionId = SectionId.Value, SectionName = SectionName };

                return e;
            }
        }
    }
}
