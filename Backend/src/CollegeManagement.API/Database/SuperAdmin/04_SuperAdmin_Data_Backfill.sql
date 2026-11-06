-- =============================================================================
-- SCRIPT 04: 04_SuperAdmin_Data_Backfill.sql
-- PURPOSE: Seed Primary College & Controlled Backfill of Legacy Institutional Records
-- ENVIRONMENT: MySQL 8.0 / CollegeManagement
-- EXECUTION SAFETY: DML inside Transaction + Final DDL for NOT NULL & FK Enforcement
-- =============================================================================

USE `CollegeManagement`;

START TRANSACTION;

-- 1. Seed Primary Institution (Pirnav Junior College)
-- Note: Uses ID = 1 as primary institutional anchor
INSERT INTO `Colleges` (
    `CollegeId`, `CollegeCode`, `CollegeName`, `OfficialEmail`, 
    `ContactPhone`, `Address`, `Status`, `SubscriptionStatus`, 
    `SubscriptionStartDate`, `RenewalDate`, `IsDeleted`, `RegisteredAt`
)
VALUES (
    1, 'PIRNAV-MAIN', 'Pirnav Junior College', 'admin@pirnav.edu', 
    '+91 9876543210', 'Main Campus, Hyderabad, Telangana', 'Active', 'Active', 
    CURRENT_DATE(), DATE_ADD(CURRENT_DATE(), INTERVAL 365 DAY), 0, CURRENT_TIMESTAMP(6)
)
ON DUPLICATE KEY UPDATE 
    `CollegeName` = VALUES(`CollegeName`),
    `OfficialEmail` = VALUES(`OfficialEmail`),
    `Status` = VALUES(`Status`);

-- 2. Backfill Existing Campuses to CollegeId = 1
UPDATE `Campuses` 
SET `CollegeId` = 1 
WHERE `CollegeId` IS NULL;

-- 3. Backfill Existing Institutional Users to CollegeId = 1
-- CRITICAL SECURITY RULE: Super Admin users MUST remain CollegeId = NULL (Platform Scope)
UPDATE `Users` u
JOIN `Roles` r ON u.RoleId = r.RoleId
SET u.CollegeId = 1
WHERE r.RoleName != 'Super Admin' 
  AND (r.RoleCode IS NULL OR r.RoleCode != 'SUPER_ADMIN')
  AND u.CollegeId IS NULL;

-- 4. Assert Super Admin has NULL CollegeId
UPDATE `Users` u
JOIN `Roles` r ON u.RoleId = r.RoleId
SET u.CollegeId = NULL
WHERE r.RoleName = 'Super Admin' OR r.RoleCode = 'SUPER_ADMIN';

-- 5. Backfill Tier 2 College-Level Configurations to CollegeId = 1
UPDATE `Departments` SET `CollegeId` = 1 WHERE `CollegeId` IS NULL OR `CollegeId` = 0;
UPDATE `Designations` SET `CollegeId` = 1 WHERE `CollegeId` IS NULL OR `CollegeId` = 0;
UPDATE `templates` SET `CollegeId` = 1 WHERE `CollegeId` IS NULL OR `CollegeId` = 0;
UPDATE `NumberSeriesConfigurations` SET `CollegeId` = 1 WHERE `CollegeId` IS NULL OR `CollegeId` = 0;
UPDATE `AcademicCalendarEvents` SET `CollegeId` = 1 WHERE `CollegeId` IS NULL OR `CollegeId` = 0;

-- 6. Seed Default Free Subscription Plan if none exists
INSERT INTO `SubscriptionPlans` (
    `PlanId`, `PlanName`, `Description`, `Price`, `DurationDays`, `AccountLimit`, `IsActive`, `IsDeleted`
)
VALUES (
    1, 'Free Tier', 'Complimentary starter plan for single-campus institution', 0.00, 365, 50, 1, 0
)
ON DUPLICATE KEY UPDATE 
    `PlanName` = VALUES(`PlanName`),
    `AccountLimit` = VALUES(`AccountLimit`);

-- 7. Associate College 1 with Active Subscription
INSERT INTO `CollegeSubscriptions` (
    `CollegeId`, `PlanId`, `StartDate`, `RenewalDate`, `Status`, `AutoRenew`
)
VALUES (
    1, 1, CURRENT_DATE(), DATE_ADD(CURRENT_DATE(), INTERVAL 365 DAY), 'Active', 1
)
ON DUPLICATE KEY UPDATE 
    `Status` = 'Active',
    `RenewalDate` = VALUES(`RenewalDate`);

COMMIT;

-- 8. Post-Backfill Schema Enforcement on Campuses (Executed after DML commit)
-- Note: MySQL DDL causes implicit commit
SET @dbname = DATABASE();

-- Modify Campuses.CollegeId to NOT NULL
ALTER TABLE `Campuses` MODIFY `CollegeId` INT NOT NULL;

-- Add Foreign Key constraint Campuses -> Colleges (ON DELETE RESTRICT)
SET @fkcheck = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Campuses' AND CONSTRAINT_NAME = 'FK_Campuses_Colleges');
SET @sql = IF(@fkcheck = 0, 'ALTER TABLE `Campuses` ADD CONSTRAINT `FK_Campuses_Colleges` FOREIGN KEY (`CollegeId`) REFERENCES `Colleges` (`CollegeId`) ON DELETE RESTRICT;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'DATA_BACKFILL_AND_CAMPUS_FK_ENFORCED' AS Status, NOW() AS CompletedAt;
