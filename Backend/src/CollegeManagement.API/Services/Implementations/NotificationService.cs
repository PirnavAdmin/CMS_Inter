using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Notification;
using CollegeManagement.API.Hubs;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _notificationRepo;
        private readonly AppDbContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(
            INotificationRepository notificationRepo,
            AppDbContext context,
            IHubContext<NotificationHub> hubContext,
            ILogger<NotificationService> logger)
        {
            _notificationRepo = notificationRepo;
            _context = context;
            _hubContext = hubContext;
            _logger = logger;
        }

        public async Task<int> PublishEventNotificationsAsync(int eventId)
        {
            try
            {
                var calendarEvent = await _context.AcademicCalendarEvents
                    .AsNoTracking()
                    .FirstOrDefaultAsync(e => e.EventId == eventId && !e.IsDeleted);

                if (calendarEvent == null)
                {
                    _logger.LogWarning("PublishEventNotificationsAsync: Event #{EventId} not found or deleted.", eventId);
                    return 0;
                }

                _logger.LogInformation("PublishEventNotificationsAsync: Resolving audience for Event #{EventId} ('{Title}')", eventId, calendarEvent.Title);

                // 1. Resolve Matching Students
                var studentsQuery = _context.Students.AsNoTracking()
                    .Where(s => (s.CampusId != null || s.BoardId != null)); // basic validation

                if (calendarEvent.BoardId > 0)
                    studentsQuery = studentsQuery.Where(s => s.BoardId == calendarEvent.BoardId);

                if (calendarEvent.AcademicYearId > 0)
                    studentsQuery = studentsQuery.Where(s => s.AcademicYearId == calendarEvent.AcademicYearId);

                if (calendarEvent.CampusId.HasValue && calendarEvent.CampusId > 0)
                    studentsQuery = studentsQuery.Where(s => s.CampusId == calendarEvent.CampusId.Value);

                if (calendarEvent.AcademicLevelId.HasValue && calendarEvent.AcademicLevelId > 0)
                    studentsQuery = studentsQuery.Where(s => s.AcademicLevelId == calendarEvent.AcademicLevelId.Value);

                if (calendarEvent.GroupId.HasValue && calendarEvent.GroupId > 0)
                    studentsQuery = studentsQuery.Where(s => s.GroupId == calendarEvent.GroupId.Value);

                if (calendarEvent.ProgramId.HasValue && calendarEvent.ProgramId > 0)
                    studentsQuery = studentsQuery.Where(s => s.ProgramId == calendarEvent.ProgramId.Value);

                if (calendarEvent.SectionId.HasValue && calendarEvent.SectionId > 0)
                    studentsQuery = studentsQuery.Where(s => s.SectionId == calendarEvent.SectionId.Value);

                var matchedStudentIds = await studentsQuery
                    .Select(s => s.StudentId)
                    .ToListAsync();

                var targetUserIds = new HashSet<int>();

                // 2. Add Student User Accounts
                if (matchedStudentIds.Any())
                {
                    var studentUserIds = await _context.Users.AsNoTracking()
                        .Where(u => u.IsActive && u.StudentId.HasValue && matchedStudentIds.Contains(u.StudentId.Value))
                        .Select(u => u.UserId)
                        .ToListAsync();

                    foreach (var uid in studentUserIds) targetUserIds.Add(uid);

                    // 3. Add Mapped Parent User Accounts
                    var parentUserIds = await _context.ParentStudentMappings.AsNoTracking()
                        .Where(m => matchedStudentIds.Contains(m.StudentId))
                        .Select(m => m.ParentUserId)
                        .Distinct()
                        .ToListAsync();

                    if (parentUserIds.Any())
                    {
                        var activeParentUserIds = await _context.Users.AsNoTracking()
                            .Where(u => u.IsActive && parentUserIds.Contains(u.UserId))
                            .Select(u => u.UserId)
                            .ToListAsync();

                        foreach (var uid in activeParentUserIds) targetUserIds.Add(uid);
                    }
                }

                // 4. Resolve Matching Staff
                var staffIdQuery = _context.Staffs.AsNoTracking().Where(s => s.Status == "Active");

                if (calendarEvent.CampusId.HasValue && calendarEvent.CampusId > 0)
                {
                    var staffInCampus = _context.StaffCampusAssignments.AsNoTracking()
                        .Where(a => a.CampusId == calendarEvent.CampusId.Value)
                        .Select(a => a.StaffId);

                    staffIdQuery = staffIdQuery.Where(s => s.CampusId == calendarEvent.CampusId.Value || staffInCampus.Contains(s.StaffId));
                }

                if (calendarEvent.BoardId > 0)
                {
                    var staffInBoard = _context.StaffBoardAssignments.AsNoTracking()
                        .Where(b => b.BoardId == calendarEvent.BoardId)
                        .Select(b => b.StaffId);

                    staffIdQuery = staffIdQuery.Where(s => staffInBoard.Contains(s.StaffId));
                }

                var matchedStaffIds = await staffIdQuery.Select(s => s.StaffId).ToListAsync();

                if (matchedStaffIds.Any())
                {
                    var staffUserIds = await _context.Users.AsNoTracking()
                        .Where(u => u.IsActive && u.StaffId.HasValue && matchedStaffIds.Contains(u.StaffId.Value))
                        .Select(u => u.UserId)
                        .ToListAsync();

                    foreach (var uid in staffUserIds) targetUserIds.Add(uid);
                }

                // If scope is global / wide or few targeted, also notify active Admins
                var adminUserIds = await _context.Users.AsNoTracking()
                    .Where(u => u.IsActive && u.AdminId.HasValue)
                    .Select(u => u.UserId)
                    .ToListAsync();
                foreach (var uid in adminUserIds) targetUserIds.Add(uid);

                if (!targetUserIds.Any())
                {
                    _logger.LogInformation("PublishEventNotificationsAsync: No active users matched scope for event #{EventId}", eventId);
                    return 0;
                }

                // Format Message
                var dateRangeStr = calendarEvent.StartDate.Date == calendarEvent.EndDate.Date
                    ? calendarEvent.StartDate.ToString("dd MMM yyyy")
                    : $"{calendarEvent.StartDate:dd MMM yyyy} to {calendarEvent.EndDate:dd MMM yyyy}";

                var locationStr = !string.IsNullOrWhiteSpace(calendarEvent.Location) ? $" at {calendarEvent.Location}" : "";
                var timeStr = !calendarEvent.IsAllDay && !string.IsNullOrWhiteSpace(calendarEvent.StartTime) ? $" ({calendarEvent.StartTime})" : "";

                var title = $"Academic Calendar: {calendarEvent.Title}";
                var message = $"{calendarEvent.EventType} has been scheduled for {dateRangeStr}{timeStr}{locationStr}.";

                var notifications = targetUserIds.Select(uid => new Notification
                {
                    UserId = uid,
                    Title = title,
                    Message = message,
                    Type = "AcademicCalendar",
                    ReferenceId = calendarEvent.EventId,
                    ActionUrl = "/dashboard/academic-calendar",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                }).ToList();

                int insertedCount = await _notificationRepo.CreateBatchNotificationsAsync(notifications);
                _logger.LogInformation("PublishEventNotificationsAsync: Created {Count} notifications for Event #{EventId}", insertedCount, eventId);

                // Real-time broadcast via SignalR
                var notificationPayload = new
                {
                    title = title,
                    message = message,
                    type = "AcademicCalendar",
                    referenceId = calendarEvent.EventId,
                    actionUrl = "/dashboard/academic-calendar",
                    createdAt = DateTime.UtcNow
                };

                // Broadcast to AllNotifications
                await _hubContext.Clients.Group("AllNotifications").SendAsync("ReceiveNotification", notificationPayload);
                await _hubContext.Clients.All.SendAsync("AcademicCalendarEventPublished", new
                {
                    eventId = calendarEvent.EventId,
                    title = calendarEvent.Title,
                    eventType = calendarEvent.EventType,
                    startDate = calendarEvent.StartDate,
                    endDate = calendarEvent.EndDate
                });

                return insertedCount;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PublishEventNotificationsAsync failed for Event #{EventId}", eventId);
                return 0;
            }
        }

        public async Task<(List<NotificationDto> Items, int TotalCount, int UnreadCount)> GetUserNotificationsAsync(
            int userId, int page = 1, int pageSize = 20, bool? unreadOnly = null)
        {
            var (items, totalCount, unreadCount) = await _notificationRepo.GetUserNotificationsAsync(userId, page, pageSize, unreadOnly);

            var dtos = items.Select(n => new NotificationDto
            {
                NotificationId = n.NotificationId,
                UserId = n.UserId,
                Title = n.Title,
                Message = n.Message,
                Type = n.Type,
                ReferenceId = n.ReferenceId,
                ActionUrl = n.ActionUrl,
                IsRead = n.IsRead,
                ReadAt = n.ReadAt,
                CreatedAt = n.CreatedAt
            }).ToList();

            return (dtos, totalCount, unreadCount);
        }

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            return await _notificationRepo.GetUnreadCountAsync(userId);
        }

        public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
        {
            return await _notificationRepo.MarkAsReadAsync(notificationId, userId);
        }

        public async Task<bool> MarkAllAsReadAsync(int userId)
        {
            return await _notificationRepo.MarkAllAsReadAsync(userId);
        }
    }
}
