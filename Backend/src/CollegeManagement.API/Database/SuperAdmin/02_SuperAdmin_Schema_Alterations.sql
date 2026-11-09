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
