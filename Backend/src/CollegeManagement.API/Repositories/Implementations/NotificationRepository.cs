using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class NotificationRepository : INotificationRepository
    {
        public const int MaxHistoryRecordsPerUser = 10;
        public const int HistoryInactivityDays = 30;

        private readonly AppDbContext _context;

        public NotificationRepository(AppDbContext context)
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

        private IDbTransaction? GetAmbientDbTransaction()
        {
            return _context.Database.CurrentTransaction?.GetDbTransaction();
        }

        private static string EnsureGroupKey(Notification notification)
        {
            if (!string.IsNullOrWhiteSpace(notification.GroupKey))
            {
                return notification.GroupKey;
            }
            notification.GroupKey = NotificationGroupingHelper.ResolveGroupKey(
                notification.Type,
                notification.Title,
                notification.ActionUrl);
            return notification.GroupKey;
        }

        private async Task PurgeExpiredHistoryForUsersBeforeInsertAsync(IEnumerable<int> userIds, DateTime nowUtc)
        {
            var ids = userIds.Where(id => id > 0).Distinct().ToList();
            if (ids.Count == 0) return;

            var cutoffUtc = nowUtc.AddDays(-HistoryInactivityDays);
            var conn = await GetOpenConnectionAsync();
            var ambientTx = GetAmbientDbTransaction();

            const string sql = @"
DELETE n
FROM Notifications n
INNER JOIN (
    SELECT UserId
    FROM Notifications
    WHERE UserId IN @UserIds
    GROUP BY UserId
    HAVING MAX(CreatedAt) < @CutoffUtc
) expired ON expired.UserId = n.UserId
WHERE n.IsRead = 1;";

            await conn.ExecuteAsync(sql, new { UserIds = ids, CutoffUtc = cutoffUtc }, ambientTx);
        }

        public async Task<Notification> CreateNotificationAsync(Notification notification)
        {
            var now = DateTime.UtcNow;
            notification.CreatedAt = now;
            string groupKey = EnsureGroupKey(notification);

            await PurgeExpiredHistoryForUsersBeforeInsertAsync(new[] { notification.UserId }, now);

            // Prevent duplicate DB rows / inflated counts when the same logical request re-triggers an unread notification
            if (notification.ReferenceId.HasValue && notification.ReferenceId.Value > 0)
            {
                var conn = await GetOpenConnectionAsync();
                var ambientTx = GetAmbientDbTransaction();
                var existingId = await conn.ExecuteScalarAsync<int?>(
                    @"SELECT NotificationId
                      FROM Notifications
                      WHERE UserId = @UserId
                        AND IsRead = 0
                        AND GroupKey = @GroupKey
                        AND ReferenceId = @ReferenceId
                      ORDER BY NotificationId DESC
                      LIMIT 1;",
                    new { notification.UserId, GroupKey = groupKey, ReferenceId = notification.ReferenceId.Value },
                    ambientTx);

                if (existingId.HasValue && existingId.Value > 0)
                {
                    await conn.ExecuteAsync(
                        @"UPDATE Notifications
                          SET Title = @Title,
                              Message = @Message,
                              ActionUrl = @ActionUrl,
                              CreatedAt = @CreatedAt
                          WHERE NotificationId = @NotificationId;",
                        new
                        {
                            notification.Title,
                            notification.Message,
                            notification.ActionUrl,
                            CreatedAt = now,
                            NotificationId = existingId.Value
                        },
                        ambientTx);
                    notification.NotificationId = existingId.Value;
                    return notification;
                }
            }

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
                EnsureGroupKey(n);
            }

            var recipientIds = list.Select(n => n.UserId).Distinct().ToList();
            await PurgeExpiredHistoryForUsersBeforeInsertAsync(recipientIds, now);

            // Check active duplicates for items carrying a positive ReferenceId
            var toInsert = new List<Notification>();
            var withRef = list.Where(n => n.ReferenceId.HasValue && n.ReferenceId.Value > 0).ToList();
            var existingMap = new Dictionary<(int UserId, string GroupKey, int RefId), int>();

            if (withRef.Count > 0)
            {
                var conn = await GetOpenConnectionAsync();
                var ambientTx = GetAmbientDbTransaction();
                var refIds = withRef.Select(x => x.ReferenceId!.Value).Distinct().ToList();
                var groupKeys = withRef.Select(x => x.GroupKey!).Distinct().ToList();

                var existingRows = await conn.QueryAsync<(int NotificationId, int UserId, string GroupKey, int ReferenceId)>(
                    @"SELECT NotificationId, UserId, GroupKey, ReferenceId
                      FROM Notifications
                      WHERE IsRead = 0
                        AND UserId IN @UserIds
                        AND GroupKey IN @GroupKeys
                        AND ReferenceId IN @RefIds;",
                    new { UserIds = recipientIds, GroupKeys = groupKeys, RefIds = refIds },
                    ambientTx);

                foreach (var row in existingRows)
                {
                    existingMap[(row.UserId, row.GroupKey, row.ReferenceId)] = row.NotificationId;
                }
            }

            foreach (var n in list)
            {
                if (n.ReferenceId.HasValue &&
                    n.ReferenceId.Value > 0 &&
                    existingMap.TryGetValue((n.UserId, n.GroupKey!, n.ReferenceId.Value), out int existingId))
                {
                    n.NotificationId = existingId;
                    var conn = await GetOpenConnectionAsync();
                    var ambientTx = GetAmbientDbTransaction();
                    await conn.ExecuteAsync(
                        @"UPDATE Notifications
                          SET Title = @Title,
                              Message = @Message,
                              ActionUrl = @ActionUrl,
                              CreatedAt = @CreatedAt
                          WHERE NotificationId = @NotificationId;",
                        new
                        {
                            n.Title,
                            n.Message,
                            n.ActionUrl,
                            CreatedAt = now,
                            NotificationId = existingId
                        },
                        ambientTx);
                }
                else
                {
                    toInsert.Add(n);
                }
            }

            if (toInsert.Count == 0)
            {
                return list.Count;
            }

            await _context.Notifications.AddRangeAsync(toInsert);
            return await _context.SaveChangesAsync();
        }

        public async Task<List<Notification>> GetActiveUnreadNotificationsAsync(int userId)
        {
            var conn = await GetOpenConnectionAsync();
            var ambientTx = GetAmbientDbTransaction();
            const string sql = @"
SELECT NotificationId, UserId, Title, Message, Type, ReferenceId, ActionUrl, GroupKey, IsRead, ReadAt, CreatedAt
FROM Notifications
WHERE UserId = @UserId AND IsRead = 0
ORDER BY CreatedAt DESC, NotificationId DESC;";

            return (await conn.QueryAsync<Notification>(sql, new { UserId = userId }, ambientTx)).ToList();
        }

        public async Task<List<Notification>> GetActiveUnreadByGroupKeyAsync(int userId, string groupKey)
        {
            var conn = await GetOpenConnectionAsync();
            var ambientTx = GetAmbientDbTransaction();
            const string sql = @"
SELECT NotificationId, UserId, Title, Message, Type, ReferenceId, ActionUrl, GroupKey, IsRead, ReadAt, CreatedAt
FROM Notifications
WHERE UserId = @UserId AND IsRead = 0 AND GroupKey = @GroupKey
ORDER BY CreatedAt DESC, NotificationId DESC;";

            return (await conn.QueryAsync<Notification>(sql, new { UserId = userId, GroupKey = groupKey }, ambientTx)).ToList();
        }

        public async Task<(List<Notification> Items, int TotalCount, int UnreadCount)> GetUserNotificationsAsync(
            int userId, int page = 1, int pageSize = 20, bool? unreadOnly = null)
        {
            bool effectiveUnreadOnly = unreadOnly ?? true;
            int p = page > 0 ? page : 1;
            int ps = Math.Clamp(pageSize > 0 ? pageSize : 20, 1, 100);
            int offset = (p - 1) * ps;

            var conn = await GetOpenConnectionAsync();
            var ambientTx = GetAmbientDbTransaction();

            if (effectiveUnreadOnly)
            {
                const string activeSql = @"
SELECT COUNT(1)
FROM Notifications
WHERE UserId = @UserId AND IsRead = 0;

SELECT NotificationId, UserId, Title, Message, Type, ReferenceId, ActionUrl, GroupKey, IsRead, ReadAt, CreatedAt
FROM Notifications
WHERE UserId = @UserId AND IsRead = 0
ORDER BY CreatedAt DESC, NotificationId DESC
LIMIT @Ps OFFSET @Offset;";

                using var multi = await conn.QueryMultipleAsync(
                    activeSql,
                    new { UserId = userId, Ps = ps, Offset = offset },
                    ambientTx);
                int unreadCount = await multi.ReadFirstAsync<int>();
                var items = (await multi.ReadAsync<Notification>()).ToList();
                return (items, unreadCount, unreadCount);
            }

            const string allSql = @"
SELECT
    COALESCE(SUM(CASE WHEN IsRead = 0 THEN 1 ELSE 0 END), 0) AS UnreadCount,
    COUNT(1) AS TotalCount
FROM Notifications
WHERE UserId = @UserId;

SELECT NotificationId, UserId, Title, Message, Type, ReferenceId, ActionUrl, GroupKey, IsRead, ReadAt, CreatedAt
FROM Notifications
WHERE UserId = @UserId
ORDER BY CreatedAt DESC, NotificationId DESC
LIMIT @Ps OFFSET @Offset;";

            using var allMulti = await conn.QueryMultipleAsync(
                allSql,
                new { UserId = userId, Ps = ps, Offset = offset },
                ambientTx);
            var counts = await allMulti.ReadFirstAsync<(int UnreadCount, int TotalCount)>();
            var allItems = (await allMulti.ReadAsync<Notification>()).ToList();
            return (allItems, counts.TotalCount, counts.UnreadCount);
        }

        public async Task<(List<Notification> Items, int UnreadCount)> GetLatestNotificationHistoryAsync(
            int userId, int limit = MaxHistoryRecordsPerUser)
        {
            int takeCount = Math.Clamp(limit, 1, MaxHistoryRecordsPerUser);
            var nowUtc = DateTime.UtcNow;
            var cutoffUtc = nowUtc.AddDays(-HistoryInactivityDays);

            var conn = await GetOpenConnectionAsync();
            var ambientTx = GetAmbientDbTransaction();

            const string inspectSql = @"
SELECT
    MAX(CreatedAt) AS LatestCreatedAt,
    COALESCE(COUNT(DISTINCT CASE WHEN IsRead = 0 THEN COALESCE(NULLIF(GroupKey, ''), CONCAT('n:', NotificationId)) END), 0) AS UnreadCount,
    COALESCE(SUM(CASE WHEN IsRead = 1 THEN 1 ELSE 0 END), 0) AS ReadCount
FROM Notifications
WHERE UserId = @UserId;";

            var summary = await conn.QueryFirstAsync<(DateTime? LatestCreatedAt, int UnreadCount, int ReadCount)>(
                inspectSql,
                new { UserId = userId },
                ambientTx);

            if (!summary.LatestCreatedAt.HasValue || summary.ReadCount == 0)
            {
                return (new List<Notification>(), summary.UnreadCount);
            }

            if (summary.LatestCreatedAt.Value < cutoffUtc)
            {
                await conn.ExecuteAsync(
                    "DELETE FROM Notifications WHERE UserId = @UserId AND IsRead = 1;",
                    new { UserId = userId },
                    ambientTx);
                return (new List<Notification>(), summary.UnreadCount);
            }

            if (summary.ReadCount > MaxHistoryRecordsPerUser)
            {
                await TrimExcessHistoryForUserInternalAsync(conn, ambientTx, userId);
            }

            const string historySql = @"
SELECT NotificationId, UserId, Title, Message, Type, ReferenceId, ActionUrl, GroupKey, IsRead, ReadAt, CreatedAt
FROM Notifications
WHERE UserId = @UserId AND IsRead = 1
ORDER BY CreatedAt DESC, NotificationId DESC
LIMIT @TakeCount;";

            var items = (await conn.QueryAsync<Notification>(
                historySql,
                new { UserId = userId, TakeCount = takeCount },
                ambientTx)).ToList();
            return (items, summary.UnreadCount);
        }

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            var conn = await GetOpenConnectionAsync();
            var ambientTx = GetAmbientDbTransaction();
            return await conn.ExecuteScalarAsync<int>(
                @"SELECT COUNT(DISTINCT COALESCE(NULLIF(GroupKey, ''), CONCAT('n:', NotificationId)))
                  FROM Notifications
                  WHERE UserId = @UserId AND IsRead = 0;",
                new { UserId = userId },
                ambientTx);
        }

        private static async Task<int> TrimExcessHistoryForUserInternalAsync(IDbConnection conn, IDbTransaction? tx, int userId)
        {
            const string trimSql = @"
DELETE n
FROM Notifications n
LEFT JOIN (
    SELECT NotificationId
    FROM Notifications
    WHERE UserId = @UserId AND IsRead = 1
    ORDER BY CreatedAt DESC, NotificationId DESC
    LIMIT @KeepLimit
) keep ON keep.NotificationId = n.NotificationId
WHERE n.UserId = @UserId
  AND n.IsRead = 1
  AND keep.NotificationId IS NULL;";

            return await conn.ExecuteAsync(trimSql, new { UserId = userId, KeepLimit = MaxHistoryRecordsPerUser }, tx);
        }

        public async Task<int> EnforceUserHistoryRetentionAsync(int userId, DateTime? utcNow = null)
        {
            var nowUtc = utcNow ?? DateTime.UtcNow;
            var cutoffUtc = nowUtc.AddDays(-HistoryInactivityDays);
            var conn = await GetOpenConnectionAsync();
            var ambientTx = GetAmbientDbTransaction();

            if (ambientTx != null)
            {
                return await EnforceUserHistoryRetentionInternalAsync(conn, ambientTx, userId, cutoffUtc);
            }

            using var tx = conn.BeginTransaction();
            try
            {
                int deleted = await EnforceUserHistoryRetentionInternalAsync(conn, tx, userId, cutoffUtc);
                tx.Commit();
                return deleted;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        private static async Task<int> EnforceUserHistoryRetentionInternalAsync(
            IDbConnection conn, IDbTransaction? tx, int userId, DateTime cutoffUtc)
        {
            var latestCreatedAt = await conn.ExecuteScalarAsync<DateTime?>(
                "SELECT MAX(CreatedAt) FROM Notifications WHERE UserId = @UserId;",
                new { UserId = userId },
                tx);

            if (!latestCreatedAt.HasValue)
            {
                return 0;
            }

            if (latestCreatedAt.Value < cutoffUtc)
            {
                return await conn.ExecuteAsync(
                    "DELETE FROM Notifications WHERE UserId = @UserId AND IsRead = 1;",
                    new { UserId = userId },
                    tx);
            }

            return await TrimExcessHistoryForUserInternalAsync(conn, tx, userId);
        }

        public async Task<int> PurgeAllExpiredHistoryAsync(DateTime? utcNow = null)
        {
            var nowUtc = utcNow ?? DateTime.UtcNow;
            var cutoffUtc = nowUtc.AddDays(-HistoryInactivityDays);
            var conn = await GetOpenConnectionAsync();
            var ambientTx = GetAmbientDbTransaction();

            int totalDeleted = 0;

            const string purgeInactiveSql = @"
DELETE n
FROM Notifications n
INNER JOIN (
    SELECT UserId
    FROM Notifications
    GROUP BY UserId
    HAVING MAX(CreatedAt) < @CutoffUtc
) expired ON expired.UserId = n.UserId
WHERE n.IsRead = 1;";

            totalDeleted += await conn.ExecuteAsync(purgeInactiveSql, new { CutoffUtc = cutoffUtc }, ambientTx);

            var usersOverLimit = (await conn.QueryAsync<int>(@"
SELECT UserId
FROM Notifications
WHERE IsRead = 1
GROUP BY UserId
HAVING COUNT(1) > @KeepLimit;", new { KeepLimit = MaxHistoryRecordsPerUser }, ambientTx)).ToList();

            foreach (var uid in usersOverLimit)
            {
                totalDeleted += await TrimExcessHistoryForUserInternalAsync(conn, ambientTx, uid);
            }

            return totalDeleted;
        }

        public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
        {
            var (marked, _, _) = await MarkNotificationOrGroupAsReadAsync(notificationId, userId);
            return marked;
        }

        public async Task<(bool Marked, string? GroupKey, List<int> MarkedIds)> MarkNotificationOrGroupAsReadAsync(int notificationId, int userId)
        {
            var conn = await GetOpenConnectionAsync();
            var ambientTx = GetAmbientDbTransaction();
            var nowUtc = DateTime.UtcNow;
            var cutoffUtc = nowUtc.AddDays(-HistoryInactivityDays);

            async Task<(bool Marked, string? GroupKey, List<int> MarkedIds)> ExecuteAsync(IDbTransaction? tx)
            {
                var existing = await conn.QueryFirstOrDefaultAsync<Notification>(
                    @"SELECT NotificationId, UserId, Title, Type, ActionUrl, GroupKey, IsRead
                      FROM Notifications
                      WHERE NotificationId = @NotificationId AND UserId = @UserId
                      LIMIT 1;",
                    new { NotificationId = notificationId, UserId = userId },
                    tx);

                if (existing == null)
                {
                    return (false, null, new List<int>());
                }

                string groupKey = !string.IsNullOrWhiteSpace(existing.GroupKey)
                    ? existing.GroupKey
                    : NotificationGroupingHelper.ResolveGroupKey(existing.Type, existing.Title, existing.ActionUrl);

                var markedIds = new List<int>();
                if (!existing.IsRead)
                {
                    if (!string.IsNullOrWhiteSpace(groupKey))
                    {
                        markedIds = (await conn.QueryAsync<int>(
                            @"SELECT NotificationId
                              FROM Notifications
                              WHERE UserId = @UserId AND IsRead = 0 AND (GroupKey = @GroupKey OR NotificationId = @NotificationId);",
                            new { UserId = userId, GroupKey = groupKey, NotificationId = notificationId },
                            tx)).ToList();

                        await conn.ExecuteAsync(
                            @"UPDATE Notifications
                              SET IsRead = 1, ReadAt = @NowUtc
                              WHERE UserId = @UserId AND IsRead = 0 AND (GroupKey = @GroupKey OR NotificationId = @NotificationId);",
                            new { NowUtc = nowUtc, UserId = userId, GroupKey = groupKey, NotificationId = notificationId },
                            tx);
                    }
                    else
                    {
                        markedIds.Add(notificationId);
                        await conn.ExecuteAsync(
                            @"UPDATE Notifications
                              SET IsRead = 1, ReadAt = @NowUtc
                              WHERE NotificationId = @NotificationId AND UserId = @UserId AND IsRead = 0;",
                            new { NowUtc = nowUtc, NotificationId = notificationId, UserId = userId },
                            tx);
                    }
                }

                await EnforceUserHistoryRetentionInternalAsync(conn, tx, userId, cutoffUtc);
                return (true, groupKey, markedIds);
            }

            if (ambientTx != null)
            {
                return await ExecuteAsync(ambientTx);
            }

            using var tx = conn.BeginTransaction();
            try
            {
                var result = await ExecuteAsync(tx);
                if (result.Marked) tx.Commit();
                else tx.Rollback();
                return result;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<(bool Marked, List<int> MarkedIds)> MarkGroupAsReadAsync(string groupKey, int userId)
        {
            if (string.IsNullOrWhiteSpace(groupKey))
            {
                return (false, new List<int>());
            }

            var conn = await GetOpenConnectionAsync();
            var ambientTx = GetAmbientDbTransaction();
            var nowUtc = DateTime.UtcNow;
            var cutoffUtc = nowUtc.AddDays(-HistoryInactivityDays);

            async Task<(bool Marked, List<int> MarkedIds)> ExecuteAsync(IDbTransaction? tx)
            {
                var markedIds = (await conn.QueryAsync<int>(
                    @"SELECT NotificationId
                      FROM Notifications
                      WHERE UserId = @UserId AND IsRead = 0 AND GroupKey = @GroupKey;",
                    new { UserId = userId, GroupKey = groupKey },
                    tx)).ToList();

                if (markedIds.Count == 0)
                {
                    return (false, markedIds);
                }

                await conn.ExecuteAsync(
                    @"UPDATE Notifications
                      SET IsRead = 1, ReadAt = @NowUtc
                      WHERE UserId = @UserId AND IsRead = 0 AND GroupKey = @GroupKey;",
                    new { NowUtc = nowUtc, UserId = userId, GroupKey = groupKey },
                    tx);

                await EnforceUserHistoryRetentionInternalAsync(conn, tx, userId, cutoffUtc);
                return (true, markedIds);
            }

            if (ambientTx != null)
            {
                return await ExecuteAsync(ambientTx);
            }

            using var tx = conn.BeginTransaction();
            try
            {
                var result = await ExecuteAsync(tx);
                if (result.Marked) tx.Commit();
                else tx.Rollback();
                return result;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<bool> MarkAllAsReadAsync(int userId)
        {
            var conn = await GetOpenConnectionAsync();
            var ambientTx = GetAmbientDbTransaction();
            var nowUtc = DateTime.UtcNow;
            var cutoffUtc = nowUtc.AddDays(-HistoryInactivityDays);

            async Task<bool> ExecuteAsync(IDbTransaction? tx)
            {
                await conn.ExecuteAsync(
                    @"UPDATE Notifications
                      SET IsRead = 1, ReadAt = @NowUtc
                      WHERE UserId = @UserId AND IsRead = 0;",
                    new { NowUtc = nowUtc, UserId = userId },
                    tx);

                await EnforceUserHistoryRetentionInternalAsync(conn, tx, userId, cutoffUtc);
                return true;
            }

            if (ambientTx != null)
            {
                return await ExecuteAsync(ambientTx);
            }

            using var tx = conn.BeginTransaction();
            try
            {
                bool result = await ExecuteAsync(tx);
                tx.Commit();
                return result;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<Notification?> GetByIdAsync(int notificationId)
        {
            var conn = await GetOpenConnectionAsync();
            var ambientTx = GetAmbientDbTransaction();
            return await conn.QueryFirstOrDefaultAsync<Notification>(
                @"SELECT NotificationId, UserId, Title, Message, Type, ReferenceId, ActionUrl, GroupKey, IsRead, ReadAt, CreatedAt
                  FROM Notifications
                  WHERE NotificationId = @NotificationId
                  LIMIT 1;",
                new { NotificationId = notificationId },
                ambientTx);
        }
    }
}
