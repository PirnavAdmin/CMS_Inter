-- =============================================================================
-- SCRIPT 99: 99_Rollback_MultiTenantMigration.sql
-- PURPOSE: Emergency Disaster Recovery Script for Phase 2 Migration Window Only
-- ENVIRONMENT: MySQL 8.0 / CollegeManagement
-- =============================================================================
-- CRITICAL WARNING & ARCHITECTURAL NOTICE:
-- 1. MYSQL DDL IMPLICIT-COMMIT LIMITATION:
--    In MySQL, DDL statements (ALTER TABLE, DROP TABLE, CREATE TABLE) trigger an 
--    IMPLICIT COMMIT immediately before and after execution. DDL changes CANNOT 
--    be rolled back via 'ROLLBACK'. This script executes manual schema reversion.
--
-- 2. EMERGENCY RECOVERY WINDOW ONLY:
--    This script is strictly intended for disaster recovery during the initial
--    migration maintenance window.
--    DO NOT EXECUTE if production tenants have been onboarded or operational
--    data has been written!
-- =============================================================================

USE `CollegeManagement`;

-- =============================================================================
-- SAFETY GATE: Assert Zero Additional Colleges or Production Billing Data Exist
-- =============================================================================
DELIMITER $$
DROP PROCEDURE IF EXISTS `sp_EmergencyRollbackSafetyCheck`$$
CREATE PROCEDURE `sp_EmergencyRollbackSafetyCheck`()
BEGIN
    DECLARE v_AdditionalCollegesCount INT DEFAULT 0;
    DECLARE v_PlatformInvoicesCount INT DEFAULT 0;
    DECLARE v_PlatformPaymentsCount INT DEFAULT 0;

    -- Check if Colleges table exists
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Colleges') THEN
        SELECT COUNT(*) INTO v_AdditionalCollegesCount FROM `Colleges` WHERE `CollegeId` > 1;
        IF v_AdditionalCollegesCount > 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'ABORT_ROLLBACK: Additional college tenants exist! Executing this script will destroy multi-tenant institutional data. Use point-in-time snapshot restore instead.';
        END IF;
    END IF;

    -- Check if PlatformInvoices contains data
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PlatformInvoices') THEN
        SELECT COUNT(*) INTO v_PlatformInvoicesCount FROM `PlatformInvoices`;
        IF v_PlatformInvoicesCount > 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'ABORT_ROLLBACK: Platform invoices exist! Manual financial audit required before dropping billing tables.';
        END IF;
    END IF;

    -- Check if PlatformPayments contains data
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PlatformPayments') THEN
        SELECT COUNT(*) INTO v_PlatformPaymentsCount FROM `PlatformPayments`;
        IF v_PlatformPaymentsCount > 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'ABORT_ROLLBACK: Platform payments exist! Immutable financial records cannot be dropped.';
        END IF;
    END IF;
END$$
DELIMITER ;

CALL `sp_EmergencyRollbackSafetyCheck`();
DROP PROCEDURE IF EXISTS `sp_EmergencyRollbackSafetyCheck`;

-- =============================================================================
-- REVERSION STEP 1: Drop Stored Procedures Deployed in Phase 2
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetDashboardSummary`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetCollegesPaged`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetCollegeById`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_CreateCollegeWithAdmin`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_UpdateCollege`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_UpdateCollegeStatus`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetCollegeAdmins`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_CreateCollegeAdmin`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetGlobalUsersPaged`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetUserDetail`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_UpdateUserStatus`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_ResetUserPassword`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetAllPlans`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_SavePlan`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_UpdatePlanStatus`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetCollegeSubscriptions`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_ChangeCollegePlan`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_RenewCollegeSubscription`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_CancelCollegeSubscription`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetAccountUsageStats`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetRenewalsPaged`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetPaymentsAndInvoices`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_VerifyPlatformPayment`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetPlanModuleMatrix`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_UpdatePlanModuleMatrix`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetNotifications`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_CreatePlatformNotification`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_MarkNotificationRead`;
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetAuditLogsPaged`;

-- Drop V2 Remediated Procedures
DROP PROCEDURE IF EXISTS `sp_GetDashboardKPIs_V2`;
DROP PROCEDURE IF EXISTS `sp_Staff_GetAllStaff_V2`;
DROP PROCEDURE IF EXISTS `sp_GetAllStudents_V2`;
DROP PROCEDURE IF EXISTS `sp_GetTemplates_V2`;
DROP PROCEDURE IF EXISTS `sp_GetNumberSeriesConfigurations_V2`;
DROP PROCEDURE IF EXISTS `sp_GetAllGroups_V2`;
DROP PROCEDURE IF EXISTS `sp_Staff_GetAssignedCampuses_V2`;

-- =============================================================================
-- REVERSION STEP 2: Drop Foreign Keys Added During Migration
-- =============================================================================
SET @dbname = DATABASE();

SET @fkcheck = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Campuses' AND CONSTRAINT_NAME = 'FK_Campuses_Colleges');
SET @sql = IF(@fkcheck > 0, 'ALTER TABLE `Campuses` DROP FOREIGN KEY `FK_Campuses_Colleges`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fkcheck = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Users' AND CONSTRAINT_NAME = 'FK_Users_Colleges');
SET @sql = IF(@fkcheck > 0, 'ALTER TABLE `Users` DROP FOREIGN KEY `FK_Users_Colleges`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================================================================
-- REVERSION STEP 3: Restore Legacy Indexes on Tier 2 Tables
-- =============================================================================
-- Restore single-column unique key on NumberSeriesConfigurations
SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'NumberSeriesConfigurations' AND INDEX_NAME = 'UQ_NumberSeries_College_Code');
SET @sql = IF(@idxcheck > 0, 'ALTER TABLE `NumberSeriesConfigurations` DROP INDEX `UQ_NumberSeries_College_Code`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'NumberSeriesConfigurations' AND INDEX_NAME = 'idx_numseries_code');
SET @sql = IF(@idxcheck = 0, 'ALTER TABLE `NumberSeriesConfigurations` ADD UNIQUE KEY `idx_numseries_code` (`SeriesCode`);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Restore single-column unique key on templates
SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'templates' AND INDEX_NAME = 'UX_templates_College_TemplateCode');
SET @sql = IF(@idxcheck > 0, 'ALTER TABLE `templates` DROP INDEX `UX_templates_College_TemplateCode`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'templates' AND INDEX_NAME = 'UX_templates_TemplateCode');
SET @sql = IF(@idxcheck = 0, 'ALTER TABLE `templates` ADD UNIQUE KEY `UX_templates_TemplateCode` (`TemplateCode`);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================================================================
-- REVERSION STEP 4: Drop Columns Added to Existing Tables
-- =============================================================================
SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Campuses' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck > 0, 'ALTER TABLE `Campuses` DROP COLUMN `CollegeId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck > 0, 'ALTER TABLE `Users` DROP COLUMN `CollegeId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'AuditLogs' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck > 0, 'ALTER TABLE `AuditLogs` DROP COLUMN `CollegeId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Departments' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck > 0, 'ALTER TABLE `Departments` DROP COLUMN `CollegeId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Designations' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck > 0, 'ALTER TABLE `Designations` DROP COLUMN `CollegeId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'templates' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck > 0, 'ALTER TABLE `templates` DROP COLUMN `CollegeId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'NumberSeriesConfigurations' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck > 0, 'ALTER TABLE `NumberSeriesConfigurations` DROP COLUMN `CollegeId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'AcademicCalendarEvents' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck > 0, 'ALTER TABLE `AcademicCalendarEvents` DROP COLUMN `CollegeId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop RoleCode and Scope from Roles
SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Roles' AND COLUMN_NAME = 'RoleCode');
SET @sql = IF(@colcheck > 0, 'ALTER TABLE `Roles` DROP COLUMN `RoleCode`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Roles' AND COLUMN_NAME = 'Scope');
SET @sql = IF(@colcheck > 0, 'ALTER TABLE `Roles` DROP COLUMN `Scope`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================================================================
-- REVERSION STEP 5: Drop Core Platform Tables
-- =============================================================================
DROP TABLE IF EXISTS `PlatformPayments`;
DROP TABLE IF EXISTS `PlatformInvoices`;
DROP TABLE IF EXISTS `SubscriptionRenewalHistory`;
DROP TABLE IF EXISTS `CollegeSubscriptions`;
DROP TABLE IF EXISTS `PlanModules`;
DROP TABLE IF EXISTS `SubscriptionPlans`;
DROP TABLE IF EXISTS `PlatformSettings`;
DROP TABLE IF EXISTS `Colleges`;

SELECT 'EMERGENCY_ROLLBACK_COMPLETED_SUCCESSFULLY' AS Status, NOW() AS CompletedAt;
