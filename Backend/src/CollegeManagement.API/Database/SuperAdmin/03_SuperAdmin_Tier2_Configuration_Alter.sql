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
