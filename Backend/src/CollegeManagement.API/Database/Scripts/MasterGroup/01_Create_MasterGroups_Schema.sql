-- =====================================================================================
-- SCRIPT 01: ADDITIVE SCHEMA MIGRATION FOR MASTER GROUP ARCHITECTURE (OPTION B)
-- =====================================================================================
-- IMPORTANT:
-- This script is strictly ADDITIVE and NON-DESTRUCTIVE.
-- It does NOT drop any tables, columns, indexes, or stored procedures.
-- It preserves all existing Groups, GroupPrograms, and historical primary keys.
-- =====================================================================================

-- 1. Create MasterGroups Catalog Table
CREATE TABLE IF NOT EXISTS `MasterGroups` (
    `MasterGroupId` INT AUTO_INCREMENT PRIMARY KEY,
    `BoardId` INT NOT NULL,
    `GroupName` VARCHAR(100) NOT NULL,
    `GroupCode` VARCHAR(30) NOT NULL,
    `Description` VARCHAR(500) NULL,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    CONSTRAINT `FK_MasterGroups_Boards` FOREIGN KEY (`BoardId`) REFERENCES `Boards` (`BoardId`) ON DELETE RESTRICT,
    CONSTRAINT `UQ_MasterGroups_Board_GroupCode` UNIQUE (`BoardId`, `GroupCode`),
    CONSTRAINT `UQ_MasterGroups_Board_GroupName` UNIQUE (`BoardId`, `GroupName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create MasterGroupPrograms Association Table (Default programs for Master Group)
CREATE TABLE IF NOT EXISTS `MasterGroupPrograms` (
    `MasterGroupProgramId` INT AUTO_INCREMENT PRIMARY KEY,
    `MasterGroupId` INT NOT NULL,
    `ProgramId` INT NOT NULL,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    CONSTRAINT `FK_MasterGroupPrograms_MasterGroups` FOREIGN KEY (`MasterGroupId`) REFERENCES `MasterGroups` (`MasterGroupId`) ON DELETE CASCADE,
    CONSTRAINT `FK_MasterGroupPrograms_Programs` FOREIGN KEY (`ProgramId`) REFERENCES `Programs` (`ProgramId`) ON DELETE RESTRICT,
    CONSTRAINT `UQ_MasterGroupPrograms_Group_Program` UNIQUE (`MasterGroupId`, `ProgramId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Add MasterGroupId Column to Existing Groups Table (if not exists)
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'Groups' 
      AND COLUMN_NAME = 'MasterGroupId'
);

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE `Groups` ADD COLUMN `MasterGroupId` INT NULL AFTER `UpdatedAt`;', 
    'SELECT 1;'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Add Foreign Key FK_Groups_MasterGroups_MasterGroupId (if not exists)
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'Groups' 
      AND CONSTRAINT_NAME = 'FK_Groups_MasterGroups_MasterGroupId'
);

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE `Groups` ADD CONSTRAINT `FK_Groups_MasterGroups_MasterGroupId` FOREIGN KEY (`MasterGroupId`) REFERENCES `MasterGroups` (`MasterGroupId`) ON DELETE SET NULL;', 
    'SELECT 1;'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. Add Index on MasterGroupId
SET @idx_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'Groups' 
      AND INDEX_NAME = 'IX_Groups_MasterGroupId'
);

SET @sql = IF(@idx_exists = 0, 
    'CREATE INDEX `IX_Groups_MasterGroupId` ON `Groups` (`MasterGroupId`);', 
    'SELECT 1;'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. Add Composite Contextual Lookup Index (MasterGroupId, AcademicYearId, AcademicLevelId)
SET @idx_ctx_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'Groups' 
      AND INDEX_NAME = 'IX_Groups_MasterGroup_Context'
);

SET @sql = IF(@idx_ctx_exists = 0, 
    'CREATE INDEX `IX_Groups_MasterGroup_Context` ON `Groups` (`MasterGroupId`, `AcademicYearId`, `AcademicLevelId`);', 
    'SELECT 1;'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
