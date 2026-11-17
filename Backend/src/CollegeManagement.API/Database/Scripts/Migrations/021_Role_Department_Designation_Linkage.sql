-- ====================================================================================
-- 021_Role_Department_Designation_Linkage.sql
-- Link Roles to StaffType (Teaching / Non-Teaching / Both), Department, and Designation
-- ====================================================================================

SET @dbname = DATABASE();

-- 1. Ensure DepartmentId in Roles Table
SET @precheck_dept = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Roles' AND COLUMN_NAME = 'DepartmentId');
SET @sql_add_dept = IF(@precheck_dept = 0, 'ALTER TABLE `Roles` ADD COLUMN `DepartmentId` INT NULL AFTER `Description`;', 'SELECT 1;');
PREPARE stmt_dept FROM @sql_add_dept; EXECUTE stmt_dept; DEALLOCATE PREPARE stmt_dept;

-- 2. Ensure DesignationId in Roles Table
SET @precheck_desig = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Roles' AND COLUMN_NAME = 'DesignationId');
SET @sql_add_desig = IF(@precheck_desig = 0, 'ALTER TABLE `Roles` ADD COLUMN `DesignationId` INT NULL AFTER `DepartmentId`;', 'SELECT 1;');
PREPARE stmt_desig FROM @sql_add_desig; EXECUTE stmt_desig; DEALLOCATE PREPARE stmt_desig;

-- 3. Ensure StaffType in Roles Table
SET @precheck_st = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Roles' AND COLUMN_NAME = 'StaffType');
SET @sql_add_st = IF(@precheck_st = 0, 'ALTER TABLE `Roles` ADD COLUMN `StaffType` VARCHAR(20) NOT NULL DEFAULT ''Both'' AFTER `DesignationId`;', 'SELECT 1;');
PREPARE stmt_st FROM @sql_add_st; EXECUTE stmt_st; DEALLOCATE PREPARE stmt_st;

-- 4. Add Foreign Keys safely if not already present
SET @fk_dept_check = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = @dbname AND TABLE_NAME = 'Roles' AND CONSTRAINT_NAME = 'FK_Roles_Departments');
SET @sql_fk_dept = IF(@fk_dept_check = 0, 'ALTER TABLE `Roles` ADD CONSTRAINT `FK_Roles_Departments` FOREIGN KEY (`DepartmentId`) REFERENCES `Departments` (`DepartmentId`) ON DELETE SET NULL;', 'SELECT 1;');
PREPARE stmt_fk_dept FROM @sql_fk_dept; EXECUTE stmt_fk_dept; DEALLOCATE PREPARE stmt_fk_dept;

SET @fk_desig_check = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = @dbname AND TABLE_NAME = 'Roles' AND CONSTRAINT_NAME = 'FK_Roles_Designations');
SET @sql_fk_desig = IF(@fk_desig_check = 0, 'ALTER TABLE `Roles` ADD CONSTRAINT `FK_Roles_Designations` FOREIGN KEY (`DesignationId`) REFERENCES `Designations` (`Id`) ON DELETE SET NULL;', 'SELECT 1;');
PREPARE stmt_fk_desig FROM @sql_fk_desig; EXECUTE stmt_fk_desig; DEALLOCATE PREPARE stmt_fk_desig;

-- 5. Add Indexes if not already present
SET @idx_dept_check = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Roles' AND INDEX_NAME = 'IX_Roles_DepartmentId');
SET @sql_idx_dept = IF(@idx_dept_check = 0, 'CREATE INDEX `IX_Roles_DepartmentId` ON `Roles` (`DepartmentId`);', 'SELECT 1;');
PREPARE stmt_idx_dept FROM @sql_idx_dept; EXECUTE stmt_idx_dept; DEALLOCATE PREPARE stmt_idx_dept;

SET @idx_desig_check = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Roles' AND INDEX_NAME = 'IX_Roles_DesignationId');
SET @sql_idx_desig = IF(@idx_desig_check = 0, 'CREATE INDEX `IX_Roles_DesignationId` ON `Roles` (`DesignationId`);', 'SELECT 1;');
PREPARE stmt_idx_desig FROM @sql_idx_desig; EXECUTE stmt_idx_desig; DEALLOCATE PREPARE stmt_idx_desig;

SET @idx_st_check = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Roles' AND INDEX_NAME = 'IX_Roles_StaffType');
SET @sql_idx_st = IF(@idx_st_check = 0, 'CREATE INDEX `IX_Roles_StaffType` ON `Roles` (`StaffType`);', 'SELECT 1;');
PREPARE stmt_idx_st FROM @sql_idx_st; EXECUTE stmt_idx_st; DEALLOCATE PREPARE stmt_idx_st;

-- 6. Ensure 'Student Affairs' Department and 'Receptionist' Designation exist
INSERT IGNORE INTO `Departments` (`DepartmentCode`, `DepartmentName`, `StaffType`, `Description`, `IsActive`)
VALUES ('DEP_SA', 'Student Affairs', 'Non-Teaching', 'Student Affairs, Front Office & Services', 1);

INSERT IGNORE INTO `Designations` (`Name`, `StaffType`, `IsActive`, `CreatedAt`)
VALUES ('Receptionist', 'Non-Teaching', 1, UTC_TIMESTAMP());

-- Link Receptionist Designation to Student Affairs Department
UPDATE `Designations`
SET `DepartmentId` = (SELECT `DepartmentId` FROM `Departments` WHERE `DepartmentName` = 'Student Affairs' LIMIT 1),
    `StaffType` = 'Non-Teaching'
WHERE `Name` = 'Receptionist';

-- 7. Ensure Receptionist Role exists with Non-Teaching classification & linkage to Student Affairs
INSERT INTO `Roles` (`RoleName`, `Description`, `StaffType`, `IsSystemRole`, `IsActive`, `DepartmentId`, `DesignationId`)
SELECT 'Receptionist', 'Front desk visitor management, receptionist services, and prospective student enquiry handling', 'Non-Teaching', 0, 1,
       (SELECT `DepartmentId` FROM `Departments` WHERE `DepartmentName` = 'Student Affairs' LIMIT 1),
       (SELECT `Id` FROM `Designations` WHERE `Name` = 'Receptionist' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM `Roles` WHERE `RoleName` = 'Receptionist');

-- If Receptionist Role already exists, update its StaffType, DepartmentId, and DesignationId
UPDATE `Roles`
SET `StaffType` = 'Non-Teaching',
    `DepartmentId` = (SELECT `DepartmentId` FROM `Departments` WHERE `DepartmentName` = 'Student Affairs' LIMIT 1),
    `DesignationId` = (SELECT `Id` FROM `Designations` WHERE `Name` = 'Receptionist' LIMIT 1)
WHERE `RoleName` = 'Receptionist';

-- 8. Backfill Canonical / Existing System Roles
UPDATE `Roles` SET `StaffType` = 'Teaching' WHERE `RoleName` IN ('Faculty', 'Teacher', 'Lecturer', 'HOD');
UPDATE `Roles` SET `StaffType` = 'Non-Teaching' WHERE `RoleName` IN ('Accounts', 'Accountant', 'Examination Cell', 'Library / Librarian', 'Librarian', 'Hostel Warden', 'Placement Officer', 'Bus Driver', 'Driver', 'Cleaner', 'Attendant');
UPDATE `Roles` SET `StaffType` = 'Both' WHERE `RoleName` IN ('Super Admin', 'Admin', 'Principal', 'Dean');
