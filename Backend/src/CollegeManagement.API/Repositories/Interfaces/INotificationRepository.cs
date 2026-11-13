using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface INotificationRepository
    {
        Task<Notification> CreateNotificationAsync(Notification notification);
        Task<int> CreateBatchNotificationsAsync(IEnumerable<Notification> notifications);
        Task<(List<Notification> Items, int TotalCount, int UnreadCount)> GetUserNotificationsAsync(int userId, int page = 1, int pageSize = 20, bool? unreadOnly = null);
        Task<List<Notification>> GetActiveUnreadNotificationsAsync(int userId);
        Task<List<Notification>> GetActiveUnreadByGroupKeyAsync(int userId, string groupKey);
        Task<(List<Notification> Items, int UnreadCount)> GetLatestNotificationHistoryAsync(int userId, int limit = 10);
        Task<int> GetUnreadCountAsync(int userId);
        Task<bool> MarkAsReadAsync(int notificationId, int userId);
        Task<(bool Marked, string? GroupKey, List<int> MarkedIds)> MarkNotificationOrGroupAsReadAsync(int notificationId, int userId);
        Task<(bool Marked, List<int> MarkedIds)> MarkGroupAsReadAsync(string groupKey, int userId);
        Task<bool> MarkAllAsReadAsync(int userId);
        Task<Notification?> GetByIdAsync(int notificationId);
        Task<int> EnforceUserHistoryRetentionAsync(int userId, DateTime? utcNow = null);
        Task<int> PurgeAllExpiredHistoryAsync(DateTime? utcNow = null);
    }
}
