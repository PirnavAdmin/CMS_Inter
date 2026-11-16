-- ====================================================================================================
-- Migration 016: Notifications History Index & Staff Regularization Performance Indexes
-- Idempotent migration script safe for repeat execution on live CollegeManagement MySQL database.
-- Preserves all existing notification, attendance, and regularization records.
-- ====================================================================================================

-- 1. Composite covering index for fast latest-10 History and paginated All notification retrieval
SET @idx_notif_exists = (
    SELECT COUNT(1)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Notifications'
      AND INDEX_NAME = 'IX_Notifications_UserId_CreatedAt_Id'
);
SET @sql_notif_idx = IF(
    @idx_notif_exists = 0,
    'CREATE INDEX `IX_Notifications_UserId_CreatedAt_Id` ON `Notifications` (`UserId`, `CreatedAt` DESC, `NotificationId` DESC);',
    'SELECT 1;'
);
PREPARE stmt_notif_idx FROM @sql_notif_idx;
EXECUTE stmt_notif_idx;
DEALLOCATE PREPARE stmt_notif_idx;

-- 2. Composite index for Admin Regularization Pending & History retrieval
SET @idx_reg_exists = (
    SELECT COUNT(1)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'StaffAttendanceRegularizations'
      AND INDEX_NAME = 'IX_StaffAttReg_Status_CreatedAt'
);
SET @sql_reg_idx = IF(
    @idx_reg_exists = 0,
    'CREATE INDEX `IX_StaffAttReg_Status_CreatedAt` ON `StaffAttendanceRegularizations` (`Status`, `CreatedAt` DESC, `RegularizationId` DESC);',
    'SELECT 1;'
);
PREPARE stmt_reg_idx FROM @sql_reg_idx;
EXECUTE stmt_reg_idx;
DEALLOCATE PREPARE stmt_reg_idx;
