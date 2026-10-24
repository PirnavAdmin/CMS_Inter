using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class NotificationRepository : INotificationRepository
    {
        private readonly AppDbContext _context;

        public NotificationRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Notification> CreateNotificationAsync(Notification notification)
        {
            notification.CreatedAt = DateTime.UtcNow;
            await _context.Notifications.AddAsync(notification);
            await _context.SaveChangesAsync();
            return notification;
        }

        public async Task<int> CreateBatchNotificationsAsync(IEnumerable<Notification> notifications)
        {
            var list = notifications.ToList();
            if (!list.Any()) return 0;

            var now = DateTime.UtcNow;
            foreach (var n in list)
            {
                n.CreatedAt = now;
            }

            await _context.Notifications.AddRangeAsync(list);
            return await _context.SaveChangesAsync();
        }

        public async Task<(List<Notification> Items, int TotalCount, int UnreadCount)> GetUserNotificationsAsync(
            int userId, int page = 1, int pageSize = 20, bool? unreadOnly = null)
        {
            var query = _context.Notifications
                .Where(n => n.UserId == userId);

            int unreadCount = await _context.Notifications
                .CountAsync(n => n.UserId == userId && !n.IsRead);

            if (unreadOnly == true)
                query = query.Where(n => !n.IsRead);

            int totalCount = await query.CountAsync();

            int p = page > 0 ? page : 1;
            int ps = pageSize > 0 ? pageSize : 20;

            var items = await query
                .OrderByDescending(n => n.CreatedAt)
                .Skip((p - 1) * ps)
                .Take(ps)
                .AsNoTracking()
                .ToListAsync();

            return (items, totalCount, unreadCount);
        }

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            return await _context.Notifications
                .CountAsync(n => n.UserId == userId && !n.IsRead);
        }

        public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.NotificationId == notificationId && n.UserId == userId);

            if (notification == null) return false;

            if (!notification.IsRead)
            {
                notification.IsRead = true;
                notification.ReadAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return true;
        }

        public async Task<bool> MarkAllAsReadAsync(int userId)
        {
            var unreadNotifications = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            if (!unreadNotifications.Any()) return true;

            var now = DateTime.UtcNow;
            foreach (var n in unreadNotifications)
            {
                n.IsRead = true;
                n.ReadAt = now;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<Notification?> GetByIdAsync(int notificationId)
        {
            return await _context.Notifications
                .AsNoTracking()
                .FirstOrDefaultAsync(n => n.NotificationId == notificationId);
        }
    }
}
