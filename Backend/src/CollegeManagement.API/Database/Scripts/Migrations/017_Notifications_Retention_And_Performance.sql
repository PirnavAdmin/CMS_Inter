-- ====================================================================================================
-- Migration 017: Notification Active/History Covering Index & Performance Optimization
-- Idempotent migration script safe for repeat execution on live CollegeManagement MySQL database.
-- Covers:
--   1. Active (All) notifications: WHERE UserId = @uid AND IsRead = 0 ORDER BY CreatedAt DESC, NotificationId DESC
--   2. History notifications:      WHERE UserId = @uid AND IsRead = 1 ORDER BY CreatedAt DESC, NotificationId DESC
--   3. 30-day inactivity check:    SELECT MAX(CreatedAt) FROM Notifications WHERE UserId = @uid
-- ====================================================================================================

SET @idx_active_hist_exists = (
    SELECT COUNT(1)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Notifications'
      AND INDEX_NAME = 'IX_Notifications_UserId_IsRead_CreatedAt_Id'
);
SET @sql_active_hist_idx = IF(
    @idx_active_hist_exists = 0,
    'CREATE INDEX `IX_Notifications_UserId_IsRead_CreatedAt_Id` ON `Notifications` (`UserId`, `IsRead`, `CreatedAt` DESC, `NotificationId` DESC);',
    'SELECT 1;'
);
PREPARE stmt_active_hist_idx FROM @sql_active_hist_idx;
EXECUTE stmt_active_hist_idx;
DEALLOCATE PREPARE stmt_active_hist_idx;
