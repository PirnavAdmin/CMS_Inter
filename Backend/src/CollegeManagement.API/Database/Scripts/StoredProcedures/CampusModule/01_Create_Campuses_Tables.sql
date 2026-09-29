-- ============================================================================
-- SCRIPT: 01_Create_Campuses_And_CampusBoards_Tables.sql
-- DESCRIPTION: Creates Campuses and CampusBoards tables and adds CampusId to Students
-- ============================================================================

CREATE TABLE IF NOT EXISTS `Campuses` (
    `CampusId` INT AUTO_INCREMENT PRIMARY KEY,
    `CampusName` VARCHAR(150) NOT NULL,
    `CampusCode` VARCHAR(50) NOT NULL,
    `Address` VARCHAR(500) NULL,
    `ContactPhone` VARCHAR(50) NULL,
    `Email` VARCHAR(150) NULL,
    `IsHQ` TINYINT(1) NOT NULL DEFAULT 0,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `DisplayOrder` INT NOT NULL DEFAULT 0,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_campus_code` (`CampusCode`),
    INDEX `idx_campuses_isactive` (`IsActive`),
    INDEX `idx_campuses_ishq` (`IsHQ`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `CampusBoards` (
    `CampusBoardId` INT AUTO_INCREMENT PRIMARY KEY,
    `CampusId` INT NOT NULL,
    `BoardId` INT NOT NULL,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_cb_campus` FOREIGN KEY (`CampusId`) REFERENCES `Campuses` (`CampusId`) ON DELETE CASCADE,
    CONSTRAINT `fk_cb_board` FOREIGN KEY (`BoardId`) REFERENCES `Boards` (`BoardId`) ON DELETE CASCADE,
    UNIQUE KEY `uq_campus_board` (`CampusId`, `BoardId`),
    INDEX `idx_cb_campus` (`CampusId`),
    INDEX `idx_cb_board` (`BoardId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add CampusId to Students table if it doesn't exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Students' AND COLUMN_NAME = 'CampusId';

SET @stmt = IF(@col_exists = 0, 'ALTER TABLE `Students` ADD COLUMN `CampusId` INT NULL AFTER `StudentId`, ADD INDEX `idx_students_campus` (`CampusId`);', 'SELECT "CampusId already exists on Students";');
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add CampusId to StudentAdmissions table if it doesn't exist
SET @col_adm_exists = 0;
SELECT COUNT(*) INTO @col_adm_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'StudentAdmissions' AND COLUMN_NAME = 'CampusId';

SET @stmt_adm = IF(@col_adm_exists = 0, 'ALTER TABLE `StudentAdmissions` ADD COLUMN `CampusId` INT NULL AFTER `AdmissionId`, ADD INDEX `idx_admissions_campus` (`CampusId`);', 'SELECT "CampusId already exists on StudentAdmissions";');
PREPARE stmt_adm FROM @stmt_adm;
EXECUTE stmt_adm;
DEALLOCATE PREPARE stmt_adm;
