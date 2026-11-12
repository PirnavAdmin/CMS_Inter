-- Migration 018: Screen + Action-Type Notification Grouping Support
-- Adds GroupKey column and covering index to the existing Notifications table
-- so multi-request grouping stays consistent across restarts, refreshes, and multiple Admin users.

SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Notifications'
      AND COLUMN_NAME = 'GroupKey'
);

SET @add_col_sql := IF(
    @col_exists = 0,
    'ALTER TABLE `Notifications` ADD COLUMN `GroupKey` VARCHAR(160) NULL AFTER `ActionUrl`;',
    'SELECT ''GroupKey column already exists'' AS Info;'
);
PREPARE stmt_col FROM @add_col_sql;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;

SET @idx_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Notifications'
      AND INDEX_NAME = 'IX_Notifications_UserId_IsRead_GroupKey_CreatedAt'
);

SET @add_idx_sql := IF(
    @idx_exists = 0,
    'ALTER TABLE `Notifications` ADD INDEX `IX_Notifications_UserId_IsRead_GroupKey_CreatedAt` (`UserId`, `IsRead`, `GroupKey`, `CreatedAt` DESC, `NotificationId` DESC);',
    'SELECT ''Grouping index already exists'' AS Info;'
);
PREPARE stmt_idx FROM @add_idx_sql;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

-- Backfill GroupKey for existing notifications missing a GroupKey
UPDATE `Notifications`
SET `GroupKey` = CASE
    WHEN LOWER(IFNULL(`Type`, '')) LIKE '%attend%'
         AND (LOWER(IFNULL(`ActionUrl`, '')) LIKE '%view=regularize%' OR LOWER(IFNULL(`Title`, '')) LIKE '%regularization request%')
         AND LOWER(IFNULL(`Title`, '')) NOT LIKE '%approved%'
         AND LOWER(IFNULL(`Title`, '')) NOT LIKE '%rejected%'
        THEN 'attendance:staff-regularize:request'
    WHEN LOWER(IFNULL(`Type`, '')) = 'admission'
         AND LOWER(IFNULL(`Title`, '')) LIKE '%admission%'
        THEN 'admission:admin-requests:new'
    WHEN LOWER(IFNULL(`Type`, '')) = 'leave'
         AND (LOWER(IFNULL(`Title`, '')) LIKE '%new leave%' OR LOWER(IFNULL(`Title`, '')) LIKE '%leave request%')
         AND LOWER(IFNULL(`Title`, '')) NOT LIKE '%approved%'
         AND LOWER(IFNULL(`Title`, '')) NOT LIKE '%rejected%'
        THEN 'leave:admin-requests:pending'
    WHEN LOWER(IFNULL(`Type`, '')) LIKE '%reimburse%'
         AND LOWER(IFNULL(`Title`, '')) NOT LIKE '%approved%'
         AND LOWER(IFNULL(`Title`, '')) NOT LIKE '%rejected%'
         AND LOWER(IFNULL(`Title`, '')) NOT LIKE '%paid%'
        THEN 'reimbursement:admin-claims:pending'
    WHEN LOWER(IFNULL(`Type`, '')) LIKE '%certif%'
         AND (LOWER(IFNULL(`Title`, '')) LIKE '%new certificate%' OR LOWER(IFNULL(`Title`, '')) LIKE '%certificate request%')
         AND LOWER(IFNULL(`Title`, '')) NOT LIKE '%approved%'
         AND LOWER(IFNULL(`Title`, '')) NOT LIKE '%rejected%'
        THEN 'certificate:requests:pending'
    WHEN LOWER(IFNULL(`Title`, '')) LIKE '%utr submitted%'
        THEN 'fee:fee-structure:utr-verification'
    WHEN LOWER(IFNULL(`Title`, '')) LIKE '%upcoming fee due%'
        THEN 'fee:student-fees:due-reminder'
    ELSE LEFT(
        CONCAT(
            LOWER(COALESCE(NULLIF(TRIM(`Type`), ''), 'general')),
            '|',
            LOWER(SUBSTRING_INDEX(COALESCE(NULLIF(TRIM(`ActionUrl`), ''), 'no-url'), '?', 1)),
            '|',
            LOWER(LEFT(TRIM(`Title`), 55))
        ),
        160
    )
END
WHERE `GroupKey` IS NULL;
