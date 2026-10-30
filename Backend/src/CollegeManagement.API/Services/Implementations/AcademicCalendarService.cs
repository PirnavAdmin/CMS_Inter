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
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class AcademicCalendarService : IAcademicCalendarService
    {
        private readonly IAcademicCalendarRepository _repository;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<AcademicCalendarService> _logger;

        public AcademicCalendarService(
            IAcademicCalendarRepository repository,
            IServiceScopeFactory scopeFactory,
            ILogger<AcademicCalendarService> logger)
        {
            _repository = repository;
            _scopeFactory = scopeFactory;
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

            // SP handles insertion and returns the full projected record with navigation objects in 1 round trip
            var created = await _repository.CreateAsync(entity);

            if (isPublished)
            {
                DispatchNotificationInBackground(created.EventId);
            }

            return MapToDto(created);
        }

        public async Task<AcademicCalendarEventResponseDto?> UpdateEventAsync(int eventId, UpdateAcademicCalendarEventDto dto, int? userId = null)
        {
            var existing = await _repository.GetByIdAsync(eventId);
            if (existing == null || existing.IsDeleted) return null;

            bool wasPublished = existing.IsPublished;
            bool isNowPublished = dto.Status.Equals("Published", StringComparison.OrdinalIgnoreCase);

            existing.Title = dto.Title.Trim();
            existing.EventType = dto.EventType.Trim();
            existing.Description = dto.Description?.Trim();
            existing.StartDate = dto.StartDate;
            existing.EndDate = dto.EndDate;
            existing.IsAllDay = dto.IsAllDay;
            existing.StartTime = dto.StartTime;
            existing.EndTime = dto.EndTime;
            existing.Status = isNowPublished ? "Published" : dto.Status;
            existing.CampusId = dto.CampusId > 0 ? dto.CampusId : null;
            existing.BoardId = dto.BoardId;
            existing.AcademicYearId = dto.AcademicYearId;
            existing.AcademicLevelId = dto.AcademicLevelId > 0 ? dto.AcademicLevelId : null;
            existing.GroupId = dto.GroupId > 0 ? dto.GroupId : null;
            existing.ProgramId = dto.ProgramId > 0 ? dto.ProgramId : null;
            existing.SectionId = dto.SectionId > 0 ? dto.SectionId : null;
            existing.Location = dto.Location?.Trim();
            existing.UpdatedBy = userId;
            existing.UpdatedAt = DateTime.UtcNow;

            if (!wasPublished && isNowPublished)
            {
                existing.IsPublished = true;
                existing.PublishedAt = DateTime.UtcNow;
                existing.PublishedBy = userId;
            }

            // SP updates and returns the refreshed record with navigation objects in 1 round trip
            var updated = await _repository.UpdateAsync(existing);

            if (!wasPublished && isNowPublished)
            {
                DispatchNotificationInBackground(updated.EventId);
            }

            return MapToDto(updated);
        }

        public async Task<AcademicCalendarEventResponseDto?> PublishEventAsync(int eventId, int? userId = null)
        {
            var updated = await _repository.PublishAsync(eventId, userId);
            if (updated == null) return null;

            DispatchNotificationInBackground(updated.EventId);

            return MapToDto(updated);
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

        private void DispatchNotificationInBackground(int eventId)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
                    await notificationService.PublishEventNotificationsAsync(eventId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Background notification dispatch failed for academic calendar event #{EventId}", eventId);
                }
            });
        }
    }
}
