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
    }
}
