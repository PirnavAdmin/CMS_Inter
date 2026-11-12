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

                    // 3. Add Mapped Parent User Accounts via Stored Procedure
                    var conn = _context.Database.GetDbConnection();
                    if (conn.State != System.Data.ConnectionState.Open)
                    {
                        await conn.OpenAsync();
                    }
                    var activeParentUserIds = (await Dapper.SqlMapper.QueryAsync<int>(
                        conn,
                        "sp_GetParentUserIdsForStudents",
                        new { p_StudentIds = string.Join(",", matchedStudentIds) },
                        commandType: System.Data.CommandType.StoredProcedure)).ToList();

                    foreach (var uid in activeParentUserIds) targetUserIds.Add(uid);
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

                // If scope is global / wide or few targeted, also notify active Admins of the same college
                int? eventCollegeId = null;
                if (calendarEvent.CampusId.HasValue && calendarEvent.CampusId > 0)
                {
                    eventCollegeId = await GetCampusCollegeIdAsync(calendarEvent.CampusId.Value);
                }

                var adminQuery = _context.Users.AsNoTracking()
                    .Where(u => u.IsActive && (u.AdminId.HasValue || (u.Role != null && u.Role.RoleName.ToLower().Contains("admin"))));

                if (eventCollegeId.HasValue && eventCollegeId.Value > 0)
                {
                    int targetCollege = eventCollegeId.Value;
                    adminQuery = adminQuery.Where(u => (u.CollegeId ?? 1) == targetCollege);
                }
                else
                {
                    adminQuery = adminQuery.Where(u => !u.CollegeId.HasValue || u.CollegeId.Value <= 1);
                }

                var adminUserIds = await adminQuery
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

            if (totalCount == 0 && page == 1)
            {
                var userCollegeId = await _context.Users.AsNoTracking()
                    .Where(u => u.UserId == userId)
                    .Select(u => u.CollegeId)
                    .FirstOrDefaultAsync();

                if (!userCollegeId.HasValue || userCollegeId.Value <= 1)
                {
                    await SeedInitialNotificationsForUserAsync(userId);
                    (items, totalCount, unreadCount) = await _notificationRepo.GetUserNotificationsAsync(userId, page, pageSize, unreadOnly);
                }
            }

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
            var count = await _notificationRepo.GetUnreadCountAsync(userId);
            if (count == 0)
            {
                var userCollegeId = await _context.Users.AsNoTracking()
                    .Where(u => u.UserId == userId)
                    .Select(u => u.CollegeId)
                    .FirstOrDefaultAsync();

                if (!userCollegeId.HasValue || userCollegeId.Value <= 1)
                {
                    var total = (await _notificationRepo.GetUserNotificationsAsync(userId, 1, 1)).TotalCount;
                    if (total == 0)
                    {
                        await SeedInitialNotificationsForUserAsync(userId);
                        count = await _notificationRepo.GetUnreadCountAsync(userId);
                    }
                }
            }
            return count;
        }

        private async Task SeedInitialNotificationsForUserAsync(int userId)
        {
            try
            {
                var user = await _context.Users.AsNoTracking().Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == userId);
                if (user == null) return;

                var now = DateTime.UtcNow;
                var list = new List<Notification>();
                var roleName = user.Role?.RoleName?.ToLowerInvariant() ?? "";

                if (roleName.Contains("admin") || roleName.Contains("principal") || roleName.Contains("exam"))
                {
                    list.Add(new Notification
                    {
                        UserId = userId,
                        Title = "New Certificate Request",
                        Message = "Sahithi R (ADM-52) submitted a request for Conduct Certificate.",
                        Type = "Certificate",
                        ActionUrl = "/dashboard/certificates",
                        IsRead = false,
                        CreatedAt = now.AddMinutes(-15)
                    });
                    list.Add(new Notification
                    {
                        UserId = userId,
                        Title = "Staff Reimbursement Claim",
                        Message = "New travel allowance reimbursement claim pending your review.",
                        Type = "Finance",
                        ActionUrl = "/dashboard/reimbursements",
                        IsRead = false,
                        CreatedAt = now.AddHours(-2)
                    });
                    list.Add(new Notification
                    {
                        UserId = userId,
                        Title = "Academic Calendar Published",
                        Message = "Mid-Term Examination schedule has been published for all campuses.",
                        Type = "Academic",
                        ActionUrl = "/dashboard/academic-calendar",
                        IsRead = true,
                        CreatedAt = now.AddDays(-1)
                    });
                }
                else if (roleName.Contains("student"))
                {
                    list.Add(new Notification
                    {
                        UserId = userId,
                        Title = "Examination Schedule",
                        Message = "Semester Mid-Term Examinations announced. Hall tickets will be issued shortly.",
                        Type = "Exam",
                        ActionUrl = "/student-dashboard/examinations",
                        IsRead = false,
                        CreatedAt = now.AddHours(-1)
                    });
                    list.Add(new Notification
                    {
                        UserId = userId,
                        Title = "Fee Payment Reminder",
                        Message = "Semester tuition fee payment deadline is approaching.",
                        Type = "Finance",
                        ActionUrl = "/student-dashboard",
                        IsRead = false,
                        CreatedAt = now.AddDays(-2)
                    });
                }
                else if (roleName.Contains("faculty") || roleName.Contains("teacher"))
                {
                    list.Add(new Notification
                    {
                        UserId = userId,
                        Title = "Examination Duty Assigned",
                        Message = "You have been assigned invigilation duty for the upcoming exams.",
                        Type = "Exam",
                        ActionUrl = "/faculty-dashboard",
                        IsRead = false,
                        CreatedAt = now.AddHours(-3)
                    });
                    list.Add(new Notification
                    {
                        UserId = userId,
                        Title = "Leave Balances Updated",
                        Message = "Your casual and earned leave credits for this semester are now active.",
                        Type = "Leave",
                        ActionUrl = "/faculty-dashboard/leave",
                        IsRead = true,
                        CreatedAt = now.AddDays(-1)
                    });
                }
                else if (roleName.Contains("accountant"))
                {
                    list.Add(new Notification
                    {
                        UserId = userId,
                        Title = "Pending Fee Approvals",
                        Message = "5 fee payment transactions require reconciliation.",
                        Type = "Finance",
                        ActionUrl = "/accountant-dashboard/fees",
                        IsRead = false,
                        CreatedAt = now.AddMinutes(-30)
                    });
                }
                else
                {
                    list.Add(new Notification
                    {
                        UserId = userId,
                        Title = "Welcome to CMS Portal",
                        Message = "Your college management workspace notifications are active.",
                        Type = "General",
                        ActionUrl = "/dashboard",
                        IsRead = false,
                        CreatedAt = now
                    });
                }

                if (list.Any())
                {
                    await _notificationRepo.CreateBatchNotificationsAsync(list);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to auto-seed welcome notifications for User {UserId}", userId);
            }
        }

        public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
        {
            return await _notificationRepo.MarkAsReadAsync(notificationId, userId);
        }

        public async Task<bool> MarkAllAsReadAsync(int userId)
        {
            return await _notificationRepo.MarkAllAsReadAsync(userId);
        }

        public async Task<NotificationDto> SendToUserAsync(
            int userId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            var notification = new Notification
            {
                UserId = userId,
                Title = title,
                Message = message,
                Type = type,
                ReferenceId = referenceId,
                ActionUrl = actionUrl,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            var created = await _notificationRepo.CreateNotificationAsync(notification);

            var dto = new NotificationDto
            {
                NotificationId = created.NotificationId,
                UserId = created.UserId,
                Title = created.Title,
                Message = created.Message,
                Type = created.Type,
                ReferenceId = created.ReferenceId,
                ActionUrl = created.ActionUrl,
                IsRead = created.IsRead,
                CreatedAt = created.CreatedAt
            };

            try
            {
                await _hubContext.Clients.Group($"User_{userId}").SendAsync("ReceiveNotification", dto);
                await _hubContext.Clients.Group($"User_{userId}").SendAsync("NotificationReceived", new { type, notificationId = created.NotificationId, title });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to broadcast notification to User_{UserId}", userId);
            }

            return dto;
        }

        public async Task<int> SendToUsersAsync(
            IEnumerable<int> userIds, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            var distinctIds = userIds.Distinct().ToList();
            if (!distinctIds.Any()) return 0;

            var now = DateTime.UtcNow;
            var notifications = distinctIds.Select(uid => new Notification
            {
                UserId = uid,
                Title = title,
                Message = message,
                Type = type,
                ReferenceId = referenceId,
                ActionUrl = actionUrl,
                IsRead = false,
                CreatedAt = now
            }).ToList();

            int count = await _notificationRepo.CreateBatchNotificationsAsync(notifications);

            foreach (var notif in notifications)
            {
                var payload = new
                {
                    notificationId = notif.NotificationId,
                    userId = notif.UserId,
                    title = notif.Title,
                    message = notif.Message,
                    type = notif.Type,
                    referenceId = notif.ReferenceId,
                    actionUrl = notif.ActionUrl,
                    isRead = false,
                    createdAt = notif.CreatedAt
                };

                try
                {
                    await _hubContext.Clients.Group($"User_{notif.UserId}").SendAsync("ReceiveNotification", payload);
                    await _hubContext.Clients.Group($"User_{notif.UserId}").SendAsync("NotificationReceived", payload);
                }
                catch { }
            }

            return count;
        }

        private async Task<int?> GetCampusCollegeIdAsync(int campusId)
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
            {
                await conn.OpenAsync();
            }
            return await Dapper.SqlMapper.QueryFirstOrDefaultAsync<int?>(
                conn,
                "SELECT CollegeId FROM Campuses WHERE CampusId = @CampusId;",
                new { CampusId = campusId });
        }

        private async Task<List<int>> ResolveRoleUserIdsAsync(IEnumerable<string> roles, int? campusId)
        {
            var roleList = (roles ?? Enumerable.Empty<string>())
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .Select(r => r.Trim().ToLowerInvariant())
                .Distinct()
                .ToList();

            if (!roleList.Any()) return new List<int>();

            bool wantsAdmin = roleList.Any(r => r.Contains("admin"));
            var nonAdminRoles = roleList.Where(r => !r.Contains("admin")).ToList();

            int? targetCollegeId = null;
            if (campusId.HasValue && campusId.Value > 0)
            {
                targetCollegeId = await GetCampusCollegeIdAsync(campusId.Value);
            }

            var activeUsers = await _context.Users.AsNoTracking()
                .Where(u => u.IsActive)
                .Select(u => new
                {
                    u.UserId,
                    u.CollegeId,
                    RoleName = u.Role != null ? u.Role.RoleName : string.Empty,
                    HasAdminId = u.AdminId.HasValue,
                    StaffCampusId = u.Staff != null ? u.Staff.CampusId : null,
                    StudentCampusId = u.Student != null ? u.Student.CampusId : null
                })
                .ToListAsync();

            return activeUsers
                .Where(u =>
                {
                    var rLower = (u.RoleName ?? string.Empty).Trim().ToLowerInvariant();
                    bool roleMatched =
                        (wantsAdmin && (u.HasAdminId || rLower.Contains("admin"))) ||
                        (!string.IsNullOrEmpty(rLower) && nonAdminRoles.Any(rl => rLower == rl || rLower.Contains(rl) || rl.Contains(rLower)));

                    if (!roleMatched) return false;

                    if (campusId.HasValue && campusId.Value > 0)
                    {
                        bool sameCollege = targetCollegeId.HasValue && targetCollegeId.Value > 0
                            ? (u.CollegeId ?? 1) == targetCollegeId.Value
                            : (!u.CollegeId.HasValue || u.CollegeId.Value <= 1);

                        bool campusMatched =
                            u.StaffCampusId == campusId.Value ||
                            u.StudentCampusId == campusId.Value ||
                            (sameCollege && (u.HasAdminId || rLower.Contains("admin") || rLower == "principal"));
                        if (!campusMatched) return false;
                    }
                    else
                    {
                        // Without a campusId, only notify legacy/default college admins to avoid cross-tenant leaks
                        if (u.CollegeId.HasValue && u.CollegeId.Value > 1) return false;
                    }
                    return true;
                })
                .Select(u => u.UserId)
                .Distinct()
                .ToList();
        }

        public async Task<int> SendToRoleAsync(
            string role, int? campusId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            try
            {
                var userIds = await ResolveRoleUserIdsAsync(new[] { role }, campusId);
                if (userIds.Any())
                {
                    return await SendToUsersAsync(userIds, title, message, type, referenceId, actionUrl);
                }
                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendToRoleAsync failed for role {Role}", role);
                return 0;
            }
        }

        public async Task<int> SendToCampusAsync(
            int campusId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            try
            {
                var targetCollegeId = await GetCampusCollegeIdAsync(campusId);
                int resolvedCollege = targetCollegeId.HasValue && targetCollegeId.Value > 0 ? targetCollegeId.Value : 1;

                var query = _context.Users.AsNoTracking()
                    .Include(u => u.Role)
                    .Include(u => u.Staff)
                    .Include(u => u.Student)
                    .Where(u => u.IsActive && (
                        (u.Staff != null && u.Staff.CampusId == campusId) ||
                        (u.Student != null && u.Student.CampusId == campusId) ||
                        ((u.CollegeId ?? 1) == resolvedCollege && (u.AdminId.HasValue || (u.Role != null && u.Role.RoleName.ToLower().Contains("admin"))))));

                var userIds = await query.Select(u => u.UserId).ToListAsync();
                if (userIds.Any())
                {
                    await SendToUsersAsync(userIds, title, message, type, referenceId, actionUrl);
                }

                var payload = new
                {
                    title,
                    message,
                    type,
                    referenceId,
                    actionUrl,
                    campusId,
                    isRead = false,
                    createdAt = DateTime.UtcNow
                };

                await _hubContext.Clients.Group($"Campus_{campusId}").SendAsync("ReceiveNotification", payload);
                await _hubContext.Clients.Group($"Campus_{campusId}").SendAsync("NotificationReceived", new { type, title });

                return userIds.Count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendToCampusAsync failed for campus #{CampusId}", campusId);
                return 0;
            }
        }

        public async Task<int> SendGlobalAsync(
            string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            try
            {
                var userIds = await _context.Users.AsNoTracking()
                    .Where(u => u.IsActive)
                    .Select(u => u.UserId)
                    .ToListAsync();

                if (userIds.Any())
                {
                    await SendToUsersAsync(userIds, title, message, type, referenceId, actionUrl);
                }

                var payload = new
                {
                    title,
                    message,
                    type,
                    referenceId,
                    actionUrl,
                    isRead = false,
                    createdAt = DateTime.UtcNow
                };

                await _hubContext.Clients.Group("AllNotifications").SendAsync("ReceiveNotification", payload);
                await _hubContext.Clients.Group("AllNotifications").SendAsync("NotificationReceived", new { type, title });

                return userIds.Count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendGlobalAsync failed");
                return 0;
            }
        }

        public async Task<int> SendToRolesAsync(
            IEnumerable<string> roles, int? campusId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            try
            {
                var distinctUserIds = await ResolveRoleUserIdsAsync(roles, campusId);
                if (!distinctUserIds.Any()) return 0;
                return await SendToUsersAsync(distinctUserIds, title, message, type, referenceId, actionUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendToRolesAsync failed");
                return 0;
            }
        }

        public async Task<int> SendToStaffAsync(
            int staffId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            try
            {
                var userIds = await _context.Users.AsNoTracking()
                    .Where(u => u.IsActive && u.StaffId == staffId)
                    .Select(u => u.UserId)
                    .ToListAsync();

                if (userIds.Any())
                {
                    return await SendToUsersAsync(userIds, title, message, type, referenceId, actionUrl);
                }

                try
                {
                    var payload = new
                    {
                        title,
                        message,
                        type,
                        referenceId,
                        actionUrl,
                        isRead = false,
                        createdAt = DateTime.UtcNow
                    };
                    await _hubContext.Clients.Group($"Staff_{staffId}").SendAsync("ReceiveNotification", payload);
                    await _hubContext.Clients.Group($"Staff_{staffId}").SendAsync("NotificationReceived", payload);
                }
                catch { }

                return userIds.Count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendToStaffAsync failed for StaffId {StaffId}", staffId);
                return 0;
            }
        }

        public async Task<int> SendToStaffListAsync(
            IEnumerable<int> staffIds, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            try
            {
                var distinctStaffIds = staffIds.Distinct().ToList();
                if (!distinctStaffIds.Any()) return 0;

                var userIds = await _context.Users.AsNoTracking()
                    .Where(u => u.IsActive && u.StaffId.HasValue && distinctStaffIds.Contains(u.StaffId.Value))
                    .Select(u => u.UserId)
                    .ToListAsync();

                if (userIds.Any())
                {
                    await SendToUsersAsync(userIds, title, message, type, referenceId, actionUrl);
                }

                foreach (var sid in distinctStaffIds)
                {
                    try
                    {
                        await _hubContext.Clients.Group($"Staff_{sid}").SendAsync("NotificationReceived", new { type, title });
                    }
                    catch { }
                }

                return userIds.Count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendToStaffListAsync failed");
                return 0;
            }
        }

        public async Task<int> SendToStudentAsync(
            int studentId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            try
            {
                var userIds = await _context.Users.AsNoTracking()
                    .Where(u => u.IsActive && u.StudentId == studentId)
                    .Select(u => u.UserId)
                    .ToListAsync();

                if (userIds.Any())
                {
                    await SendToUsersAsync(userIds, title, message, type, referenceId, actionUrl);
                }

                return userIds.Count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendToStudentAsync failed for StudentId {StudentId}", studentId);
                return 0;
            }
        }

        public async Task<int> SendToStudentsAsync(
            IEnumerable<int> studentIds, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            try
            {
                var distinct = studentIds.Distinct().ToList();
                if (!distinct.Any()) return 0;

                var userIds = await _context.Users.AsNoTracking()
                    .Where(u => u.IsActive && u.StudentId.HasValue && distinct.Contains(u.StudentId.Value))
                    .Select(u => u.UserId)
                    .ToListAsync();

                if (userIds.Any())
                {
                    await SendToUsersAsync(userIds, title, message, type, referenceId, actionUrl);
                }

                return userIds.Count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendToStudentsAsync failed");
                return 0;
            }
        }
    }
}
