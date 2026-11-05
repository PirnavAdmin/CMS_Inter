using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Notification;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface INotificationService
    {
        Task<int> PublishEventNotificationsAsync(int eventId);
        Task<(List<NotificationDto> Items, int TotalCount, int UnreadCount)> GetUserNotificationsAsync(int userId, int page = 1, int pageSize = 20, bool? unreadOnly = null);
        Task<int> GetUnreadCountAsync(int userId);
        Task<bool> MarkAsReadAsync(int notificationId, int userId);
        Task<bool> MarkAllAsReadAsync(int userId);

        // Centralized Dispatcher Methods
        Task<NotificationDto> SendToUserAsync(int userId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null);
        Task<int> SendToUsersAsync(IEnumerable<int> userIds, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null);
        Task<int> SendToRoleAsync(string role, int? campusId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null);
        Task<int> SendToRolesAsync(IEnumerable<string> roles, int? campusId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null);
        Task<int> SendToStaffAsync(int staffId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null);
        Task<int> SendToStaffListAsync(IEnumerable<int> staffIds, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null);
        Task<int> SendToStudentAsync(int studentId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null);
        Task<int> SendToStudentsAsync(IEnumerable<int> studentIds, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null);
        Task<int> SendToCampusAsync(int campusId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null);
        Task<int> SendGlobalAsync(string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null);
    }
}
