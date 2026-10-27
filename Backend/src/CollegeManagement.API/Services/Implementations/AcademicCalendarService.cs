using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.AcademicCalendar;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class AcademicCalendarService : IAcademicCalendarService
    {
        private readonly IAcademicCalendarRepository _repository;
        private readonly INotificationService _notificationService;
        private readonly ILogger<AcademicCalendarService> _logger;

        public AcademicCalendarService(
            IAcademicCalendarRepository repository,
            INotificationService notificationService,
            ILogger<AcademicCalendarService> logger)
        {
            _repository = repository;
            _notificationService = notificationService;
            _logger = logger;
        }

        private static AcademicCalendarEventResponseDto MapToDto(AcademicCalendarEvent e)
        {
            return new AcademicCalendarEventResponseDto
            {
                EventId = e.EventId,
                Title = e.Title,
                EventType = e.EventType,
                Description = e.Description,
                StartDate = e.StartDate,
                EndDate = e.EndDate,
                IsAllDay = e.IsAllDay,
                StartTime = e.StartTime,
                EndTime = e.EndTime,
                Status = e.Status,

                CampusId = e.CampusId,
                CampusName = e.Campus?.CampusName,

                BoardId = e.BoardId,
                BoardName = e.Board?.BoardName,

                AcademicYearId = e.AcademicYearId,
                AcademicYearName = e.AcademicYear?.AcademicYearName,

                AcademicLevelId = e.AcademicLevelId,
                AcademicLevelName = e.AcademicLevel?.LevelName,

                GroupId = e.GroupId,
                GroupName = e.Group?.GroupName,

                ProgramId = e.ProgramId,
                ProgramName = e.Program?.ProgramName,

                SectionId = e.SectionId,
                SectionName = e.Section?.SectionName,

                Location = e.Location,
                IsPublished = e.IsPublished,
                PublishedAt = e.PublishedAt,
                PublishedBy = e.PublishedBy,
                CreatedAt = e.CreatedAt,
                CreatedBy = e.CreatedBy,
                UpdatedAt = e.UpdatedAt,
                UpdatedBy = e.UpdatedBy
            };
        }

        public async Task<(List<AcademicCalendarEventResponseDto> Items, int TotalCount, int TotalPages)> GetPagedEventsAsync(AcademicCalendarFilterDto filter)
        {
            var (items, totalCount) = await _repository.GetPagedEventsAsync(filter);
            var dtos = items.Select(MapToDto).ToList();
            int pageSize = filter.PageSize > 0 ? filter.PageSize : 50;
            int totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            return (dtos, totalCount, totalPages);
        }

        public async Task<List<AcademicCalendarEventResponseDto>> GetEventsByRangeAsync(
            DateTime startDate,
            DateTime endDate,
            int? boardId = null,
            int? academicYearId = null,
            int? campusId = null,
            int? academicLevelId = null,
            int? groupId = null)
        {
            var items = await _repository.GetEventsByRangeAsync(startDate, endDate, boardId, academicYearId, campusId, academicLevelId, groupId);
            return items.Select(MapToDto).ToList();
        }

        public async Task<AcademicCalendarEventResponseDto?> GetByIdAsync(int eventId)
        {
            var entity = await _repository.GetByIdAsync(eventId);
            return entity == null ? null : MapToDto(entity);
        }

        public async Task<AcademicCalendarMetricsDto> GetMetricsAsync(int? academicYearId, int? boardId, int? campusId)
        {
            return await _repository.GetMetricsAsync(academicYearId, boardId, campusId);
        }

        public async Task<List<AcademicCalendarEventResponseDto>> GetUpcomingEventsAsync(int? academicYearId, int? boardId, int? campusId, int count = 5)
        {
            var items = await _repository.GetUpcomingEventsAsync(academicYearId, boardId, campusId, count);
            return items.Select(MapToDto).ToList();
        }

        public async Task<AcademicCalendarEventResponseDto> CreateEventAsync(CreateAcademicCalendarEventDto dto, int? userId = null)
        {
            bool isPublished = dto.Status.Equals("Published", StringComparison.OrdinalIgnoreCase);

            var entity = new AcademicCalendarEvent
            {
                Title = dto.Title.Trim(),
                EventType = dto.EventType.Trim(),
                Description = dto.Description?.Trim(),
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                IsAllDay = dto.IsAllDay,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                Status = isPublished ? "Published" : (string.IsNullOrWhiteSpace(dto.Status) ? "Draft" : dto.Status),
                CampusId = dto.CampusId > 0 ? dto.CampusId : null,
                BoardId = dto.BoardId,
                AcademicYearId = dto.AcademicYearId,
                AcademicLevelId = dto.AcademicLevelId > 0 ? dto.AcademicLevelId : null,
                GroupId = dto.GroupId > 0 ? dto.GroupId : null,
                ProgramId = dto.ProgramId > 0 ? dto.ProgramId : null,
                SectionId = dto.SectionId > 0 ? dto.SectionId : null,
                Location = dto.Location?.Trim(),
                IsPublished = isPublished,
                PublishedAt = isPublished ? DateTime.UtcNow : null,
                PublishedBy = isPublished ? userId : null,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            var created = await _repository.CreateAsync(entity);

            // Re-fetch with navigations
            var saved = await _repository.GetByIdAsync(created.EventId) ?? created;

            if (isPublished)
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _notificationService.PublishEventNotificationsAsync(created.EventId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Background notification dispatch failed for created event #{EventId}", created.EventId);
                    }
                });
            }

            return MapToDto(saved);
        }

        public async Task<AcademicCalendarEventResponseDto?> UpdateEventAsync(int eventId, UpdateAcademicCalendarEventDto dto, int? userId = null)
        {
            var entity = await _repository.GetByIdAsync(eventId);
            if (entity == null || entity.IsDeleted) return null;

            bool wasPublished = entity.IsPublished;
            bool isNowPublished = dto.Status.Equals("Published", StringComparison.OrdinalIgnoreCase);

            entity.Title = dto.Title.Trim();
            entity.EventType = dto.EventType.Trim();
            entity.Description = dto.Description?.Trim();
            entity.StartDate = dto.StartDate;
            entity.EndDate = dto.EndDate;
            entity.IsAllDay = dto.IsAllDay;
            entity.StartTime = dto.StartTime;
            entity.EndTime = dto.EndTime;
            entity.Status = isNowPublished ? "Published" : dto.Status;
            entity.CampusId = dto.CampusId > 0 ? dto.CampusId : null;
            entity.BoardId = dto.BoardId;
            entity.AcademicYearId = dto.AcademicYearId;
            entity.AcademicLevelId = dto.AcademicLevelId > 0 ? dto.AcademicLevelId : null;
            entity.GroupId = dto.GroupId > 0 ? dto.GroupId : null;
            entity.ProgramId = dto.ProgramId > 0 ? dto.ProgramId : null;
            entity.SectionId = dto.SectionId > 0 ? dto.SectionId : null;
            entity.Location = dto.Location?.Trim();
            entity.UpdatedBy = userId;
            entity.UpdatedAt = DateTime.UtcNow;

            if (!wasPublished && isNowPublished)
            {
                entity.IsPublished = true;
                entity.PublishedAt = DateTime.UtcNow;
                entity.PublishedBy = userId;
            }

            var updated = await _repository.UpdateAsync(entity);
            var refreshed = await _repository.GetByIdAsync(updated.EventId) ?? updated;

            if (!wasPublished && isNowPublished)
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _notificationService.PublishEventNotificationsAsync(updated.EventId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Background notification dispatch failed for updated event #{EventId}", updated.EventId);
                    }
                });
            }

            return MapToDto(refreshed);
        }

        public async Task<AcademicCalendarEventResponseDto?> PublishEventAsync(int eventId, int? userId = null)
        {
            var entity = await _repository.GetByIdAsync(eventId);
            if (entity == null || entity.IsDeleted) return null;

            entity.Status = "Published";
            entity.IsPublished = true;
            entity.PublishedAt = DateTime.UtcNow;
            entity.PublishedBy = userId;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;

            var updated = await _repository.UpdateAsync(entity);
            var refreshed = await _repository.GetByIdAsync(updated.EventId) ?? updated;

            _ = Task.Run(async () =>
            {
                try
                {
                    await _notificationService.PublishEventNotificationsAsync(updated.EventId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Background notification dispatch failed for publish event #{EventId}", updated.EventId);
                }
            });

            return MapToDto(refreshed);
        }

        public async Task<bool> DeleteEventAsync(int eventId, int? userId = null)
        {
            return await _repository.DeleteAsync(eventId, userId);
        }

        public async Task<byte[]> ExportCsvAsync(AcademicCalendarFilterDto filter)
        {
            filter.Page = 1;
            filter.PageSize = 10000; // fetch all matching
            var (items, _) = await _repository.GetPagedEventsAsync(filter);

            var sb = new StringBuilder();
            sb.AppendLine("EventId,Title,EventType,StartDate,EndDate,IsAllDay,StartTime,EndTime,Status,Board,AcademicYear,Campus,AcademicLevel,Group,Location");

            foreach (var e in items)
            {
                sb.AppendLine(string.Format("\"{0}\",\"{1}\",\"{2}\",\"{3:yyyy-MM-dd}\",\"{4:yyyy-MM-dd}\",\"{5}\",\"{6}\",\"{7}\",\"{8}\",\"{9}\",\"{10}\",\"{11}\",\"{12}\",\"{13}\",\"{14}\"",
                    e.EventId,
                    e.Title.Replace("\"", "\"\""),
                    e.EventType.Replace("\"", "\"\""),
                    e.StartDate,
                    e.EndDate,
                    e.IsAllDay,
                    e.StartTime ?? "",
                    e.EndTime ?? "",
                    e.Status,
                    (e.Board?.BoardName ?? "").Replace("\"", "\"\""),
                    (e.AcademicYear?.AcademicYearName ?? "").Replace("\"", "\"\""),
                    (e.Campus?.CampusName ?? "").Replace("\"", "\"\""),
                    (e.AcademicLevel?.LevelName ?? "").Replace("\"", "\"\""),
                    (e.Group?.GroupName ?? "").Replace("\"", "\"\""),
                    (e.Location ?? "").Replace("\"", "\"\"")
                ));
            }

            return Encoding.UTF8.GetBytes(sb.ToString());
        }
    }
}
