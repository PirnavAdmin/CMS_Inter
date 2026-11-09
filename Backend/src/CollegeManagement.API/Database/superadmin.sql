-- =============================================================================
-- UNIFIED SUPER ADMIN MULTI-TENANT PLATFORM SCRIPT
-- CONSOLIDATED DDL, ALTERATIONS, SEEDS & ALL 29 STORED PROCEDURES
-- MySQL 8.0 / CollegeManagement
-- =============================================================================



-- =============================================================================
-- SECTION: 00_PreMigrationCheck.sql
-- =============================================================================

-- =============================================================================
-- SCRIPT 00: 00_PreMigrationCheck.sql
-- PURPOSE: Pre-Migration Assertions & Environment Validation for Super Admin Module
-- ENVIRONMENT: MySQL 8.0 / CollegeManagement
-- EXECUTION SAFETY: Read-Only / Zero Side Effects
-- =============================================================================

USE `CollegeManagement`;

-- 1. Check Database Collation & Engine Compatibility
SELECT 
    @@character_set_database AS DatabaseCharset,
    @@collation_database AS DatabaseCollation,
    @@default_storage_engine AS DefaultStorageEngine;

-- 2. Assert Zero Orphaned Student Campus References
SELECT 
    COUNT(*) AS OrphanedStudentsCount,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASSED'
        ELSE 'FAILED: Found orphaned students with non-existent CampusId'
    END AS StudentCampusStatus
FROM `Students` s
LEFT JOIN `Campuses` c ON s.CampusId = c.CampusId
WHERE s.CampusId IS NOT NULL AND c.CampusId IS NULL;

-- 3. Assert Zero Orphaned Staff Campus Assignments
SELECT 
    COUNT(*) AS OrphanedStaffCount,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASSED'
        ELSE 'FAILED: Found orphaned staff with non-existent CampusId'
    END AS StaffCampusStatus
FROM `Staff` st
LEFT JOIN `Campuses` c ON st.CampusId = c.CampusId
WHERE st.CampusId IS NOT NULL AND c.CampusId IS NULL;

-- 4. Assert Zero Orphaned Student Admissions Campus References
SELECT 
    COUNT(*) AS OrphanedAdmissionsCount,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASSED'
        ELSE 'FAILED: Found orphaned admissions with non-existent CampusId'
    END AS AdmissionCampusStatus
FROM `StudentAdmissions` sa
LEFT JOIN `Campuses` c ON sa.CampusId = c.CampusId
WHERE sa.CampusId IS NOT NULL AND c.CampusId IS NULL;

-- 5. Assert Zero Duplicate Template Codes in Existing Data
-- Pre-requisite for adding composite UNIQUE KEY (CollegeId, TemplateCode)
SELECT 
    COUNT(*) - COUNT(DISTINCT `TemplateCode`) AS DuplicateTemplateCodesCount,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT `TemplateCode`) THEN 'PASSED'
        ELSE 'FAILED: Existing duplicate TemplateCodes found in templates table'
    END AS TemplateCodeUniquenessStatus
FROM `templates`;

-- 6. Assert Zero Duplicate Series Codes in NumberSeriesConfigurations
-- Pre-requisite for adding composite UNIQUE KEY (CollegeId, SeriesCode)
SELECT 
    COUNT(*) - COUNT(DISTINCT `SeriesCode`) AS DuplicateSeriesCodesCount,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT `SeriesCode`) THEN 'PASSED'
        ELSE 'FAILED: Existing duplicate SeriesCodes found in NumberSeriesConfigurations'
    END AS SeriesCodeUniquenessStatus
FROM `NumberSeriesConfigurations`;

-- 7. Assert Primary Campus Exists
SELECT 
    COUNT(*) AS ExistingCampusesCount,
    CASE 
        WHEN COUNT(*) > 0 THEN 'PASSED'
        ELSE 'FAILED: At least one campus must exist before multi-tenant migration'
    END AS PrimaryCampusStatus
FROM `Campuses`;

-- 8. Assert Canonical Roles Exist
SELECT 
    COUNT(CASE WHEN `RoleName` = 'Super Admin' THEN 1 END) AS SuperAdminRoleExists,
    COUNT(CASE WHEN `RoleName` = 'Admin' THEN 1 END) AS AdminRoleExists,
    CASE 
        WHEN COUNT(CASE WHEN `RoleName` = 'Super Admin' THEN 1 END) > 0 
         AND COUNT(CASE WHEN `RoleName` = 'Admin' THEN 1 END) > 0 THEN 'PASSED'
        ELSE 'FAILED: Canonical Super Admin or Admin role missing in Roles table'
    END AS CanonicalRoleStatus
FROM `Roles`;

-- Summary Pre-Migration Assertion Verification
SELECT 'PRE_MIGRATION_VALIDATION_COMPLETED' AS Status, NOW() AS ValidatedAt;


-- =============================================================================
-- SECTION: 01_SuperAdmin_Core_Tables.sql
-- =============================================================================

-- =============================================================================
-- SCRIPT 01: 01_SuperAdmin_Core_Tables.sql
-- PURPOSE: Create Core Platform Tables for Multi-Tenant Super Admin Module
-- ENVIRONMENT: MySQL 8.0 / CollegeManagement
-- EXECUTION SAFETY: DDL / Creates 8 New Independent Platform Tables
-- =============================================================================

USE `CollegeManagement`;

-- 1. COLLEGES TABLE (Institutional Tenants)
CREATE TABLE IF NOT EXISTS `Colleges` (
    `CollegeId` INT NOT NULL AUTO_INCREMENT,
    `CollegeCode` VARCHAR(50) NOT NULL,
    `CollegeName` VARCHAR(150) NOT NULL,
    `OfficialEmail` VARCHAR(150) NOT NULL,
    `ContactPhone` VARCHAR(50) NULL,
    `Address` VARCHAR(500) NULL,
    `LogoUrl` VARCHAR(500) NULL,
    `Status` ENUM('Pending', 'Active', 'Inactive', 'Suspended') NOT NULL DEFAULT 'Active',
    `CurrentPlanId` INT NULL,
    `SubscriptionStatus` ENUM('Free', 'Active', 'Expiring Soon', 'Expired', 'Cancelled') NOT NULL DEFAULT 'Free',
    `SubscriptionStartDate` DATE NULL,
    `RenewalDate` DATE NULL,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `DeletedAt` DATETIME(6) NULL,
    `CreatedBy` INT NULL,
    `UpdatedBy` INT NULL,
    `RegisteredAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`CollegeId`),
    UNIQUE KEY `UQ_Colleges_CollegeCode` (`CollegeCode`),
    UNIQUE KEY `UQ_Colleges_OfficialEmail` (`OfficialEmail`),
    KEY `IX_Colleges_Status_IsDeleted` (`Status`, `IsDeleted`),
    KEY `IX_Colleges_CurrentPlanId` (`CurrentPlanId`),
    KEY `IX_Colleges_RenewalDate` (`RenewalDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. SUBSCRIPTION PLANS TABLE
CREATE TABLE IF NOT EXISTS `SubscriptionPlans` (
    `PlanId` INT NOT NULL AUTO_INCREMENT,
    `PlanName` VARCHAR(100) NOT NULL,
    `Description` VARCHAR(500) NULL,
    `Price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `DurationDays` INT NOT NULL DEFAULT 30,
    `AccountLimit` INT NOT NULL DEFAULT 25,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` INT NULL,
    `UpdatedBy` INT NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`PlanId`),
    UNIQUE KEY `UQ_SubscriptionPlans_PlanName` (`PlanName`),
    KEY `IX_SubscriptionPlans_IsActive_IsDeleted` (`IsActive`, `IsDeleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. PLAN MODULES TABLE (Feature Gating Matrix)
CREATE TABLE IF NOT EXISTS `PlanModules` (
    `PlanModuleId` INT NOT NULL AUTO_INCREMENT,
    `PlanId` INT NOT NULL,
    `ModuleName` VARCHAR(100) NOT NULL,
    `IsEnabled` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`PlanModuleId`),
    UNIQUE KEY `UQ_PlanModules_Plan_Module` (`PlanId`, `ModuleName`),
    CONSTRAINT `FK_PlanModules_SubscriptionPlans` FOREIGN KEY (`PlanId`) REFERENCES `SubscriptionPlans` (`PlanId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. COLLEGE SUBSCRIPTIONS TABLE (Single Active Subscription Invariant)
CREATE TABLE IF NOT EXISTS `CollegeSubscriptions` (
    `SubscriptionId` INT NOT NULL AUTO_INCREMENT,
    `CollegeId` INT NOT NULL,
    `PlanId` INT NOT NULL,
    `StartDate` DATE NOT NULL,
    `RenewalDate` DATE NULL,
    `Status` ENUM('Free', 'Active', 'Expiring Soon', 'Expired', 'Cancelled') NOT NULL DEFAULT 'Active',
    `AutoRenew` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`SubscriptionId`),
    UNIQUE KEY `UQ_CollegeSubscriptions_CollegeId` (`CollegeId`),
    KEY `IX_CollegeSubscriptions_PlanId` (`PlanId`),
    KEY `IX_CollegeSubscriptions_Status` (`Status`),
    CONSTRAINT `FK_CollegeSubscriptions_Colleges` FOREIGN KEY (`CollegeId`) REFERENCES `Colleges` (`CollegeId`) ON DELETE CASCADE,
    CONSTRAINT `FK_CollegeSubscriptions_Plans` FOREIGN KEY (`PlanId`) REFERENCES `SubscriptionPlans` (`PlanId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. SUBSCRIPTION RENEWAL HISTORY
CREATE TABLE IF NOT EXISTS `SubscriptionRenewalHistory` (
    `RenewalHistoryId` INT NOT NULL AUTO_INCREMENT,
    `CollegeId` INT NOT NULL,
    `PlanId` INT NOT NULL,
    `PreviousRenewalDate` DATE NULL,
    `NewRenewalDate` DATE NOT NULL,
    `AmountPaid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `InvoiceNumber` VARCHAR(100) NULL,
    `RenewedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `PerformedBy` VARCHAR(150) NULL,
    PRIMARY KEY (`RenewalHistoryId`),
    KEY `IX_RenewalHistory_CollegeId` (`CollegeId`),
    CONSTRAINT `FK_RenewalHistory_Colleges` FOREIGN KEY (`CollegeId`) REFERENCES `Colleges` (`CollegeId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. PLATFORM INVOICES TABLE (Segregated B2B SaaS Billing Ledger)
CREATE TABLE IF NOT EXISTS `PlatformInvoices` (
    `InvoiceId` INT NOT NULL AUTO_INCREMENT,
    `InvoiceNumber` VARCHAR(100) NOT NULL,
    `CollegeId` INT NOT NULL,
    `PlanId` INT NOT NULL,
    `Amount` DECIMAL(12,2) NOT NULL,
    `InvoiceDate` DATE NOT NULL,
    `DueDate` DATE NOT NULL,
    `Status` ENUM('Paid', 'Pending', 'Void', 'Overdue') NOT NULL DEFAULT 'Pending',
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`InvoiceId`),
    UNIQUE KEY `UQ_PlatformInvoices_InvoiceNumber` (`InvoiceNumber`),
    KEY `IX_PlatformInvoices_CollegeId` (`CollegeId`),
    CONSTRAINT `FK_PlatformInvoices_Colleges` FOREIGN KEY (`CollegeId`) REFERENCES `Colleges` (`CollegeId`) ON DELETE CASCADE,
    CONSTRAINT `FK_PlatformInvoices_Plans` FOREIGN KEY (`PlanId`) REFERENCES `SubscriptionPlans` (`PlanId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. PLATFORM PAYMENTS TABLE (Audit Immutable: ON DELETE RESTRICT on Invoices)
CREATE TABLE IF NOT EXISTS `PlatformPayments` (
    `PaymentId` INT NOT NULL AUTO_INCREMENT,
    `PaymentIdentifier` VARCHAR(100) NOT NULL,
    `InvoiceId` INT NOT NULL,
    `CollegeId` INT NOT NULL,
    `Amount` DECIMAL(12,2) NOT NULL,
    `PaymentDate` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `PaymentMethod` VARCHAR(50) NOT NULL DEFAULT 'Manual/Bank Transfer',
    `Status` ENUM('Paid', 'Pending Verification', 'Failed', 'Refunded') NOT NULL DEFAULT 'Pending Verification',
    `TransactionReference` VARCHAR(150) NULL,
    `Notes` VARCHAR(500) NULL,
    PRIMARY KEY (`PaymentId`),
    UNIQUE KEY `UQ_PlatformPayments_PaymentIdentifier` (`PaymentIdentifier`),
    KEY `IX_PlatformPayments_CollegeId` (`CollegeId`),
    CONSTRAINT `FK_PlatformPayments_Invoices` FOREIGN KEY (`InvoiceId`) REFERENCES `PlatformInvoices` (`InvoiceId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_PlatformPayments_Colleges` FOREIGN KEY (`CollegeId`) REFERENCES `Colleges` (`CollegeId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. PLATFORM SETTINGS TABLE (Central SaaS Parameters)
CREATE TABLE IF NOT EXISTS `PlatformSettings` (
    `SettingId` INT NOT NULL AUTO_INCREMENT,
    `SettingKey` VARCHAR(100) NOT NULL,
    `SettingValue` LONGTEXT NOT NULL,
    `DataType` VARCHAR(30) NOT NULL DEFAULT 'String',
    `Description` VARCHAR(500) NULL,
    `UpdatedBy` VARCHAR(150) NULL,
    `UpdatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`SettingId`),
    UNIQUE KEY `UQ_PlatformSettings_Key` (`SettingKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- SECTION: 02_SuperAdmin_Schema_Alterations.sql
-- =============================================================================

-- =============================================================================
-- SCRIPT 02: 02_SuperAdmin_Schema_Alterations.sql
-- PURPOSE: Non-Destructive Alterations to Existing Tables (Roles, Users, Campuses, AuditLogs)
-- ENVIRONMENT: MySQL 8.0 / CollegeManagement
-- EXECUTION SAFETY: DDL / Adds Columns & Indexes Non-Destructively
-- =============================================================================

USE `CollegeManagement`;

-- 1. ALTER ROLES TABLE (RoleCode and Architectural Scope)
-- Note: Prepared statements used for idempotent column addition
SET @dbname = DATABASE();

SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Roles' AND COLUMN_NAME = 'RoleCode');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `Roles` ADD COLUMN `RoleCode` VARCHAR(50) NULL AFTER `RoleId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Roles' AND COLUMN_NAME = 'Scope');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `Roles` ADD COLUMN `Scope` ENUM(\'PLATFORM\', \'COLLEGE\') NOT NULL DEFAULT \'COLLEGE\' AFTER `StaffType`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Unique constraint on RoleCode
SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Roles' AND INDEX_NAME = 'UQ_Roles_RoleCode');
SET @sql = IF(@idxcheck = 0, 'ALTER TABLE `Roles` ADD UNIQUE KEY `UQ_Roles_RoleCode` (`RoleCode`);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. ALTER USERS TABLE (Tenant CollegeId)
SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `Users` ADD COLUMN `CollegeId` INT NULL AFTER `RoleId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fkcheck = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Users' AND CONSTRAINT_NAME = 'FK_Users_Colleges');
SET @sql = IF(@fkcheck = 0, 'ALTER TABLE `Users` ADD CONSTRAINT `FK_Users_Colleges` FOREIGN KEY (`CollegeId`) REFERENCES `Colleges` (`CollegeId`) ON DELETE SET NULL;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Users' AND INDEX_NAME = 'IX_Users_College_Role_Status');
SET @sql = IF(@idxcheck = 0, 'ALTER TABLE `Users` ADD INDEX `IX_Users_College_Role_Status` (`CollegeId`, `RoleId`, `IsActive`);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. ALTER CAMPUSES TABLE (Tenant CollegeId - Nullable initially, enforced NOT NULL in Backfill)
SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Campuses' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `Campuses` ADD COLUMN `CollegeId` INT NULL AFTER `CampusId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Campuses' AND INDEX_NAME = 'IX_Campuses_CollegeId');
SET @sql = IF(@idxcheck = 0, 'ALTER TABLE `Campuses` ADD INDEX `IX_Campuses_CollegeId` (`CollegeId`);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. ALTER AUDITLOGS TABLE (Tenant Scoping)
SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'AuditLogs' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `AuditLogs` ADD COLUMN `CollegeId` INT NULL AFTER `EntityId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'AuditLogs' AND INDEX_NAME = 'IX_AuditLogs_CollegeId_CreatedAt');
SET @sql = IF(@idxcheck = 0, 'ALTER TABLE `AuditLogs` ADD INDEX `IX_AuditLogs_CollegeId_CreatedAt` (`CollegeId`, `CreatedAt`);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'SCHEMA_ALTERATIONS_COMPLETED' AS Status, NOW() AS CompletedAt;


-- =============================================================================
-- SECTION: 03_SuperAdmin_Tier2_Configuration_Alter.sql
-- =============================================================================

-- =============================================================================
-- SCRIPT 03: 03_SuperAdmin_Tier2_Configuration_Alter.sql
-- PURPOSE: Alter Tier 2 Institutional Configuration Tables & Adjust Composite Unique Keys
-- ENVIRONMENT: MySQL 8.0 / CollegeManagement
-- EXECUTION SAFETY: DDL / Replaces Single-Column Unique Keys with Composite (CollegeId, Code)
-- =============================================================================

USE `CollegeManagement`;

SET @dbname = DATABASE();

-- 1. NUMBER SERIES CONFIGURATIONS (Add CollegeId & Composite Unique Key)
-- Step 1a: Add CollegeId column if not exists
SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'NumberSeriesConfigurations' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `NumberSeriesConfigurations` ADD COLUMN `CollegeId` INT NOT NULL DEFAULT 1 AFTER `Id`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Step 1b: Drop legacy single-column unique index if exists
SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'NumberSeriesConfigurations' AND INDEX_NAME = 'idx_numseries_code');
SET @sql = IF(@idxcheck > 0, 'ALTER TABLE `NumberSeriesConfigurations` DROP INDEX `idx_numseries_code`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'NumberSeriesConfigurations' AND INDEX_NAME = 'SeriesCode');
SET @sql = IF(@idxcheck > 0, 'ALTER TABLE `NumberSeriesConfigurations` DROP INDEX `SeriesCode`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Step 1c: Add composite unique key (CollegeId, SeriesCode)
SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'NumberSeriesConfigurations' AND INDEX_NAME = 'UQ_NumberSeries_College_Code');
SET @sql = IF(@idxcheck = 0, 'ALTER TABLE `NumberSeriesConfigurations` ADD UNIQUE KEY `UQ_NumberSeries_College_Code` (`CollegeId`, `SeriesCode`);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 2. TEMPLATES TABLE (Add CollegeId & Composite Unique Key)
-- Step 2a: Add CollegeId column if not exists
SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'templates' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `templates` ADD COLUMN `CollegeId` INT NOT NULL DEFAULT 1 AFTER `Id`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Step 2b: Drop legacy single-column unique index if exists
SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'templates' AND INDEX_NAME = 'UX_templates_TemplateCode');
SET @sql = IF(@idxcheck > 0, 'ALTER TABLE `templates` DROP INDEX `UX_templates_TemplateCode`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Step 2c: Add composite unique key (CollegeId, TemplateCode)
SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'templates' AND INDEX_NAME = 'UX_templates_College_TemplateCode');
SET @sql = IF(@idxcheck = 0, 'ALTER TABLE `templates` ADD UNIQUE KEY `UX_templates_College_TemplateCode` (`CollegeId`, `TemplateCode`);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 3. DEPARTMENTS TABLE (Add CollegeId)
SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Departments' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `Departments` ADD COLUMN `CollegeId` INT NOT NULL DEFAULT 1 AFTER `DepartmentId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Departments' AND INDEX_NAME = 'IX_Departments_CollegeId');
SET @sql = IF(@idxcheck = 0, 'ALTER TABLE `Departments` ADD INDEX `IX_Departments_CollegeId` (`CollegeId`);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 4. DESIGNATIONS TABLE (Add CollegeId)
SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Designations' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `Designations` ADD COLUMN `CollegeId` INT NOT NULL DEFAULT 1 AFTER `DesignationId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Designations' AND INDEX_NAME = 'IX_Designations_CollegeId');
SET @sql = IF(@idxcheck = 0, 'ALTER TABLE `Designations` ADD INDEX `IX_Designations_CollegeId` (`CollegeId`);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 5. ACADEMIC CALENDAR EVENTS (Add CollegeId)
SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'AcademicCalendarEvents' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `AcademicCalendarEvents` ADD COLUMN `CollegeId` INT NOT NULL DEFAULT 1 AFTER `EventId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'AcademicCalendarEvents' AND INDEX_NAME = 'IX_AcademicCalendar_CollegeId');
SET @sql = IF(@idxcheck = 0, 'ALTER TABLE `AcademicCalendarEvents` ADD INDEX `IX_AcademicCalendar_CollegeId` (`CollegeId`);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'TIER2_CONFIGURATION_ALTERATIONS_COMPLETED' AS Status, NOW() AS CompletedAt;


-- =============================================================================
-- SECTION: 04_SuperAdmin_Data_Backfill.sql
-- =============================================================================

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


-- =============================================================================
-- SECTION: 05_SuperAdmin_Roles_Seed.sql
-- =============================================================================

-- =============================================================================
-- SCRIPT 05: 05_SuperAdmin_Roles_Seed.sql
-- PURPOSE: Idempotent RoleCode & Scope Seeding
-- ENVIRONMENT: MySQL 8.0 / CollegeManagement
-- CRITICAL REQUIREMENT: PRESERVE RoleName = 'Admin' for RoleId 2 for C# Controller Compatibility!
-- =============================================================================

USE `CollegeManagement`;

START TRANSACTION;

-- Upsert Canonical Platform & College Roles with RoleCode and Scope
-- INVARIANT: RoleName for RoleId 2 MUST remain 'Admin' so existing [Authorize(Roles = "Admin")] controllers continue working!
INSERT INTO `Roles` (`RoleId`, `RoleCode`, `RoleName`, `Description`, `StaffType`, `Scope`, `IsSystemRole`, `IsActive`)
VALUES 
(1, 'SUPER_ADMIN', 'Super Admin', 'Platform Owner with Global Administrative Rights', 'Both', 'PLATFORM', 1, 1),
(2, 'COLLEGE_ADMIN', 'Admin', 'Campus administrative control over academics, staff, students, and fees', 'Both', 'COLLEGE', 1, 1),
(3, 'HOD', 'HOD', 'Department timetable substitutions, subject allocations, and faculty approvals', 'Teaching', 'COLLEGE', 0, 1),
(4, 'FACULTY', 'Faculty', 'Daily student attendance, marks entry, syllabus, and personal leave', 'Teaching', 'COLLEGE', 1, 1),
(5, 'STUDENT', 'Student', 'Self-service attendance, timetable, results, fee receipts, and hall tickets', 'Both', 'COLLEGE', 1, 1),
(6, 'PARENT', 'Parent', 'Student academic progress, attendance, and fee notices', 'Both', 'COLLEGE', 0, 1),
(7, 'ACCOUNTS', 'Accounts', 'Fee structures, fee collection receipts, payroll, and salary processing', 'Non-Teaching', 'COLLEGE', 0, 1),
(8, 'EXAM_CELL', 'Examination Cell', 'Exam timetables, hall ticket generation, marks processing, and results', 'Both', 'COLLEGE', 0, 1),
(9, 'LIBRARIAN', 'Library / Librarian', 'Book cataloging, issue/return transactions, and student library cards', 'Non-Teaching', 'COLLEGE', 0, 1),
(10, 'HOSTEL_WARDEN', 'Hostel Warden', 'Block & room management, student bed allocations, and hostel attendance', 'Non-Teaching', 'COLLEGE', 0, 1),
(11, 'PLACEMENT_OFFICER', 'Placement Officer', 'Recruiter management, campus drive scheduling, and student placement eligibility', 'Non-Teaching', 'COLLEGE', 0, 1),
(12, 'BUS_DRIVER', 'Bus Driver', 'Assigned bus route view, student passenger checklist, and boarding attendance', 'Non-Teaching', 'COLLEGE', 0, 1)
ON DUPLICATE KEY UPDATE 
    `RoleCode` = VALUES(`RoleCode`),
    `Scope` = VALUES(`Scope`),
    `IsSystemRole` = VALUES(`IsSystemRole`),
    `IsActive` = VALUES(`IsActive`);

-- Verify canonical platform role invariant
UPDATE `Roles` SET `Scope` = 'PLATFORM' WHERE `RoleCode` = 'SUPER_ADMIN';
UPDATE `Roles` SET `Scope` = 'COLLEGE' WHERE `RoleCode` != 'SUPER_ADMIN';

COMMIT;

SELECT 'ROLES_SEED_COMPLETED_SUCCESSFULLY' AS Status, NOW() AS CompletedAt;


-- =============================================================================


-- =============================================================================
-- SECTION: 05B_SuperAdmin_User_Seed.sql
-- PURPOSE: Seed Super Admin Platform Account (Email: superadmin@pirnavcms.test)
-- =============================================================================

START TRANSACTION;

-- Seed Super Admin Platform Account with PBKDF2 hash for PirnavDemo@2026!
INSERT INTO Users (
    Username, Email, PasswordHash, FullName, RoleId, CollegeId, IsActive, CreatedAt
)
VALUES (
    'superadmin@pirnavcms.test',
    '+91 9000000000',
    '10000./5Tw0KP1f2hyYkc8rXZCsQ==.AF0DeVjTmJcBvNK/M5JXLN+lGYEkoWe0mvjZccWn+ho=',
    'Super Admin',
    1,
    NULL,
    1,
    CURRENT_TIMESTAMP(6)
)
ON DUPLICATE KEY UPDATE
    RoleId = 1,
    CollegeId = NULL,
    PasswordHash = VALUES(PasswordHash),
    IsActive = 1;

COMMIT;

SELECT 'SUPER_ADMIN_USER_SEEDED_SUCCESSFULLY' AS Status, NOW() AS CompletedAt;

-- SECTION: 07_SuperAdmin_Complete_StoredProcedures.sql
-- =============================================================================

-- =============================================================================
-- SCRIPT 07: 07_SuperAdmin_Complete_StoredProcedures.sql
-- PURPOSE: Complete Catalogue of 29 Super Admin Stored Procedures
-- ENVIRONMENT: MySQL 8.0 / CollegeManagement
-- CONCURRENCY: Row-Level Locking (FOR UPDATE) on Subscription Quotas
-- SECURITY: Last Active Super Admin Deactivation Protection & Multi-Tenant IDOR Guards
-- =============================================================================

USE `CollegeManagement`;

DELIMITER $$

-- =============================================================================
-- 1. sp_SuperAdmin_GetDashboardSummary
-- Multi-result set: (1) Counts, (2) Registrations Trend, (3) Plan Distribution
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetDashboardSummary`$$
CREATE PROCEDURE `sp_SuperAdmin_GetDashboardSummary`()
BEGIN
    -- Result 1: Core Dashboard Counts
    SELECT 
        (SELECT COUNT(*) FROM `Colleges` WHERE `IsDeleted` = 0) AS TotalColleges,
        (SELECT COUNT(*) FROM `Colleges` WHERE `Status` = 'Active' AND `IsDeleted` = 0) AS ActiveColleges,
        (SELECT COUNT(*) FROM `Colleges` WHERE `Status` = 'Inactive' AND `IsDeleted` = 0) AS InactiveColleges,
        (SELECT COUNT(*) FROM `Colleges` WHERE `Status` = 'Pending' AND `IsDeleted` = 0) AS PendingRegistrations,
        (SELECT COUNT(*) FROM `Users` WHERE `IsActive` = 1 AND `CollegeId` IS NOT NULL) AS ActiveLoginAccounts,
        (SELECT COUNT(*) FROM `Colleges` WHERE `SubscriptionStatus` = 'Free' AND `IsDeleted` = 0) AS FreePlanColleges,
        (SELECT COUNT(*) FROM `Colleges` WHERE `SubscriptionStatus` = 'Active' AND `IsDeleted` = 0) AS PaidPlanColleges,
        (SELECT IFNULL(SUM(`Amount`), 0.00) FROM `PlatformInvoices` WHERE `Status` = 'Paid' AND `InvoiceDate` >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS MonthlyRevenue;

    -- Result 2: 6-Month Registration Trend
    SELECT 
        DATE_FORMAT(`RegisteredAt`, '%b %Y') AS MonthName,
        COUNT(*) AS TotalRegistrations
    FROM `Colleges`
    WHERE `RegisteredAt` >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) AND `IsDeleted` = 0
    GROUP BY DATE_FORMAT(`RegisteredAt`, '%Y-%m'), DATE_FORMAT(`RegisteredAt`, '%b %Y')
    ORDER BY DATE_FORMAT(`RegisteredAt`, '%Y-%m') ASC;

    -- Result 3: Plan Distribution
    SELECT 
        p.`PlanName`,
        COUNT(c.`CollegeId`) AS CollegeCount
    FROM `SubscriptionPlans` p
    LEFT JOIN `CollegeSubscriptions` cs ON p.`PlanId` = cs.`PlanId`
    LEFT JOIN `Colleges` c ON cs.`CollegeId` = c.`CollegeId` AND c.`IsDeleted` = 0
    WHERE p.`IsDeleted` = 0
    GROUP BY p.`PlanId`, p.`PlanName`;
END$$


-- =============================================================================
-- 2. sp_SuperAdmin_GetCollegesPaged
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetCollegesPaged`$$
CREATE PROCEDURE `sp_SuperAdmin_GetCollegesPaged`(
    IN p_SearchTerm VARCHAR(100),
    IN p_Status VARCHAR(20),
    IN p_PlanId INT,
    IN p_Page INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT DEFAULT 0;
    SET p_Page = IFNULL(p_Page, 1);
    SET p_PageSize = IFNULL(p_PageSize, 10);
    IF p_Page < 1 THEN SET p_Page = 1; END IF;
    IF p_PageSize < 1 THEN SET p_PageSize = 10; END IF;
    SET v_Offset = (p_Page - 1) * p_PageSize;

    -- Metadata: Total Count
    SELECT COUNT(*) AS TotalCount
    FROM `Colleges` c
    LEFT JOIN `CollegeSubscriptions` cs ON c.`CollegeId` = cs.`CollegeId`
    WHERE c.`IsDeleted` = 0
      AND (p_Status IS NULL OR p_Status = '' OR c.`Status` = p_Status)
      AND (p_PlanId IS NULL OR p_PlanId = 0 OR cs.`PlanId` = p_PlanId)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' 
           OR c.`CollegeName` LIKE CONCAT('%', p_SearchTerm, '%')
           OR c.`CollegeCode` LIKE CONCAT('%', p_SearchTerm, '%')
           OR c.`OfficialEmail` LIKE CONCAT('%', p_SearchTerm, '%'));

    -- Paged Records
    SELECT 
        c.`CollegeId`,
        c.`CollegeCode`,
        c.`CollegeName`,
        c.`OfficialEmail`,
        c.`ContactPhone`,
        c.`Address`,
        c.`LogoUrl`,
        c.`Status`,
        c.`SubscriptionStatus`,
        c.`RegisteredAt`,
        COALESCE(p.`PlanName`, 'Free') AS PlanName,
        COALESCE(p.`AccountLimit`, 25) AS AccountLimit,
        (SELECT COUNT(*) FROM `Users` u WHERE u.`CollegeId` = c.`CollegeId` AND u.`IsActive` = 1) AS ActiveUsersCount,
        (SELECT COUNT(*) FROM `Campuses` camp WHERE camp.`CollegeId` = c.`CollegeId`) AS TotalCampuses
    FROM `Colleges` c
    LEFT JOIN `CollegeSubscriptions` cs ON c.`CollegeId` = cs.`CollegeId`
    LEFT JOIN `SubscriptionPlans` p ON cs.`PlanId` = p.`PlanId`
    WHERE c.`IsDeleted` = 0
      AND (p_Status IS NULL OR p_Status = '' OR c.`Status` = p_Status)
      AND (p_PlanId IS NULL OR p_PlanId = 0 OR cs.`PlanId` = p_PlanId)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' 
           OR c.`CollegeName` LIKE CONCAT('%', p_SearchTerm, '%')
           OR c.`CollegeCode` LIKE CONCAT('%', p_SearchTerm, '%')
           OR c.`OfficialEmail` LIKE CONCAT('%', p_SearchTerm, '%'))
    ORDER BY c.`CollegeId` DESC
    LIMIT p_PageSize OFFSET v_Offset;
END$$


-- =============================================================================
-- 3. sp_SuperAdmin_GetCollegeById
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetCollegeById`$$
CREATE PROCEDURE `sp_SuperAdmin_GetCollegeById`(IN p_CollegeId INT)
BEGIN
    SELECT 
        c.`CollegeId`,
        c.`CollegeCode`,
        c.`CollegeName`,
        c.`OfficialEmail`,
        c.`ContactPhone`,
        c.`Address`,
        c.`LogoUrl`,
        c.`Status`,
        c.`SubscriptionStatus`,
        c.`SubscriptionStartDate`,
        c.`RenewalDate`,
        c.`RegisteredAt`,
        COALESCE(p.`PlanName`, 'Free') AS CurrentPlanName,
        COALESCE(p.`AccountLimit`, 25) AS AccountLimit,
        (SELECT COUNT(*) FROM `Users` u WHERE u.`CollegeId` = c.`CollegeId` AND u.`IsActive` = 1) AS ActiveUsersCount,
        (SELECT COUNT(*) FROM `Campuses` camp WHERE camp.`CollegeId` = c.`CollegeId`) AS TotalCampuses,
        (SELECT u.`Email` FROM `Users` u JOIN `Roles` r ON u.`RoleId` = r.`RoleId` WHERE u.`CollegeId` = c.`CollegeId` AND r.`RoleCode` = 'COLLEGE_ADMIN' LIMIT 1) AS AdminEmail,
        (SELECT u.`FullName` FROM `Users` u JOIN `Roles` r ON u.`RoleId` = r.`RoleId` WHERE u.`CollegeId` = c.`CollegeId` AND r.`RoleCode` = 'COLLEGE_ADMIN' LIMIT 1) AS AdminFullName
    FROM `Colleges` c
    LEFT JOIN `CollegeSubscriptions` cs ON c.`CollegeId` = cs.`CollegeId`
    LEFT JOIN `SubscriptionPlans` p ON cs.`PlanId` = p.`PlanId`
    WHERE c.`CollegeId` = p_CollegeId AND c.`IsDeleted` = 0;
END$$


-- =============================================================================
-- 4. sp_SuperAdmin_CreateCollegeWithAdmin (ACID Multi-Table Provisioning)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_CreateCollegeWithAdmin`$$
CREATE PROCEDURE `sp_SuperAdmin_CreateCollegeWithAdmin`(
    IN p_CollegeCode VARCHAR(50),
    IN p_CollegeName VARCHAR(150),
    IN p_OfficialEmail VARCHAR(150),
    IN p_ContactPhone VARCHAR(50),
    IN p_Address VARCHAR(500),
    IN p_LogoUrl VARCHAR(500),
    IN p_AdminFullName VARCHAR(150),
    IN p_AdminEmail VARCHAR(150),
    IN p_AdminPasswordHash VARCHAR(255),
    IN p_CreatedBy INT,
    OUT p_NewCollegeId INT
)
BEGIN
    DECLARE v_AdminRoleId INT;
    DECLARE v_CampusId INT;
    DECLARE v_CollegeId INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Assert Code & Email uniqueness
    IF EXISTS (SELECT 1 FROM `Colleges` WHERE `CollegeCode` = p_CollegeCode) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_COLLEGE_CODE: College Code is already in use.';
    END IF;

    IF EXISTS (SELECT 1 FROM `Colleges` WHERE `OfficialEmail` = p_OfficialEmail) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_COLLEGE_EMAIL: Official Email is already in use.';
    END IF;

    IF p_AdminEmail IS NOT NULL AND p_AdminEmail != '' THEN
        IF EXISTS (SELECT 1 FROM `Users` WHERE `Email` = p_AdminEmail) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_ADMIN_EMAIL: Administrator Email is already registered.';
        END IF;
    END IF;

    -- Resolve College Admin RoleId
    SELECT `RoleId` INTO v_AdminRoleId
    FROM `Roles`
    WHERE `RoleCode` = 'COLLEGE_ADMIN' OR `RoleName` = 'Admin'
    ORDER BY `RoleId` ASC LIMIT 1;

    START TRANSACTION;

    -- Step 1: Create College
    INSERT INTO `Colleges` (
        `CollegeCode`, `CollegeName`, `OfficialEmail`, `ContactPhone`, 
        `Address`, `LogoUrl`, `Status`, `SubscriptionStatus`, 
        `SubscriptionStartDate`, `RenewalDate`, `CreatedBy`
    )
    VALUES (
        p_CollegeCode, p_CollegeName, p_OfficialEmail, p_ContactPhone, 
        p_Address, p_LogoUrl, 'Active', 'Active', 
        CURDATE(), DATE_ADD(CURDATE(), INTERVAL 365 DAY), p_CreatedBy
    );
    SET v_CollegeId = LAST_INSERT_ID();
    SET p_NewCollegeId = v_CollegeId;

    -- Step 2: Create Default HQ Campus
    INSERT INTO `Campuses` (
        `CollegeId`, `CampusName`, `CampusCode`, `Address`, `ContactPhone`, `Email`
    )
    VALUES (
        v_CollegeId, CONCAT(p_CollegeName, ' - Main Campus'), CONCAT(p_CollegeCode, '-HQ'), 
        p_Address, p_ContactPhone, p_OfficialEmail
    );
    SET v_CampusId = LAST_INSERT_ID();

    -- Step 3: Associate Initial Free Subscription
    INSERT INTO `CollegeSubscriptions` (
        `CollegeId`, `PlanId`, `StartDate`, `RenewalDate`, `Status`, `AutoRenew`
    )
    VALUES (
        v_CollegeId, 1, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 365 DAY), 'Active', 1
    );

    -- Step 4: Create College Administrator User (if details provided)
    IF p_AdminEmail IS NOT NULL AND p_AdminEmail != '' AND p_AdminPasswordHash IS NOT NULL THEN
        INSERT INTO `Users` (
            `CollegeId`, `RoleId`, `Email`, `PhoneNumber`, `PasswordHash`, 
            `FullName`, `IsActive`, `IsFirstLogin`, `CreatedAt`
        )
        VALUES (
            v_CollegeId, v_AdminRoleId, p_AdminEmail, COALESCE(p_ContactPhone, '+91 9000000000'), p_AdminPasswordHash, 
            p_AdminFullName, 1, 1, CURRENT_TIMESTAMP(6)
        );
    END IF;

    -- Step 5: Audit Log
    INSERT INTO `AuditLogs` (`CollegeId`, `Action`, `EntityName`, `EntityId`, `Description`, `CreatedAt`)
    VALUES (v_CollegeId, 'CREATE_COLLEGE', 'Colleges', v_CollegeId, CONCAT('College created: ', p_CollegeName), CURRENT_TIMESTAMP(6));

    COMMIT;
END$$


-- =============================================================================
-- 5. sp_SuperAdmin_UpdateCollege
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_UpdateCollege`$$
CREATE PROCEDURE `sp_SuperAdmin_UpdateCollege`(
    IN p_CollegeId INT,
    IN p_CollegeName VARCHAR(150),
    IN p_OfficialEmail VARCHAR(150),
    IN p_ContactPhone VARCHAR(50),
    IN p_Address VARCHAR(500),
    IN p_LogoUrl VARCHAR(500),
    IN p_UpdatedBy INT
)
BEGIN
    UPDATE `Colleges`
    SET `CollegeName` = p_CollegeName,
        `OfficialEmail` = p_OfficialEmail,
        `ContactPhone` = p_ContactPhone,
        `Address` = p_Address,
        `LogoUrl` = p_LogoUrl,
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `CollegeId` = p_CollegeId AND `IsDeleted` = 0;
END$$


-- =============================================================================
-- 6. sp_SuperAdmin_UpdateCollegeStatus
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_UpdateCollegeStatus`$$
CREATE PROCEDURE `sp_SuperAdmin_UpdateCollegeStatus`(
    IN p_CollegeId INT,
    IN p_Status VARCHAR(20),
    IN p_UpdatedBy INT
)
BEGIN
    UPDATE `Colleges`
    SET `Status` = p_Status,
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `CollegeId` = p_CollegeId AND `IsDeleted` = 0;

    INSERT INTO `AuditLogs` (`CollegeId`, `Action`, `EntityName`, `EntityId`, `Description`, `CreatedAt`)
    VALUES (p_CollegeId, 'UPDATE_COLLEGE_STATUS', 'Colleges', p_CollegeId, CONCAT('College status changed to: ', p_Status), CURRENT_TIMESTAMP(6));
END$$


-- =============================================================================
-- 7. sp_SuperAdmin_GetCollegeAdmins
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetCollegeAdmins`$$
CREATE PROCEDURE `sp_SuperAdmin_GetCollegeAdmins`(
    IN p_CollegeId INT,
    IN p_SearchTerm VARCHAR(100),
    IN p_Status VARCHAR(20)
)
BEGIN
    SELECT 
        u.`UserId`,
        u.`FullName`,
        u.`Email`,
        u.`IsActive`,
        u.`CollegeId`,
        c.`CollegeName`,
        r.`RoleName`,
        u.`CreatedAt`
    FROM `Users` u
    JOIN `Roles` r ON u.`RoleId` = r.`RoleId`
    LEFT JOIN `Colleges` c ON u.`CollegeId` = c.`CollegeId`
    WHERE (r.`RoleCode` = 'COLLEGE_ADMIN' OR r.`RoleName` = 'Admin')
      AND (p_CollegeId IS NULL OR p_CollegeId = 0 OR u.`CollegeId` = p_CollegeId)
      AND (p_Status IS NULL OR p_Status = '' OR (p_Status = 'Active' AND u.`IsActive` = 1) OR (p_Status = 'Inactive' AND u.`IsActive` = 0))
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' 
           OR u.`FullName` LIKE CONCAT('%', p_SearchTerm, '%')
           OR u.`Email` LIKE CONCAT('%', p_SearchTerm, '%')
           OR c.`CollegeName` LIKE CONCAT('%', p_SearchTerm, '%'))
    ORDER BY u.`UserId` DESC;
END$$


-- =============================================================================
-- 8. sp_SuperAdmin_CreateCollegeAdmin
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_CreateCollegeAdmin`$$
CREATE PROCEDURE `sp_SuperAdmin_CreateCollegeAdmin`(
    IN p_CollegeId INT,
    IN p_FullName VARCHAR(150),
    IN p_Email VARCHAR(150),
    IN p_PasswordHash VARCHAR(255),
    IN p_CreatedBy INT,
    OUT p_NewUserId INT
)
BEGIN
    DECLARE v_AdminRoleId INT;

    IF EXISTS (SELECT 1 FROM `Users` WHERE `Email` = p_Email) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_USER_EMAIL: An account with this email already exists.';
    END IF;

    SELECT `RoleId` INTO v_AdminRoleId
    FROM `Roles`
    WHERE `RoleCode` = 'COLLEGE_ADMIN' OR `RoleName` = 'Admin'
    ORDER BY `RoleId` ASC LIMIT 1;

    INSERT INTO `Users` (
        `CollegeId`, `RoleId`, `Email`, `PhoneNumber`, `PasswordHash`, 
        `FullName`, `IsActive`, `IsFirstLogin`, `CreatedAt`
    )
    VALUES (
        p_CollegeId, v_AdminRoleId, p_Email, '+91 9000000000', p_PasswordHash, 
        p_FullName, 1, 1, CURRENT_TIMESTAMP(6)
    );

    SET p_NewUserId = LAST_INSERT_ID();
END$$


-- =============================================================================
-- 9. sp_SuperAdmin_GetGlobalUsersPaged
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetGlobalUsersPaged`$$
CREATE PROCEDURE `sp_SuperAdmin_GetGlobalUsersPaged`(
    IN p_CollegeId INT,
    IN p_RoleId INT,
    IN p_Status VARCHAR(20),
    IN p_SearchTerm VARCHAR(100),
    IN p_Page INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT DEFAULT 0;
    SET p_Page = IFNULL(p_Page, 1);
    SET p_PageSize = IFNULL(p_PageSize, 10);
    IF p_Page < 1 THEN SET p_Page = 1; END IF;
    IF p_PageSize < 1 THEN SET p_PageSize = 10; END IF;
    SET v_Offset = (p_Page - 1) * p_PageSize;

    SELECT COUNT(*) AS TotalCount
    FROM `Users` u
    JOIN `Roles` r ON u.`RoleId` = r.`RoleId`
    LEFT JOIN `Colleges` c ON u.`CollegeId` = c.`CollegeId`
    WHERE (p_CollegeId IS NULL OR p_CollegeId = 0 OR u.`CollegeId` = p_CollegeId)
      AND (p_RoleId IS NULL OR p_RoleId = 0 OR u.`RoleId` = p_RoleId)
      AND (p_Status IS NULL OR p_Status = '' OR (p_Status = 'Active' AND u.`IsActive` = 1) OR (p_Status = 'Inactive' AND u.`IsActive` = 0))
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' 
           OR u.`FullName` LIKE CONCAT('%', p_SearchTerm, '%')
           OR u.`Email` LIKE CONCAT('%', p_SearchTerm, '%')
           OR c.`CollegeName` LIKE CONCAT('%', p_SearchTerm, '%'));

    SELECT 
        u.`UserId`,
        u.`FullName`,
        u.`Email`,
        u.`IsActive`,
        u.`CollegeId`,
        COALESCE(c.`CollegeName`, 'Platform Super Admin') AS CollegeName,
        r.`RoleId`,
        r.`RoleName`,
        r.`RoleCode`,
        r.`Scope`,
        u.`CreatedAt`
    FROM `Users` u
    JOIN `Roles` r ON u.`RoleId` = r.`RoleId`
    LEFT JOIN `Colleges` c ON u.`CollegeId` = c.`CollegeId`
    WHERE (p_CollegeId IS NULL OR p_CollegeId = 0 OR u.`CollegeId` = p_CollegeId)
      AND (p_RoleId IS NULL OR p_RoleId = 0 OR u.`RoleId` = p_RoleId)
      AND (p_Status IS NULL OR p_Status = '' OR (p_Status = 'Active' AND u.`IsActive` = 1) OR (p_Status = 'Inactive' AND u.`IsActive` = 0))
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' 
           OR u.`FullName` LIKE CONCAT('%', p_SearchTerm, '%')
           OR u.`Email` LIKE CONCAT('%', p_SearchTerm, '%')
           OR c.`CollegeName` LIKE CONCAT('%', p_SearchTerm, '%'))
    ORDER BY u.`UserId` DESC
    LIMIT p_PageSize OFFSET v_Offset;
END$$


-- =============================================================================
-- 10. sp_SuperAdmin_GetUserDetail
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetUserDetail`$$
CREATE PROCEDURE `sp_SuperAdmin_GetUserDetail`(IN p_UserId INT)
BEGIN
    SELECT 
        u.`UserId`,
        u.`FullName`,
        u.`Email`,
        u.`IsActive`,
        u.`CollegeId`,
        COALESCE(c.`CollegeName`, 'Platform Super Admin') AS CollegeName,
        r.`RoleId`,
        r.`RoleName`,
        r.`RoleCode`,
        r.`Scope`,
        u.`StudentId`,
        u.`StaffId`,
        u.`CreatedAt`
    FROM `Users` u
    JOIN `Roles` r ON u.`RoleId` = r.`RoleId`
    LEFT JOIN `Colleges` c ON u.`CollegeId` = c.`CollegeId`
    WHERE u.`UserId` = p_UserId;
END$$


-- =============================================================================
-- 11. sp_SuperAdmin_UpdateUserStatus
-- CONCURRENCY GUARD: Row-Level Lock (FOR UPDATE) on Quota
-- SECURITY GUARD: Blocks Deactivation of the Last Active Super Admin
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_UpdateUserStatus`$$
CREATE PROCEDURE `sp_SuperAdmin_UpdateUserStatus`(
    IN p_UserId INT,
    IN p_IsActive TINYINT(1),
    IN p_UpdatedBy INT
)
BEGIN
    DECLARE v_TargetRoleCode VARCHAR(50);
    DECLARE v_CollegeId INT;
    DECLARE v_ActiveSuperAdminCount INT;
    DECLARE v_AccountLimit INT;
    DECLARE v_CurrentActiveCount INT;

    SELECT r.`RoleCode`, u.`CollegeId` INTO v_TargetRoleCode, v_CollegeId
    FROM `Users` u
    JOIN `Roles` r ON u.`RoleId` = r.`RoleId`
    WHERE u.`UserId` = p_UserId;

    -- Guard 1: Protect Last Active Super Admin
    IF (v_TargetRoleCode = 'SUPER_ADMIN' AND p_IsActive = 0) THEN
        SELECT COUNT(*) INTO v_ActiveSuperAdminCount
        FROM `Users` u
        JOIN `Roles` r ON u.`RoleId` = r.`RoleId`
        WHERE r.`RoleCode` = 'SUPER_ADMIN' AND u.`IsActive` = 1;

        IF (v_ActiveSuperAdminCount <= 1) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CANNOT_DEACTIVATE_LAST_SUPER_ADMIN: Total platform lockout protection triggered.';
        END IF;
    END IF;

    -- Guard 2: Enforce Plan Quota on Account Reactivation (FOR UPDATE row lock)
    IF (p_IsActive = 1 AND v_CollegeId IS NOT NULL) THEN
        SELECT p.`AccountLimit` INTO v_AccountLimit
        FROM `CollegeSubscriptions` cs
        JOIN `SubscriptionPlans` p ON cs.`PlanId` = p.`PlanId`
        WHERE cs.`CollegeId` = v_CollegeId
        FOR UPDATE;

        SELECT COUNT(*) INTO v_CurrentActiveCount
        FROM `Users` u
        JOIN `Roles` r ON u.`RoleId` = r.`RoleId`
        WHERE u.`CollegeId` = v_CollegeId AND u.`IsActive` = 1 AND r.`RoleCode` != 'SUPER_ADMIN';

        IF (v_AccountLimit IS NOT NULL AND v_CurrentActiveCount >= v_AccountLimit) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'QUOTA_EXCEEDED: Cannot activate account: College active account limit reached.';
        END IF;
    END IF;

    -- Update User Status
    UPDATE `Users`
    SET `IsActive` = p_IsActive
    WHERE `UserId` = p_UserId;

    INSERT INTO `AuditLogs` (`CollegeId`, `Action`, `EntityName`, `EntityId`, `Description`, `CreatedAt`)
    VALUES (v_CollegeId, 'UPDATE_USER_STATUS', 'Users', p_UserId, CONCAT('User status updated to: ', p_IsActive), CURRENT_TIMESTAMP(6));
END$$


-- =============================================================================
-- 12. sp_SuperAdmin_ResetUserPassword
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_ResetUserPassword`$$
CREATE PROCEDURE `sp_SuperAdmin_ResetUserPassword`(
    IN p_UserId INT,
    IN p_NewPasswordHash VARCHAR(255),
    IN p_UpdatedBy INT
)
BEGIN
    UPDATE `Users`
    SET `PasswordHash` = p_NewPasswordHash,
        `IsFirstLogin` = 1
    WHERE `UserId` = p_UserId;

    INSERT INTO `AuditLogs` (`Action`, `EntityName`, `EntityId`, `Description`, `CreatedAt`)
    VALUES ('RESET_PASSWORD', 'Users', p_UserId, 'Administrative password reset triggered by Super Admin', CURRENT_TIMESTAMP(6));
END$$


-- =============================================================================
-- 13. sp_SuperAdmin_GetAllPlans
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetAllPlans`$$
CREATE PROCEDURE `sp_SuperAdmin_GetAllPlans`()
BEGIN
    SELECT 
        p.`PlanId`,
        p.`PlanName`,
        p.`Description`,
        p.`Price`,
        p.`DurationDays`,
        p.`AccountLimit`,
        p.`IsActive`,
        (SELECT COUNT(*) FROM `CollegeSubscriptions` cs WHERE cs.`PlanId` = p.`PlanId`) AS AssignedCollegesCount
    FROM `SubscriptionPlans` p
    WHERE p.`IsDeleted` = 0
    ORDER BY p.`Price` ASC;
END$$


-- =============================================================================
-- 14. sp_SuperAdmin_SavePlan
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_SavePlan`$$
CREATE PROCEDURE `sp_SuperAdmin_SavePlan`(
    IN p_PlanId INT,
    IN p_PlanName VARCHAR(100),
    IN p_Description VARCHAR(500),
    IN p_Price DECIMAL(12,2),
    IN p_DurationDays INT,
    IN p_AccountLimit INT,
    IN p_UpdatedBy INT,
    OUT p_ResultPlanId INT
)
BEGIN
    IF (p_PlanId IS NULL OR p_PlanId = 0) THEN
        INSERT INTO `SubscriptionPlans` (
            `PlanName`, `Description`, `Price`, `DurationDays`, `AccountLimit`, `IsActive`, `CreatedBy`
        )
        VALUES (
            p_PlanName, p_Description, p_Price, p_DurationDays, p_AccountLimit, 1, p_UpdatedBy
        );
        SET p_ResultPlanId = LAST_INSERT_ID();
    ELSE
        UPDATE `SubscriptionPlans`
        SET `PlanName` = p_PlanName,
            `Description` = p_Description,
            `Price` = p_Price,
            `DurationDays` = p_DurationDays,
            `AccountLimit` = p_AccountLimit,
            `UpdatedBy` = p_UpdatedBy,
            `UpdatedAt` = CURRENT_TIMESTAMP(6)
        WHERE `PlanId` = p_PlanId;
        SET p_ResultPlanId = p_PlanId;
    END IF;
END$$


-- =============================================================================
-- 15. sp_SuperAdmin_UpdatePlanStatus
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_UpdatePlanStatus`$$
CREATE PROCEDURE `sp_SuperAdmin_UpdatePlanStatus`(
    IN p_PlanId INT,
    IN p_IsActive TINYINT(1),
    IN p_UpdatedBy INT
)
BEGIN
    UPDATE `SubscriptionPlans`
    SET `IsActive` = p_IsActive,
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `PlanId` = p_PlanId;
END$$


-- =============================================================================
-- 16. sp_SuperAdmin_GetCollegeSubscriptions
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetCollegeSubscriptions`$$
CREATE PROCEDURE `sp_SuperAdmin_GetCollegeSubscriptions`(
    IN p_Status VARCHAR(20),
    IN p_SearchTerm VARCHAR(100)
)
BEGIN
    SELECT 
        cs.`SubscriptionId`,
        cs.`CollegeId`,
        c.`CollegeName`,
        cs.`PlanId`,
        p.`PlanName`,
        cs.`StartDate`,
        cs.`RenewalDate`,
        cs.`Status`,
        cs.`AutoRenew`,
        p.`AccountLimit`,
        (SELECT COUNT(*) FROM `Users` u WHERE u.`CollegeId` = cs.`CollegeId` AND u.`IsActive` = 1) AS ActiveUsersCount,
        DATEDIFF(cs.`RenewalDate`, CURDATE()) AS DaysRemaining
    FROM `CollegeSubscriptions` cs
    JOIN `Colleges` c ON cs.`CollegeId` = c.`CollegeId`
    JOIN `SubscriptionPlans` p ON cs.`PlanId` = p.`PlanId`
    WHERE c.`IsDeleted` = 0
      AND (p_Status IS NULL OR p_Status = '' OR cs.`Status` = p_Status)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR c.`CollegeName` LIKE CONCAT('%', p_SearchTerm, '%'))
    ORDER BY cs.`RenewalDate` ASC;
END$$


-- =============================================================================
-- 17. sp_SuperAdmin_ChangeCollegePlan
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_ChangeCollegePlan`$$
CREATE PROCEDURE `sp_SuperAdmin_ChangeCollegePlan`(
    IN p_CollegeId INT,
    IN p_NewPlanId INT,
    IN p_UpdatedBy INT
)
BEGIN
    DECLARE v_PreviousPlanId INT;
    DECLARE v_DurationDays INT;

    SELECT `PlanId` INTO v_PreviousPlanId FROM `CollegeSubscriptions` WHERE `CollegeId` = p_CollegeId;
    SELECT `DurationDays` INTO v_DurationDays FROM `SubscriptionPlans` WHERE `PlanId` = p_NewPlanId;

    START TRANSACTION;

    UPDATE `CollegeSubscriptions`
    SET `PlanId` = p_NewPlanId,
        `Status` = 'Active',
        `RenewalDate` = DATE_ADD(CURDATE(), INTERVAL v_DurationDays DAY),
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `CollegeId` = p_CollegeId;

    UPDATE `Colleges`
    SET `CurrentPlanId` = p_NewPlanId,
        `SubscriptionStatus` = 'Active',
        `RenewalDate` = DATE_ADD(CURDATE(), INTERVAL v_DurationDays DAY)
    WHERE `CollegeId` = p_CollegeId;

    INSERT INTO `AuditLogs` (`CollegeId`, `Action`, `EntityName`, `EntityId`, `Description`, `CreatedAt`)
    VALUES (p_CollegeId, 'CHANGE_PLAN', 'CollegeSubscriptions', p_CollegeId, CONCAT('Plan changed from ', v_PreviousPlanId, ' to ', p_NewPlanId), CURRENT_TIMESTAMP(6));

    COMMIT;
END$$


-- =============================================================================
-- 18. sp_SuperAdmin_RenewCollegeSubscription
-- Preserves previous cycle: RenewalDate = PreviousRenewalDate + PlanDuration
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_RenewCollegeSubscription`$$
CREATE PROCEDURE `sp_SuperAdmin_RenewCollegeSubscription`(
    IN p_CollegeId INT,
    IN p_DaysToAdd INT,
    IN p_UpdatedBy INT
)
BEGIN
    DECLARE v_CurrentRenewalDate DATE;
    DECLARE v_NewRenewalDate DATE;
    DECLARE v_PlanId INT;
    DECLARE v_PlanPrice DECIMAL(12,2);

    SELECT `RenewalDate`, `PlanId` INTO v_CurrentRenewalDate, v_PlanId 
    FROM `CollegeSubscriptions` WHERE `CollegeId` = p_CollegeId;

    SELECT `Price` INTO v_PlanPrice FROM `SubscriptionPlans` WHERE `PlanId` = v_PlanId;

    -- Cycle Preservation: Calculate from previous expiration date
    IF v_CurrentRenewalDate >= CURDATE() THEN
        SET v_NewRenewalDate = DATE_ADD(v_CurrentRenewalDate, INTERVAL p_DaysToAdd DAY);
    ELSE
        SET v_NewRenewalDate = DATE_ADD(CURDATE(), INTERVAL p_DaysToAdd DAY);
    END IF;

    START TRANSACTION;

    UPDATE `CollegeSubscriptions`
    SET `RenewalDate` = v_NewRenewalDate,
        `Status` = 'Active',
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `CollegeId` = p_CollegeId;

    UPDATE `Colleges`
    SET `RenewalDate` = v_NewRenewalDate,
        `SubscriptionStatus` = 'Active'
    WHERE `CollegeId` = p_CollegeId;

    INSERT INTO `SubscriptionRenewalHistory` (
        `CollegeId`, `PlanId`, `PreviousRenewalDate`, `NewRenewalDate`, `AmountPaid`, `RenewedAt`
    )
    VALUES (
        p_CollegeId, v_PlanId, v_CurrentRenewalDate, v_NewRenewalDate, IFNULL(v_PlanPrice, 0.00), CURRENT_TIMESTAMP(6)
    );

    COMMIT;
END$$


-- =============================================================================
-- 19. sp_SuperAdmin_CancelCollegeSubscription
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_CancelCollegeSubscription`$$
CREATE PROCEDURE `sp_SuperAdmin_CancelCollegeSubscription`(
    IN p_CollegeId INT,
    IN p_UpdatedBy INT
)
BEGIN
    START TRANSACTION;

    UPDATE `CollegeSubscriptions`
    SET `PlanId` = 1, -- Revert to Free plan
        `Status` = 'Cancelled',
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `CollegeId` = p_CollegeId;

    UPDATE `Colleges`
    SET `CurrentPlanId` = 1,
        `SubscriptionStatus` = 'Cancelled'
    WHERE `CollegeId` = p_CollegeId;

    INSERT INTO `AuditLogs` (`CollegeId`, `Action`, `EntityName`, `EntityId`, `Description`, `CreatedAt`)
    VALUES (p_CollegeId, 'CANCEL_SUBSCRIPTION', 'CollegeSubscriptions', p_CollegeId, 'Subscription cancelled; reverted to Free tier', CURRENT_TIMESTAMP(6));

    COMMIT;
END$$


-- =============================================================================
-- 20. sp_SuperAdmin_GetAccountUsageStats
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetAccountUsageStats`$$
CREATE PROCEDURE `sp_SuperAdmin_GetAccountUsageStats`()
BEGIN
    SELECT 
        c.`CollegeId`,
        c.`CollegeName`,
        p.`PlanName`,
        p.`AccountLimit`,
        (SELECT COUNT(*) FROM `Users` u WHERE u.`CollegeId` = c.`CollegeId` AND u.`IsActive` = 1) AS ActiveUsersCount,
        ROUND(((SELECT COUNT(*) FROM `Users` u WHERE u.`CollegeId` = c.`CollegeId` AND u.`IsActive` = 1) / p.`AccountLimit`) * 100, 1) AS UsagePercentage
    FROM `Colleges` c
    JOIN `CollegeSubscriptions` cs ON c.`CollegeId` = cs.`CollegeId`
    JOIN `SubscriptionPlans` p ON cs.`PlanId` = p.`PlanId`
    WHERE c.`IsDeleted` = 0
    ORDER BY UsagePercentage DESC;
END$$


-- =============================================================================
-- 21. sp_SuperAdmin_GetRenewalsPaged
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetRenewalsPaged`$$
CREATE PROCEDURE `sp_SuperAdmin_GetRenewalsPaged`(
    IN p_DaysAhead INT,
    IN p_PlanId INT
)
BEGIN
    SET p_DaysAhead = IFNULL(p_DaysAhead, 30);

    SELECT 
        cs.`SubscriptionId`,
        cs.`CollegeId`,
        c.`CollegeName`,
        c.`OfficialEmail`,
        p.`PlanName`,
        cs.`RenewalDate`,
        DATEDIFF(cs.`RenewalDate`, CURDATE()) AS DaysRemaining,
        cs.`Status`
    FROM `CollegeSubscriptions` cs
    JOIN `Colleges` c ON cs.`CollegeId` = c.`CollegeId`
    JOIN `SubscriptionPlans` p ON cs.`PlanId` = p.`PlanId`
    WHERE c.`IsDeleted` = 0
      AND (p_PlanId IS NULL OR p_PlanId = 0 OR cs.`PlanId` = p_PlanId)
      AND cs.`RenewalDate` <= DATE_ADD(CURDATE(), INTERVAL p_DaysAhead DAY)
    ORDER BY cs.`RenewalDate` ASC;
END$$


-- =============================================================================
-- 22. sp_SuperAdmin_GetPaymentsAndInvoices
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetPaymentsAndInvoices`$$
CREATE PROCEDURE `sp_SuperAdmin_GetPaymentsAndInvoices`()
BEGIN
    -- Invoices Ledger
    SELECT 
        inv.`InvoiceId`,
        inv.`InvoiceNumber`,
        inv.`CollegeId`,
        c.`CollegeName`,
        p.`PlanName`,
        inv.`Amount`,
        inv.`InvoiceDate`,
        inv.`DueDate`,
        inv.`Status`
    FROM `PlatformInvoices` inv
    JOIN `Colleges` c ON inv.`CollegeId` = c.`CollegeId`
    JOIN `SubscriptionPlans` p ON inv.`PlanId` = p.`PlanId`
    ORDER BY inv.`InvoiceId` DESC;

    -- Payments Ledger
    SELECT 
        pay.`PaymentId`,
        pay.`PaymentIdentifier`,
        pay.`InvoiceId`,
        pay.`CollegeId`,
        c.`CollegeName`,
        pay.`Amount`,
        pay.`PaymentDate`,
        pay.`PaymentMethod`,
        pay.`Status`,
        pay.`TransactionReference`
    FROM `PlatformPayments` pay
    JOIN `Colleges` c ON pay.`CollegeId` = c.`CollegeId`
    ORDER BY pay.`PaymentId` DESC;
END$$


-- =============================================================================
-- 23. sp_SuperAdmin_VerifyPlatformPayment
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_VerifyPlatformPayment`$$
CREATE PROCEDURE `sp_SuperAdmin_VerifyPlatformPayment`(
    IN p_PaymentId INT,
    IN p_VerifiedBy INT
)
BEGIN
    DECLARE v_InvoiceId INT;
    DECLARE v_CollegeId INT;
    DECLARE v_PlanId INT;
    DECLARE v_DurationDays INT;

    SELECT `InvoiceId`, `CollegeId` INTO v_InvoiceId, v_CollegeId
    FROM `PlatformPayments` WHERE `PaymentId` = p_PaymentId;

    SELECT `PlanId` INTO v_PlanId FROM `PlatformInvoices` WHERE `InvoiceId` = v_InvoiceId;
    SELECT `DurationDays` INTO v_DurationDays FROM `SubscriptionPlans` WHERE `PlanId` = v_PlanId;

    START TRANSACTION;

    -- Mark Payment as Paid
    UPDATE `PlatformPayments`
    SET `Status` = 'Paid'
    WHERE `PaymentId` = p_PaymentId;

    -- Mark Invoice as Paid
    UPDATE `PlatformInvoices`
    SET `Status` = 'Paid'
    WHERE `InvoiceId` = v_InvoiceId;

    -- Advance Subscription Renewal Date
    UPDATE `CollegeSubscriptions`
    SET `Status` = 'Active',
        `RenewalDate` = DATE_ADD(CURDATE(), INTERVAL IFNULL(v_DurationDays, 365) DAY),
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `CollegeId` = v_CollegeId;

    UPDATE `Colleges`
    SET `SubscriptionStatus` = 'Active',
        `RenewalDate` = DATE_ADD(CURDATE(), INTERVAL IFNULL(v_DurationDays, 365) DAY)
    WHERE `CollegeId` = v_CollegeId;

    INSERT INTO `AuditLogs` (`CollegeId`, `Action`, `EntityName`, `EntityId`, `Description`, `CreatedAt`)
    VALUES (v_CollegeId, 'VERIFY_PAYMENT', 'PlatformPayments', p_PaymentId, 'Payment verified; subscription renewed', CURRENT_TIMESTAMP(6));

    COMMIT;
END$$


-- =============================================================================
-- 24. sp_SuperAdmin_GetPlanModuleMatrix
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetPlanModuleMatrix`$$
CREATE PROCEDURE `sp_SuperAdmin_GetPlanModuleMatrix`()
BEGIN
    SELECT 
        pm.`PlanModuleId`,
        pm.`PlanId`,
        p.`PlanName`,
        pm.`ModuleName`,
        pm.`IsEnabled`
    FROM `PlanModules` pm
    JOIN `SubscriptionPlans` p ON pm.`PlanId` = p.`PlanId`
    WHERE p.`IsDeleted` = 0
    ORDER BY pm.`PlanId` ASC, pm.`ModuleName` ASC;
END$$


-- =============================================================================
-- 25. sp_SuperAdmin_UpdatePlanModuleMatrix
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_UpdatePlanModuleMatrix`$$
CREATE PROCEDURE `sp_SuperAdmin_UpdatePlanModuleMatrix`(
    IN p_PlanId INT,
    IN p_ModuleName VARCHAR(100),
    IN p_IsEnabled TINYINT(1)
)
BEGIN
    INSERT INTO `PlanModules` (`PlanId`, `ModuleName`, `IsEnabled`)
    VALUES (p_PlanId, p_ModuleName, p_IsEnabled)
    ON DUPLICATE KEY UPDATE `IsEnabled` = p_IsEnabled;
END$$


-- =============================================================================
-- 26. sp_SuperAdmin_GetNotifications
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetNotifications`$$
CREATE PROCEDURE `sp_SuperAdmin_GetNotifications`(
    IN p_IsRead TINYINT(1),
    IN p_Category VARCHAR(50)
)
BEGIN
    SELECT 
        n.`NotificationId` AS `Id`,
        n.`NotificationId`,
        n.`Title`,
        n.`Message`,
        n.`Type` AS `Category`,
        n.`IsRead`,
        n.`CreatedAt`
    FROM `Notifications` n
    WHERE (p_IsRead IS NULL OR n.`IsRead` = p_IsRead)
      AND (p_Category IS NULL OR p_Category = '' OR n.`Type` = p_Category)
    ORDER BY n.`NotificationId` DESC
    LIMIT 50;
END$$


-- =============================================================================
-- 27. sp_SuperAdmin_CreatePlatformNotification
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_CreatePlatformNotification`$$
CREATE PROCEDURE `sp_SuperAdmin_CreatePlatformNotification`(
    IN p_Title VARCHAR(200),
    IN p_Message TEXT,
    IN p_Category VARCHAR(50),
    IN p_CreatedBy INT,
    OUT p_NewNotificationId INT
)
BEGIN
    INSERT INTO `Notifications` (`UserId`, `Title`, `Message`, `Type`, `IsRead`, `CreatedAt`)
    VALUES (IFNULL(p_CreatedBy, 1), p_Title, p_Message, IFNULL(p_Category, 'System Alerts'), 0, CURRENT_TIMESTAMP(6));

    SET p_NewNotificationId = LAST_INSERT_ID();
END$$


-- =============================================================================
-- 28. sp_SuperAdmin_MarkNotificationRead
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_MarkNotificationRead`$$
CREATE PROCEDURE `sp_SuperAdmin_MarkNotificationRead`(IN p_NotificationId INT)
BEGIN
    UPDATE `Notifications`
    SET `IsRead` = 1,
        `ReadAt` = CURRENT_TIMESTAMP(6)
    WHERE `NotificationId` = p_NotificationId;
END$$


-- =============================================================================
-- 29. sp_SuperAdmin_GetAuditLogsPaged
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetAuditLogsPaged`$$
CREATE PROCEDURE `sp_SuperAdmin_GetAuditLogsPaged`(
    IN p_CollegeId INT,
    IN p_Action VARCHAR(50),
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_Page INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT DEFAULT 0;
    SET p_Page = IFNULL(p_Page, 1);
    SET p_PageSize = IFNULL(p_PageSize, 20);
    IF p_Page < 1 THEN SET p_Page = 1; END IF;
    IF p_PageSize < 1 THEN SET p_PageSize = 20; END IF;
    SET v_Offset = (p_Page - 1) * p_PageSize;

    SELECT COUNT(*) AS TotalCount
    FROM `AuditLogs` a
    LEFT JOIN `Colleges` c ON a.`CollegeId` = c.`CollegeId`
    WHERE (p_CollegeId IS NULL OR p_CollegeId = 0 OR a.`CollegeId` = p_CollegeId)
      AND (p_Action IS NULL OR p_Action = '' OR a.`Action` = p_Action)
      AND (p_FromDate IS NULL OR a.`CreatedAt` >= p_FromDate)
      AND (p_ToDate IS NULL OR a.`CreatedAt` <= DATE_ADD(p_ToDate, INTERVAL 1 DAY));

    SELECT 
        a.`AuditLogId`,
        a.`CollegeId`,
        COALESCE(c.`CollegeName`, 'Platform Global') AS CollegeName,
        a.`Action`,
        a.`EntityName`,
        a.`EntityId`,
        a.`Description`,
        a.`CreatedAt`
    FROM `AuditLogs` a
    LEFT JOIN `Colleges` c ON a.`CollegeId` = c.`CollegeId`
    WHERE (p_CollegeId IS NULL OR p_CollegeId = 0 OR a.`CollegeId` = p_CollegeId)
      AND (p_Action IS NULL OR p_Action = '' OR a.`Action` = p_Action)
      AND (p_FromDate IS NULL OR a.`CreatedAt` >= p_FromDate)
      AND (p_ToDate IS NULL OR a.`CreatedAt` <= DATE_ADD(p_ToDate, INTERVAL 1 DAY))
    ORDER BY a.`AuditLogId` DESC
    LIMIT p_PageSize OFFSET v_Offset;
END$$


-- =============================================================================
-- 30. sp_SuperAdmin_GetPlatformSettings
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetPlatformSettings`$
CREATE PROCEDURE `sp_SuperAdmin_GetPlatformSettings`()
BEGIN
    SELECT `SettingKey`, `SettingValue` FROM `PlatformSettings`;
END$


-- =============================================================================
-- 31. sp_SuperAdmin_UpdatePlatformSettings
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_UpdatePlatformSettings`$
CREATE PROCEDURE `sp_SuperAdmin_UpdatePlatformSettings`(
    IN p_PlatformName VARCHAR(150),
    IN p_SupportEmail VARCHAR(150),
    IN p_RenewalDays INT,
    IN p_UpdatedBy VARCHAR(150)
)
BEGIN
    INSERT INTO `PlatformSettings` (`SettingKey`, `SettingValue`, `DataType`, `Description`, `UpdatedBy`, `UpdatedAt`)
    VALUES 
        ('PlatformName', p_PlatformName, 'String', 'Platform brand name', p_UpdatedBy, CURRENT_TIMESTAMP(6)),
        ('SupportEmail', p_SupportEmail, 'String', 'Central support email', p_UpdatedBy, CURRENT_TIMESTAMP(6)),
        ('RenewalReminderDays', CAST(p_RenewalDays AS CHAR), 'Integer', 'Threshold for renewal alerts', p_UpdatedBy, CURRENT_TIMESTAMP(6))
    ON DUPLICATE KEY UPDATE 
        `SettingValue` = VALUES(`SettingValue`),
        `UpdatedBy` = VALUES(`UpdatedBy`),
        `UpdatedAt` = CURRENT_TIMESTAMP(6);
END$

DELIMITER ;


SELECT 'SUPER_ADMIN_COMPLETE_STORED_PROCEDURES_DEPLOYED' AS Status, NOW() AS CompletedAt;


-- =============================================================================
-- SECTION: 08_PostMigration_Verification.sql
-- =============================================================================

-- =============================================================================
-- SCRIPT 08: 08_PostMigration_Verification.sql
-- PURPOSE: Post-Migration Assertions & Multi-Tenant Integrity Verification
-- ENVIRONMENT: MySQL 8.0 / CollegeManagement
-- EXECUTION SAFETY: Read-Only / Verification Assertions
-- =============================================================================

USE `CollegeManagement`;

-- 1. Verify Platform Tables Exist
SELECT 
    TABLE_NAME, 
    TABLE_ROWS, 
    CREATE_TIME,
    'EXISTS' AS VerificationStatus
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
      'Colleges', 'SubscriptionPlans', 'PlanModules', 
      'CollegeSubscriptions', 'SubscriptionRenewalHistory', 
      'PlatformInvoices', 'PlatformPayments', 'PlatformSettings'
  )
ORDER BY TABLE_NAME ASC;

-- 2. Assert Zero Campuses Have NULL CollegeId
SELECT 
    COUNT(*) AS UnmappedCampusesCount,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASSED: All campuses successfully assigned CollegeId'
        ELSE 'FAILED: Found campuses with NULL CollegeId'
    END AS CampusTenantStatus
FROM `Campuses`
WHERE `CollegeId` IS NULL;

-- 3. Assert Zero Institutional Users Have NULL CollegeId
SELECT 
    COUNT(*) AS UnmappedUsersCount,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASSED: All institutional users successfully mapped to CollegeId'
        ELSE 'FAILED: Found institutional users with NULL CollegeId'
    END AS UserTenantStatus
FROM `Users` u
JOIN `Roles` r ON u.RoleId = r.RoleId
WHERE r.RoleCode != 'SUPER_ADMIN' AND u.CollegeId IS NULL;

-- 4. Assert Super Admin Retains NULL CollegeId (Platform Scope)
SELECT 
    COUNT(*) AS SuperAdminWithCollegeCount,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASSED: Super Admin user correctly maintains Platform Scope (CollegeId IS NULL)'
        ELSE 'FAILED: Super Admin was mistakenly assigned to a specific college'
    END AS SuperAdminScopeStatus
FROM `Users` u
JOIN `Roles` r ON u.RoleId = r.RoleId
WHERE r.RoleCode = 'SUPER_ADMIN' AND u.CollegeId IS NOT NULL;

-- 5. Assert Canonical Roles Preserved
SELECT 
    RoleId, RoleCode, RoleName, Scope,
    CASE 
        WHEN RoleId = 1 AND RoleCode = 'SUPER_ADMIN' AND Scope = 'PLATFORM' THEN 'PASSED'
        WHEN RoleId = 2 AND RoleCode = 'COLLEGE_ADMIN' AND RoleName = 'Admin' AND Scope = 'COLLEGE' THEN 'PASSED: RoleName Admin Preserved for C# Compatibility'
        ELSE 'VERIFIED'
    END AS RoleIntegrityStatus
FROM `Roles`
WHERE RoleId IN (1, 2);

-- 6. Assert Composite Unique Keys
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS IndexedColumns,
    CASE 
        WHEN INDEX_NAME = 'UQ_NumberSeries_College_Code' THEN 'PASSED: NumberSeries Composite Key Active'
        WHEN INDEX_NAME = 'UX_templates_College_TemplateCode' THEN 'PASSED: Templates Composite Key Active'
        ELSE 'VERIFIED'
    END AS ConstraintStatus
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND INDEX_NAME IN ('UQ_NumberSeries_College_Code', 'UX_templates_College_TemplateCode')
GROUP BY TABLE_NAME, INDEX_NAME;

-- 7. Assert Active Subscription for College 1
SELECT 
    cs.SubscriptionId,
    cs.CollegeId,
    c.CollegeName,
    p.PlanName,
    cs.Status,
    cs.RenewalDate,
    CASE 
        WHEN cs.Status = 'Active' THEN 'PASSED: Primary institution subscription active'
        ELSE 'WARNING: Subscription not in Active status'
    END AS SubscriptionStatusCheck
FROM `CollegeSubscriptions` cs
JOIN `Colleges` c ON cs.CollegeId = c.CollegeId
JOIN `SubscriptionPlans` p ON cs.PlanId = p.PlanId
WHERE cs.CollegeId = 1;

-- Post-Migration Final Assertion Summary
SELECT 'POST_MIGRATION_INTEGRITY_VERIFICATION_COMPLETE' AS Status, NOW() AS VerifiedAt;
