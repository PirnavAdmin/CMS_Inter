-- =============================================================================
-- MODULE: STAFF MANAGEMENT (TEACHING & NON-TEACHING STAFF)
-- DATABASE: u819242402_CLM_System
-- DESCRIPTION: Schema migration, seed master data, and stored procedures for Staff Management
-- =============================================================================

USE `u819242402_CLM_System`;

-- -----------------------------------------------------------------------------
-- 1. Create or Rename Staffs Table (from Faculties)
-- -----------------------------------------------------------------------------
SET @faculties_table_exists = 0;
SELECT COUNT(*) INTO @faculties_table_exists 
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'Faculties' AND table_type = 'BASE TABLE';

SET @staffs_table_exists = 0;
SELECT COUNT(*) INTO @staffs_table_exists 
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'Staffs' AND table_type = 'BASE TABLE';

SET @rename_sql = IF(@faculties_table_exists = 1 AND @staffs_table_exists = 0,
    'RENAME TABLE `Faculties` TO `Staffs`;',
    'SELECT "No table rename needed" AS Notice;');
PREPARE stmt_rename FROM @rename_sql;
EXECUTE stmt_rename;
DEALLOCATE PREPARE stmt_rename;

-- Ensure Staffs table exists with all standard columns
CREATE TABLE IF NOT EXISTS `Staffs` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `EmployeeId` VARCHAR(50) NOT NULL,
    `FirstName` VARCHAR(100) NOT NULL,
    `LastName` VARCHAR(100) NOT NULL,
    `Gender` VARCHAR(20) NOT NULL,
    `DateOfBirth` DATETIME(6) NOT NULL,
    `Aadhaar` VARCHAR(12) NULL,
    `Mobile` VARCHAR(15) NOT NULL,
    `Email` VARCHAR(150) NOT NULL,
    `BloodGroup` VARCHAR(10) NULL,
    `Qualification` VARCHAR(100) NOT NULL,
    `Designation` VARCHAR(100) NOT NULL,
    `DesignationId` INT NULL,
    `StaffType` VARCHAR(20) NOT NULL DEFAULT 'Teaching',
    `FacultyType` VARCHAR(20) NULL DEFAULT 'Teaching',
    `DepartmentId` INT NULL,
    `JoiningDate` DATETIME(6) NOT NULL,
    `Experience` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Active',
    `PhotoPath` VARCHAR(500) NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `UX_Staffs_EmployeeId` (`EmployeeId`),
    KEY `IX_Staffs_Email` (`Email`),
    KEY `IX_Staffs_Mobile` (`Mobile`),
    KEY `IX_Staffs_StaffType` (`StaffType`),
    KEY `IX_Staffs_DepartmentId` (`DepartmentId`),
    KEY `IX_Staffs_DesignationId` (`DesignationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Add StaffType column if missing
SET @col_stafftype_exists = 0;
SELECT COUNT(*) INTO @col_stafftype_exists FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Staffs' AND column_name = 'StaffType';
SET @sql_add_stafftype = IF(@col_stafftype_exists = 0, 'ALTER TABLE `Staffs` ADD COLUMN `StaffType` VARCHAR(20) NOT NULL DEFAULT "Teaching" AFTER `DesignationId`;', 'SELECT 1;');
PREPARE stmt_st FROM @sql_add_stafftype; EXECUTE stmt_st; DEALLOCATE PREPARE stmt_st;

-- Sync FacultyType column with StaffType if exists
UPDATE `Staffs` SET `StaffType` = IFNULL(`FacultyType`, 'Teaching') WHERE `StaffType` IS NULL OR `StaffType` = '';
UPDATE `Staffs` SET `FacultyType` = `StaffType` WHERE `FacultyType` IS NULL;

-- -----------------------------------------------------------------------------
-- 2. Create or Rename StaffSubjectAllocations Table (from FacultySubjectAllocations)
-- -----------------------------------------------------------------------------
-- 2. Create or Normalize StaffSubjectAllocations Table (Retains: Id, StaffId, SubjectId, CreatedAt, UpdatedAt)
-- -----------------------------------------------------------------------------
SET @fsa_table_exists = 0;
SELECT COUNT(*) INTO @fsa_table_exists 
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'FacultySubjectAllocations' AND table_type = 'BASE TABLE';

SET @ssa_table_exists = 0;
SELECT COUNT(*) INTO @ssa_table_exists 
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'StaffSubjectAllocations' AND table_type = 'BASE TABLE';

SET @rename_fsa_sql = IF(@fsa_table_exists = 1 AND @ssa_table_exists = 0,
    'RENAME TABLE `FacultySubjectAllocations` TO `StaffSubjectAllocations`;',
    'SELECT "No FSA table rename needed" AS Notice;');
PREPARE stmt_fsa_rename FROM @rename_fsa_sql;
EXECUTE stmt_fsa_rename;
DEALLOCATE PREPARE stmt_fsa_rename;

-- Create Clean Normalized Table Structure
CREATE TABLE IF NOT EXISTS `StaffSubjectAllocations_Clean` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `StaffId` INT NOT NULL,
    `SubjectId` INT NOT NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_StaffSubjectAllocations_StaffId` (`StaffId`),
    KEY `IX_StaffSubjectAllocations_SubjectId` (`SubjectId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Migrate data safely from existing table if present
SET @ssa_exists = 0;
SELECT COUNT(*) INTO @ssa_exists 
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'StaffSubjectAllocations' AND table_type = 'BASE TABLE';

SET @has_fac_col = 0;
SELECT COUNT(*) INTO @has_fac_col 
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'StaffSubjectAllocations' AND column_name = 'FacultyId';

SET @copy_sql = IF(@ssa_exists = 1 AND @has_fac_col > 0,
    'INSERT IGNORE INTO `StaffSubjectAllocations_Clean` (`Id`, `StaffId`, `SubjectId`, `CreatedAt`, `UpdatedAt`) SELECT `Id`, COALESCE(NULLIF(`StaffId`, 0), `FacultyId`), `SubjectId`, COALESCE(`CreatedAt`, CURRENT_TIMESTAMP(6)), `UpdatedAt` FROM `StaffSubjectAllocations`;',
    IF(@ssa_exists = 1,
       'INSERT IGNORE INTO `StaffSubjectAllocations_Clean` (`Id`, `StaffId`, `SubjectId`, `CreatedAt`, `UpdatedAt`) SELECT `Id`, `StaffId`, `SubjectId`, COALESCE(`CreatedAt`, CURRENT_TIMESTAMP(6)), `UpdatedAt` FROM `StaffSubjectAllocations`;',
       'SELECT 1;'));
PREPARE stmt_copy FROM @copy_sql;
EXECUTE stmt_copy;
DEALLOCATE PREPARE stmt_copy;

-- Swap table atomically
DROP TABLE IF EXISTS `StaffSubjectAllocations_Old`;
SET @swap_sql = IF(@ssa_exists = 1,
    'RENAME TABLE `StaffSubjectAllocations` TO `StaffSubjectAllocations_Old`, `StaffSubjectAllocations_Clean` TO `StaffSubjectAllocations`;',
    'RENAME TABLE `StaffSubjectAllocations_Clean` TO `StaffSubjectAllocations`;');
PREPARE stmt_swap FROM @swap_sql;
EXECUTE stmt_swap;
DEALLOCATE PREPARE stmt_swap;
DROP TABLE IF EXISTS `StaffSubjectAllocations_Old`;

-- -----------------------------------------------------------------------------
-- 3. Compatibility Views (Safe creation without Error 1347)
-- -----------------------------------------------------------------------------
-- Faculties View (only if Faculties is not a BASE TABLE)
SET @is_faculties_table = 0;
SELECT COUNT(*) INTO @is_faculties_table 
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'Faculties' AND table_type = 'BASE TABLE';

SET @create_fac_view = IF(@is_faculties_table = 0,
    'CREATE OR REPLACE VIEW `Faculties` AS SELECT `Id`, `EmployeeId`, `FirstName`, `LastName`, `Gender`, `DateOfBirth`, `Aadhaar`, `Mobile`, `Email`, `BloodGroup`, `Qualification`, `Designation`, `DesignationId`, `StaffType` AS `FacultyType`, `DepartmentId`, `JoiningDate`, `Experience`, `Status`, `PhotoPath`, `CreatedAt`, `UpdatedAt`, `IsDeleted` FROM `Staffs` WHERE `IsDeleted` = 0;',
    'SELECT "Faculties is base table" AS Notice;');
PREPARE stmt_cfv FROM @create_fac_view; EXECUTE stmt_cfv; DEALLOCATE PREPARE stmt_cfv;

-- Staff View (only if Staff is not a BASE TABLE)
SET @is_staff_table = 0;
SELECT COUNT(*) INTO @is_staff_table 
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'Staff' AND table_type = 'BASE TABLE';

SET @create_staff_view = IF(@is_staff_table = 0,
    'CREATE OR REPLACE VIEW `Staff` AS SELECT * FROM `Staffs`;',
    'SELECT "Staff is base table" AS Notice;');
PREPARE stmt_csv FROM @create_staff_view; EXECUTE stmt_csv; DEALLOCATE PREPARE stmt_csv;

-- FacultySubjectAllocations View (only if not a BASE TABLE)
SET @is_fsa_table = 0;
SELECT COUNT(*) INTO @is_fsa_table 
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'FacultySubjectAllocations' AND table_type = 'BASE TABLE';

SET @create_fsa_view = IF(@is_fsa_table = 0,
    'CREATE OR REPLACE VIEW `FacultySubjectAllocations` AS SELECT `Id`, `StaffId` AS `FacultyId`, `StaffId`, `SubjectId`, `CreatedAt`, `UpdatedAt` FROM `StaffSubjectAllocations`;',
    'SELECT "FacultySubjectAllocations is base table" AS Notice;');
PREPARE stmt_cfsa FROM @create_fsa_view; EXECUTE stmt_cfsa; DEALLOCATE PREPARE stmt_cfsa;

-- -----------------------------------------------------------------------------
-- 4. Seed Intermediate College Fixed Departments
-- -----------------------------------------------------------------------------
-- Ensure Departments table has StaffType column
SET @col_dept_stafftype = 0;
SELECT COUNT(*) INTO @col_dept_stafftype FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Departments' AND column_name = 'StaffType';
SET @sql_add_dept_st = IF(@col_dept_stafftype = 0, 'ALTER TABLE `Departments` ADD COLUMN `StaffType` VARCHAR(20) NOT NULL DEFAULT "Both" AFTER `DepartmentName`;', 'SELECT 1;');
PREPARE stmt_dst FROM @sql_add_dept_st; EXECUTE stmt_dst; DEALLOCATE PREPARE stmt_dst;

-- Teaching Staff Departments (22 Fixed)
INSERT INTO `Departments` (`DepartmentCode`, `DepartmentName`, `StaffType`, `Description`, `IsActive`) VALUES
('DEP_MATH', 'Mathematics', 'Teaching', 'Department of Mathematics', 1),
('DEP_PHYS', 'Physics', 'Teaching', 'Department of Physics', 1),
('DEP_CHEM', 'Chemistry', 'Teaching', 'Department of Chemistry', 1),
('DEP_BOT',  'Botany', 'Teaching', 'Department of Botany', 1),
('DEP_ZOOL', 'Zoology', 'Teaching', 'Department of Zoology', 1),
('DEP_BIO',  'Biology', 'Teaching', 'Department of Biology', 1),
('DEP_STAT', 'Statistics', 'Teaching', 'Department of Statistics', 1),
('DEP_ENG',  'English', 'Teaching', 'Department of English', 1),
('DEP_TEL',  'Telugu', 'Teaching', 'Department of Telugu', 1),
('DEP_HIN',  'Hindi', 'Teaching', 'Department of Hindi', 1),
('DEP_SKT',  'Sanskrit', 'Teaching', 'Department of Sanskrit', 1),
('DEP_COMM', 'Commerce', 'Teaching', 'Department of Commerce', 1),
('DEP_ACC',  'Accountancy', 'Teaching', 'Department of Accountancy', 1),
('DEP_ECON', 'Economics', 'Teaching', 'Department of Economics', 1),
('DEP_BUS',  'Business Studies', 'Teaching', 'Department of Business Studies', 1),
('DEP_CIV',  'Civics', 'Teaching', 'Department of Civics', 1),
('DEP_HIST', 'History', 'Teaching', 'Department of History', 1),
('DEP_POL',  'Political Science', 'Teaching', 'Department of Political Science', 1),
('DEP_CS',   'Computer Science', 'Teaching', 'Department of Computer Science', 1),
('DEP_CA',   'Computer Applications', 'Teaching', 'Department of Computer Applications', 1),
('DEP_PE',   'Physical Education', 'Teaching', 'Department of Physical Education', 1),
('DEP_EVS',  'Environmental Studies', 'Teaching', 'Department of Environmental Studies', 1)
ON DUPLICATE KEY UPDATE `DepartmentName` = VALUES(`DepartmentName`), `StaffType` = VALUES(`StaffType`);

-- Non-Teaching Staff Departments (11 Fixed)
INSERT INTO `Departments` (`DepartmentCode`, `DepartmentName`, `StaffType`, `Description`, `IsActive`) VALUES
('DEP_ADMIN', 'Administration', 'Non-Teaching', 'College Administration', 1),
('DEP_ACC_FIN', 'Accounts & Finance', 'Non-Teaching', 'Accounts and Finance Department', 1),
('DEP_ADMISS', 'Admissions', 'Non-Teaching', 'Student Admissions Cell', 1),
('DEP_EXAMS',  'Examinations', 'Non-Teaching', 'Examination Cell', 1),
('DEP_LIB',    'Library', 'Non-Teaching', 'College Library & Information Centre', 1),
('DEP_TRANS',  'Transport', 'Non-Teaching', 'Transport Services', 1),
('DEP_HOSTEL', 'Hostel', 'Non-Teaching', 'Hostel Management', 1),
('DEP_SEC',    'Security', 'Non-Teaching', 'Campus Security', 1),
('DEP_MAINT',  'Maintenance', 'Non-Teaching', 'Campus Maintenance & Facilities', 1),
('DEP_SSS',    'Student Support Services', 'Non-Teaching', 'Student Welfare and Counseling', 1),
('DEP_CAMPUS', 'Campus Operations', 'Non-Teaching', 'General Campus Operations', 1)
ON DUPLICATE KEY UPDATE `DepartmentName` = VALUES(`DepartmentName`), `StaffType` = VALUES(`StaffType`);

-- -----------------------------------------------------------------------------
-- 5. Seed Intermediate College Fixed Designations
-- -----------------------------------------------------------------------------
-- Ensure Designations table has StaffType column
SET @col_desig_stafftype = 0;
SELECT COUNT(*) INTO @col_desig_stafftype FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Designations' AND column_name = 'StaffType';
SET @sql_add_desig_st = IF(@col_desig_stafftype = 0, 'ALTER TABLE `Designations` ADD COLUMN `StaffType` VARCHAR(20) NOT NULL DEFAULT "Both" AFTER `Name`;', 'SELECT 1;');
PREPARE stmt_dst2 FROM @sql_add_desig_st; EXECUTE stmt_dst2; DEALLOCATE PREPARE stmt_dst2;

-- Teaching Staff Designations (9 Fixed)
INSERT INTO `Designations` (`Name`, `StaffType`, `IsActive`, `CreatedAt`) VALUES
('Junior Lecturer', 'Teaching', 1, UTC_TIMESTAMP()),
('Lecturer', 'Teaching', 1, UTC_TIMESTAMP()),
('Senior Lecturer', 'Teaching', 1, UTC_TIMESTAMP()),
('Subject Teacher', 'Teaching', 1, UTC_TIMESTAMP()),
('Head of Department (HOD)', 'Teaching', 1, UTC_TIMESTAMP()),
('Academic Coordinator', 'Teaching', 1, UTC_TIMESTAMP()),
('Examination Coordinator', 'Teaching', 1, UTC_TIMESTAMP()),
('Vice Principal', 'Teaching', 1, UTC_TIMESTAMP()),
('Principal', 'Both', 1, UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE `StaffType` = VALUES(`StaffType`), `IsActive` = 1;

-- Non-Teaching Staff Designations (9 Fixed)
INSERT INTO `Designations` (`Name`, `StaffType`, `IsActive`, `CreatedAt`) VALUES
('Administrative Officer', 'Non-Teaching', 1, UTC_TIMESTAMP()),
('Accountant', 'Non-Teaching', 1, UTC_TIMESTAMP()),
('Librarian', 'Non-Teaching', 1, UTC_TIMESTAMP()),
('Lab Assistant', 'Non-Teaching', 1, UTC_TIMESTAMP()),
('Office Assistant', 'Non-Teaching', 1, UTC_TIMESTAMP()),
('Clerk', 'Non-Teaching', 1, UTC_TIMESTAMP()),
('Receptionist', 'Non-Teaching', 1, UTC_TIMESTAMP()),
('other', 'Both', 1, UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE `StaffType` = VALUES(`StaffType`), `IsActive` = 1;

-- -----------------------------------------------------------------------------
-- 6. Stored Procedures: Staff CRUD & Paging
-- -----------------------------------------------------------------------------

-- A. sp_GetPagedStaff
DROP PROCEDURE IF EXISTS `sp_GetPagedStaff`;
DROP PROCEDURE IF EXISTS `sp_GetPagedFaculties`;
DELIMITER //
CREATE PROCEDURE `sp_GetPagedStaff`(
    IN p_SearchTerm VARCHAR(100),
    IN p_Department VARCHAR(100),
    IN p_Designation VARCHAR(100),
    IN p_DesignationId INT,
    IN p_StaffType VARCHAR(20),
    IN p_Status VARCHAR(50),
    IN p_SortBy VARCHAR(50),
    IN p_SortOrder VARCHAR(10),
    IN p_PageNumber INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT;
    DECLARE v_Limit INT;
    SET v_Limit = IFNULL(p_PageSize, 10);
    SET v_Offset = (IFNULL(p_PageNumber, 1) - 1) * v_Limit;

    -- Result Set 1: Total Count
    SELECT COUNT(*) 
    FROM Staffs s
    LEFT JOIN Departments d ON d.DepartmentId = s.DepartmentId
    WHERE (s.IsDeleted = 0 OR s.IsDeleted IS NULL)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR 
           s.FirstName LIKE CONCAT('%', p_SearchTerm, '%') OR 
           s.LastName LIKE CONCAT('%', p_SearchTerm, '%') OR 
           s.EmployeeId LIKE CONCAT('%', p_SearchTerm, '%') OR 
           s.Email LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.Mobile LIKE CONCAT('%', p_SearchTerm, '%'))
      AND (p_Department IS NULL OR p_Department = '' OR p_Department = 'All Departments' OR d.DepartmentName = p_Department OR d.DepartmentCode = p_Department)
      AND (p_DesignationId IS NULL OR p_DesignationId <= 0 OR s.DesignationId = p_DesignationId)
      AND (p_Designation IS NULL OR p_Designation = '' OR s.Designation = p_Designation)
      AND (p_StaffType IS NULL OR p_StaffType = '' OR p_StaffType = 'All' OR s.StaffType = p_StaffType OR s.FacultyType = p_StaffType)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All Status' OR s.Status = p_Status);

    -- Result Set 2: Paged Items
    SELECT 
        s.Id,
        s.EmployeeId,
        s.FirstName,
        s.LastName,
        s.Gender,
        s.DateOfBirth,
        s.Aadhaar,
        s.Mobile,
        s.Email,
        s.BloodGroup,
        s.Qualification,
        s.Designation,
        s.DesignationId,
        IFNULL(s.StaffType, IFNULL(s.FacultyType, 'Teaching')) AS StaffType,
        IFNULL(s.StaffType, IFNULL(s.FacultyType, 'Teaching')) AS FacultyType,
        s.DepartmentId,
        d.DepartmentName AS Department,
        s.JoiningDate,
        s.Experience,
        s.Status,
        s.PhotoPath,
        s.CreatedAt,
        s.UpdatedAt,
        s.IsDeleted
    FROM Staffs s
    LEFT JOIN Departments d ON d.DepartmentId = s.DepartmentId
    WHERE (s.IsDeleted = 0 OR s.IsDeleted IS NULL)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR 
           s.FirstName LIKE CONCAT('%', p_SearchTerm, '%') OR 
           s.LastName LIKE CONCAT('%', p_SearchTerm, '%') OR 
           s.EmployeeId LIKE CONCAT('%', p_SearchTerm, '%') OR 
           s.Email LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.Mobile LIKE CONCAT('%', p_SearchTerm, '%'))
      AND (p_Department IS NULL OR p_Department = '' OR p_Department = 'All Departments' OR d.DepartmentName = p_Department OR d.DepartmentCode = p_Department)
      AND (p_DesignationId IS NULL OR p_DesignationId <= 0 OR s.DesignationId = p_DesignationId)
      AND (p_Designation IS NULL OR p_Designation = '' OR s.Designation = p_Designation)
      AND (p_StaffType IS NULL OR p_StaffType = '' OR p_StaffType = 'All' OR s.StaffType = p_StaffType OR s.FacultyType = p_StaffType)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All Status' OR s.Status = p_Status)
    ORDER BY 
        CASE WHEN p_SortBy = 'FirstName' AND (p_SortOrder IS NULL OR p_SortOrder = 'ASC') THEN s.FirstName END ASC,
        CASE WHEN p_SortBy = 'FirstName' AND p_SortOrder = 'DESC' THEN s.FirstName END DESC,
        CASE WHEN p_SortBy = 'LastName' AND (p_SortOrder IS NULL OR p_SortOrder = 'ASC') THEN s.LastName END ASC,
        CASE WHEN p_SortBy = 'LastName' AND p_SortOrder = 'DESC' THEN s.LastName END DESC,
        CASE WHEN p_SortBy = 'EmployeeId' AND (p_SortOrder IS NULL OR p_SortOrder = 'ASC') THEN s.EmployeeId END ASC,
        CASE WHEN p_SortBy = 'EmployeeId' AND p_SortOrder = 'DESC' THEN s.EmployeeId END DESC,
        CASE WHEN (p_SortBy IS NULL OR p_SortBy = '' OR p_SortBy = 'Id') THEN s.Id END DESC
    LIMIT v_Limit OFFSET v_Offset;
END //

CREATE PROCEDURE `sp_GetPagedFaculties`(
    IN p_SearchTerm VARCHAR(100),
    IN p_Department VARCHAR(100),
    IN p_Designation VARCHAR(100),
    IN p_DesignationId INT,
    IN p_FacultyType VARCHAR(20),
    IN p_Status VARCHAR(50),
    IN p_SortBy VARCHAR(50),
    IN p_SortOrder VARCHAR(10),
    IN p_PageNumber INT,
    IN p_PageSize INT
)
BEGIN
    CALL sp_GetPagedStaff(p_SearchTerm, p_Department, p_Designation, p_DesignationId, p_FacultyType, p_Status, p_SortBy, p_SortOrder, p_PageNumber, p_PageSize);
END //
DELIMITER ;

-- B. sp_GetStaffById
DROP PROCEDURE IF EXISTS `sp_GetStaffById`;
DROP PROCEDURE IF EXISTS `sp_GetFacultyById`;
DELIMITER //
CREATE PROCEDURE `sp_GetStaffById`(
    IN p_Id INT
)
BEGIN
    -- Result Set 1: Staff Details
    SELECT 
        s.Id,
        s.EmployeeId,
        s.FirstName,
        s.LastName,
        s.Gender,
        s.DateOfBirth,
        s.Aadhaar,
        s.Mobile,
        s.Email,
        s.BloodGroup,
        s.Qualification,
        s.Designation,
        s.DesignationId,
        IFNULL(s.StaffType, IFNULL(s.FacultyType, 'Teaching')) AS StaffType,
        IFNULL(s.StaffType, IFNULL(s.FacultyType, 'Teaching')) AS FacultyType,
        s.DepartmentId,
        d.DepartmentName AS Department,
        s.JoiningDate,
        s.Experience,
        s.Status,
        s.PhotoPath,
        s.CreatedAt,
        s.UpdatedAt,
        s.IsDeleted
    FROM Staffs s
    LEFT JOIN Departments d ON d.DepartmentId = s.DepartmentId
    WHERE s.Id = p_Id AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL);

    -- Result Set 2: Subject Allocations
    SELECT 
        ssa.Id,
        COALESCE(ssa.StaffId, ssa.FacultyId) AS StaffId,
        COALESCE(ssa.StaffId, ssa.FacultyId) AS FacultyId,
        ssa.SubjectId,
        sub.SubjectCode,
        sub.SubjectName,
        sub.Board,
        sub.Group,
        sub.AcademicLevel,
        ssa.CreatedAt,
        ssa.UpdatedAt
    FROM StaffSubjectAllocations ssa
    LEFT JOIN Subjects sub ON sub.SubjectId = ssa.SubjectId
    WHERE (ssa.StaffId = p_Id OR ssa.FacultyId = p_Id)
    ORDER BY ssa.Id DESC;
END //

CREATE PROCEDURE `sp_GetFacultyById`(IN p_Id INT)
BEGIN
    CALL sp_GetStaffById(p_Id);
END //
DELIMITER ;

-- C. sp_CreateStaff
DROP PROCEDURE IF EXISTS `sp_CreateStaff`;
DROP PROCEDURE IF EXISTS `sp_CreateFaculty`;
DELIMITER //
CREATE PROCEDURE `sp_CreateStaff`(
    IN p_EmployeeId VARCHAR(50),
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME(6),
    IN p_Aadhaar VARCHAR(12),
    IN p_Mobile VARCHAR(15),
    IN p_Email VARCHAR(150),
    IN p_BloodGroup VARCHAR(10),
    IN p_Qualification VARCHAR(100),
    IN p_Designation VARCHAR(100),
    IN p_DesignationId INT,
    IN p_StaffType VARCHAR(20),
    IN p_DepartmentId INT,
    IN p_JoiningDate DATETIME(6),
    IN p_Experience DECIMAL(5,2),
    IN p_Status VARCHAR(20),
    IN p_PhotoPath VARCHAR(500)
)
BEGIN
    DECLARE v_StaffType VARCHAR(20);
    SET v_StaffType = IFNULL(p_StaffType, 'Teaching');

    INSERT INTO Staffs (
        EmployeeId, FirstName, LastName, Gender, DateOfBirth, Aadhaar, Mobile, Email, BloodGroup, 
        Qualification, Designation, DesignationId, StaffType, FacultyType, DepartmentId, JoiningDate, Experience, Status, PhotoPath, CreatedAt, IsDeleted
    ) VALUES (
        p_EmployeeId, p_FirstName, p_LastName, p_Gender, p_DateOfBirth, p_Aadhaar, p_Mobile, p_Email, p_BloodGroup, 
        p_Qualification, p_Designation, p_DesignationId, v_StaffType, v_StaffType, p_DepartmentId, p_JoiningDate, IFNULL(p_Experience, 0.00), IFNULL(p_Status, 'Active'), p_PhotoPath, UTC_TIMESTAMP(), 0
    );
    SELECT LAST_INSERT_ID() AS Id;
END //

CREATE PROCEDURE `sp_CreateFaculty`(
    IN p_EmployeeId VARCHAR(50),
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME(6),
    IN p_Aadhaar VARCHAR(12),
    IN p_Mobile VARCHAR(15),
    IN p_Email VARCHAR(150),
    IN p_BloodGroup VARCHAR(10),
    IN p_Qualification VARCHAR(100),
    IN p_Designation VARCHAR(100),
    IN p_DesignationId INT,
    IN p_FacultyType VARCHAR(20),
    IN p_DepartmentId INT,
    IN p_JoiningDate DATETIME(6),
    IN p_Experience DECIMAL(5,2),
    IN p_Status VARCHAR(20),
    IN p_PhotoPath VARCHAR(500)
)
BEGIN
    CALL sp_CreateStaff(
        p_EmployeeId, p_FirstName, p_LastName, p_Gender, p_DateOfBirth, p_Aadhaar, p_Mobile, p_Email, p_BloodGroup, 
        p_Qualification, p_Designation, p_DesignationId, p_FacultyType, p_DepartmentId, p_JoiningDate, p_Experience, p_Status, p_PhotoPath
    );
END //
DELIMITER ;

-- D. sp_UpdateStaff
DROP PROCEDURE IF EXISTS `sp_UpdateStaff`;
DROP PROCEDURE IF EXISTS `sp_UpdateFaculty`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateStaff`(
    IN p_Id INT,
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME(6),
    IN p_Aadhaar VARCHAR(12),
    IN p_Mobile VARCHAR(15),
    IN p_Email VARCHAR(150),
    IN p_BloodGroup VARCHAR(10),
    IN p_Qualification VARCHAR(100),
    IN p_Designation VARCHAR(100),
    IN p_DesignationId INT,
    IN p_StaffType VARCHAR(20),
    IN p_DepartmentId INT,
    IN p_JoiningDate DATETIME(6),
    IN p_Experience DECIMAL(5,2),
    IN p_Status VARCHAR(20),
    IN p_PhotoPath VARCHAR(500)
)
BEGIN
    DECLARE v_StaffType VARCHAR(20);
    SET v_StaffType = IFNULL(p_StaffType, 'Teaching');

    UPDATE Staffs SET
        FirstName = p_FirstName,
        LastName = p_LastName,
        Gender = p_Gender,
        DateOfBirth = p_DateOfBirth,
        Aadhaar = p_Aadhaar,
        Mobile = p_Mobile,
        Email = p_Email,
        BloodGroup = p_BloodGroup,
        Qualification = p_Qualification,
        Designation = p_Designation,
        DesignationId = p_DesignationId,
        StaffType = v_StaffType,
        FacultyType = v_StaffType,
        DepartmentId = p_DepartmentId,
        JoiningDate = p_JoiningDate,
        Experience = IFNULL(p_Experience, 0.00),
        Status = p_Status,
        PhotoPath = p_PhotoPath,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_Id;
END //

CREATE PROCEDURE `sp_UpdateFaculty`(
    IN p_Id INT,
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME(6),
    IN p_Aadhaar VARCHAR(12),
    IN p_Mobile VARCHAR(15),
    IN p_Email VARCHAR(150),
    IN p_BloodGroup VARCHAR(10),
    IN p_Qualification VARCHAR(100),
    IN p_Designation VARCHAR(100),
    IN p_DesignationId INT,
    IN p_FacultyType VARCHAR(20),
    IN p_DepartmentId INT,
    IN p_JoiningDate DATETIME(6),
    IN p_Experience DECIMAL(5,2),
    IN p_Status VARCHAR(20),
    IN p_PhotoPath VARCHAR(500)
)
BEGIN
    CALL sp_UpdateStaff(
        p_Id, p_FirstName, p_LastName, p_Gender, p_DateOfBirth, p_Aadhaar, p_Mobile, p_Email, p_BloodGroup, 
        p_Qualification, p_Designation, p_DesignationId, p_FacultyType, p_DepartmentId, p_JoiningDate, p_Experience, p_Status, p_PhotoPath
    );
END //
DELIMITER ;

-- E. sp_SoftDeleteStaff
DROP PROCEDURE IF EXISTS `sp_SoftDeleteStaff`;
DROP PROCEDURE IF EXISTS `sp_SoftDeleteFaculty`;
DELIMITER //
CREATE PROCEDURE `sp_SoftDeleteStaff`(IN p_Id INT)
BEGIN
    UPDATE Staffs SET IsDeleted = 1, UpdatedAt = UTC_TIMESTAMP() WHERE Id = p_Id;
END //

CREATE PROCEDURE `sp_SoftDeleteFaculty`(IN p_Id INT)
BEGIN
    CALL sp_SoftDeleteStaff(p_Id);
END //
DELIMITER ;

-- F. sp_GetStaffDropdown
DROP PROCEDURE IF EXISTS `sp_GetStaffDropdown`;
DROP PROCEDURE IF EXISTS `sp_GetFacultyDropdown`;
DELIMITER //
CREATE PROCEDURE `sp_GetStaffDropdown`(
    IN p_StaffType VARCHAR(20)
)
BEGIN
    SELECT 
        Id,
        EmployeeId,
        CONCAT(FirstName, ' ', LastName) AS FullName,
        Designation,
        DesignationId,
        IFNULL(StaffType, IFNULL(FacultyType, 'Teaching')) AS StaffType,
        IFNULL(StaffType, IFNULL(FacultyType, 'Teaching')) AS FacultyType
    FROM Staffs
    WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
      AND Status = 'Active'
      AND (p_StaffType IS NULL OR p_StaffType = '' OR p_StaffType = 'All' OR StaffType = p_StaffType OR FacultyType = p_StaffType)
    ORDER BY FirstName ASC;
END //

CREATE PROCEDURE `sp_GetFacultyDropdown`(IN p_FacultyType VARCHAR(20))
BEGIN
    CALL sp_GetStaffDropdown(p_FacultyType);
END //
DELIMITER ;

-- G. Auto Generate Employee ID (PJCTCH0001 / PJCNTCH0001)
DROP PROCEDURE IF EXISTS `sp_GenerateStaffEmployeeId`;
DELIMITER //
CREATE PROCEDURE `sp_GenerateStaffEmployeeId`(
    IN p_StaffType VARCHAR(20)
)
BEGIN
    DECLARE v_Prefix VARCHAR(10);
    DECLARE v_MaxNum INT DEFAULT 0;
    DECLARE v_NextId VARCHAR(50);

    IF LOWER(TRIM(p_StaffType)) = 'non-teaching' THEN
        SET v_Prefix = 'PJCNTCH';
    ELSE
        SET v_Prefix = 'PJCTCH';
    END IF;

    -- Extract maximum numeric suffix from existing Employee IDs starting with prefix
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(EmployeeId, LENGTH(v_Prefix) + 1) AS UNSIGNED)
    ), 0) INTO v_MaxNum
    FROM Staffs
    WHERE EmployeeId LIKE CONCAT(v_Prefix, '%')
      AND SUBSTRING(EmployeeId, LENGTH(v_Prefix) + 1) REGEXP '^[0-9]+$';

    SET v_NextId = CONCAT(v_Prefix, LPAD(v_MaxNum + 1, 4, '0'));
    SELECT v_NextId AS NextEmployeeId;
END //
DELIMITER ;

-- H. Lookup and Validation Procedures
DROP PROCEDURE IF EXISTS `sp_GetStaffByEmployeeId`;
DROP PROCEDURE IF EXISTS `sp_GetFacultyByEmployeeId`;
DELIMITER //
CREATE PROCEDURE `sp_GetStaffByEmployeeId`(IN p_EmployeeId VARCHAR(50))
BEGIN
    SELECT * FROM Staffs WHERE EmployeeId = p_EmployeeId AND (IsDeleted = 0 OR IsDeleted IS NULL);
END //
CREATE PROCEDURE `sp_GetFacultyByEmployeeId`(IN p_EmployeeId VARCHAR(50))
BEGIN
    CALL sp_GetStaffByEmployeeId(p_EmployeeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetStaffByEmail`;
DROP PROCEDURE IF EXISTS `sp_GetFacultyByEmail`;
DELIMITER //
CREATE PROCEDURE `sp_GetStaffByEmail`(IN p_Email VARCHAR(150))
BEGIN
    SELECT * FROM Staffs WHERE Email = p_Email AND (IsDeleted = 0 OR IsDeleted IS NULL);
END //
CREATE PROCEDURE `sp_GetFacultyByEmail`(IN p_Email VARCHAR(150))
BEGIN
    CALL sp_GetStaffByEmail(p_Email);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetStaffByMobile`;
DROP PROCEDURE IF EXISTS `sp_GetFacultyByMobile`;
DELIMITER //
CREATE PROCEDURE `sp_GetStaffByMobile`(IN p_Mobile VARCHAR(15))
BEGIN
    SELECT * FROM Staffs WHERE Mobile = p_Mobile AND (IsDeleted = 0 OR IsDeleted IS NULL);
END //
CREATE PROCEDURE `sp_GetFacultyByMobile`(IN p_Mobile VARCHAR(15))
BEGIN
    CALL sp_GetStaffByMobile(p_Mobile);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetStaffByAadhaar`;
DROP PROCEDURE IF EXISTS `sp_GetFacultyByAadhaar`;
DELIMITER //
CREATE PROCEDURE `sp_GetStaffByAadhaar`(IN p_Aadhaar VARCHAR(12))
BEGIN
    SELECT * FROM Staffs WHERE Aadhaar = p_Aadhaar AND (IsDeleted = 0 OR IsDeleted IS NULL);
END //
CREATE PROCEDURE `sp_GetFacultyByAadhaar`(IN p_Aadhaar VARCHAR(12))
BEGIN
    CALL sp_GetStaffByAadhaar(p_Aadhaar);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetStaffPhotoPath`;
DROP PROCEDURE IF EXISTS `sp_GetFacultyPhotoPath`;
DELIMITER //
CREATE PROCEDURE `sp_GetStaffPhotoPath`(IN p_Id INT)
BEGIN
    SELECT PhotoPath FROM Staffs WHERE Id = p_Id AND (IsDeleted = 0 OR IsDeleted IS NULL);
END //
CREATE PROCEDURE `sp_GetFacultyPhotoPath`(IN p_Id INT)
BEGIN
    CALL sp_GetStaffPhotoPath(p_Id);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateStaffPhotoPath`;
DROP PROCEDURE IF EXISTS `sp_UpdateFacultyPhotoPath`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateStaffPhotoPath`(IN p_Id INT, IN p_PhotoPath VARCHAR(500))
BEGIN
    UPDATE Staffs SET PhotoPath = p_PhotoPath, UpdatedAt = UTC_TIMESTAMP() WHERE Id = p_Id;
END //
CREATE PROCEDURE `sp_UpdateFacultyPhotoPath`(IN p_Id INT, IN p_PhotoPath VARCHAR(500))
BEGIN
    CALL sp_UpdateStaffPhotoPath(p_Id, p_PhotoPath);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckStaffEmployeeIdUnique`;
DROP PROCEDURE IF EXISTS `sp_CheckEmployeeIdUnique`;
DELIMITER //
CREATE PROCEDURE `sp_CheckStaffEmployeeIdUnique`(IN p_EmployeeId VARCHAR(50), IN p_ExcludeId INT)
BEGIN
    SELECT COUNT(*) FROM Staffs WHERE EmployeeId = p_EmployeeId AND (p_ExcludeId IS NULL OR p_ExcludeId <= 0 OR Id <> p_ExcludeId);
END //
CREATE PROCEDURE `sp_CheckEmployeeIdUnique`(IN p_EmployeeId VARCHAR(50), IN p_ExcludeId INT)
BEGIN
    CALL sp_CheckStaffEmployeeIdUnique(p_EmployeeId, p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckStaffEmailUnique`;
DROP PROCEDURE IF EXISTS `sp_CheckEmailUnique`;
DELIMITER //
CREATE PROCEDURE `sp_CheckStaffEmailUnique`(IN p_Email VARCHAR(150), IN p_ExcludeId INT)
BEGIN
    SELECT COUNT(*) FROM Staffs WHERE Email = p_Email AND (p_ExcludeId IS NULL OR p_ExcludeId <= 0 OR Id <> p_ExcludeId);
END //
CREATE PROCEDURE `sp_CheckEmailUnique`(IN p_Email VARCHAR(150), IN p_ExcludeId INT)
BEGIN
    CALL sp_CheckStaffEmailUnique(p_Email, p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckStaffMobileUnique`;
DROP PROCEDURE IF EXISTS `sp_CheckMobileUnique`;
DELIMITER //
CREATE PROCEDURE `sp_CheckStaffMobileUnique`(IN p_Mobile VARCHAR(15), IN p_ExcludeId INT)
BEGIN
    SELECT COUNT(*) FROM Staffs WHERE Mobile = p_Mobile AND (p_ExcludeId IS NULL OR p_ExcludeId <= 0 OR Id <> p_ExcludeId);
END //
CREATE PROCEDURE `sp_CheckMobileUnique`(IN p_Mobile VARCHAR(15), IN p_ExcludeId INT)
BEGIN
    CALL sp_CheckStaffMobileUnique(p_Mobile, p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckStaffAadhaarUnique`;
DROP PROCEDURE IF EXISTS `sp_CheckAadhaarUnique`;
DELIMITER //
CREATE PROCEDURE `sp_CheckStaffAadhaarUnique`(IN p_Aadhaar VARCHAR(12), IN p_ExcludeId INT)
BEGIN
    SELECT COUNT(*) FROM Staffs WHERE Aadhaar = p_Aadhaar AND (p_ExcludeId IS NULL OR p_ExcludeId <= 0 OR Id <> p_ExcludeId);
END //
CREATE PROCEDURE `sp_CheckAadhaarUnique`(IN p_Aadhaar VARCHAR(12), IN p_ExcludeId INT)
BEGIN
    CALL sp_CheckStaffAadhaarUnique(p_Aadhaar, p_ExcludeId);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 7. Stored Procedures: Staff Subject Allocation
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetSubjectAllocationById`;
DELIMITER //
CREATE PROCEDURE `sp_GetSubjectAllocationById`(IN p_Id INT)
BEGIN
    SELECT 
        ssa.Id,
        COALESCE(ssa.StaffId, ssa.FacultyId) AS StaffId,
        COALESCE(ssa.StaffId, ssa.FacultyId) AS FacultyId,
        ssa.SubjectId,
        ssa.CreatedAt,
        ssa.UpdatedAt,

        s.Id AS StaffRecordId,
        s.EmployeeId,
        s.FirstName,
        s.LastName,
        s.Email,
        s.Mobile,
        s.Designation,
        s.StaffType,

        sub.SubjectId,
        sub.SubjectCode,
        sub.SubjectName,
        sub.SubjectType,
        COALESCE(b.BoardName, sub.Board, '') AS Board,
        COALESCE(g.GroupName, sub.`Group`, '') AS `Group`,
        COALESCE(al.LevelName, sub.AcademicLevel, '') AS AcademicLevel
    FROM StaffSubjectAllocations ssa
    INNER JOIN Staffs s ON s.Id = COALESCE(ssa.StaffId, ssa.FacultyId)
    INNER JOIN Subjects sub ON sub.SubjectId = ssa.SubjectId
    LEFT JOIN Boards b ON b.BoardId = sub.BoardId
    LEFT JOIN `Groups` g ON g.GroupId = sub.GroupId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = sub.AcademicLevelId
    WHERE ssa.Id = p_Id;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetSubjectAllocationsByFacultyId`;
DROP PROCEDURE IF EXISTS `sp_GetSubjectAllocationsByStaffId`;
DELIMITER //
CREATE PROCEDURE `sp_GetSubjectAllocationsByStaffId`(IN p_StaffId INT)
BEGIN
    SELECT 
        ssa.Id,
        ssa.StaffId,
        ssa.SubjectId,
        ssa.CreatedAt,
        ssa.UpdatedAt,

        s.Id AS StaffRecordId,
        s.EmployeeId,
        s.FirstName,
        s.LastName,
        s.Email,
        s.Mobile,
        s.Designation,
        s.StaffType,

        sub.SubjectId,
        sub.SubjectCode,
        sub.SubjectName,
        sub.SubjectType,
        COALESCE(b.BoardName, sub.Board, '') AS Board,
        COALESCE(g.GroupName, sub.`Group`, '') AS `Group`,
        COALESCE(al.LevelName, sub.AcademicLevel, '') AS AcademicLevel
    FROM StaffSubjectAllocations ssa
    INNER JOIN Staffs s ON s.Id = ssa.StaffId
    INNER JOIN Subjects sub ON sub.SubjectId = ssa.SubjectId
    LEFT JOIN Boards b ON b.BoardId = sub.BoardId
    LEFT JOIN `Groups` g ON g.GroupId = sub.GroupId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = sub.AcademicLevelId
    WHERE ssa.StaffId = p_StaffId
    ORDER BY ssa.Id DESC;
END //

CREATE PROCEDURE `sp_GetSubjectAllocationsByFacultyId`(IN p_FacultyId INT)
BEGIN
    CALL sp_GetSubjectAllocationsByStaffId(p_FacultyId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateSubjectAllocation`;
DROP PROCEDURE IF EXISTS `sp_CreateStaffSubjectAllocation`;
DROP PROCEDURE IF EXISTS `sp_AssignStaffSubject`;
DELIMITER //
CREATE PROCEDURE `sp_CreateStaffSubjectAllocation`(
    IN p_StaffId INT,
    IN p_SubjectId INT
)
BEGIN
    INSERT INTO StaffSubjectAllocations (
        StaffId, SubjectId, CreatedAt
    ) VALUES (
        p_StaffId, p_SubjectId, UTC_TIMESTAMP()
    );
    SELECT LAST_INSERT_ID() AS Id;
END //

CREATE PROCEDURE `sp_AssignStaffSubject`(IN p_StaffId INT, IN p_SubjectId INT)
BEGIN
    CALL sp_CreateStaffSubjectAllocation(p_StaffId, p_SubjectId);
END //

CREATE PROCEDURE `sp_CreateSubjectAllocation`(IN p_FacultyId INT, IN p_SubjectId INT)
BEGIN
    CALL sp_CreateStaffSubjectAllocation(p_FacultyId, p_SubjectId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateSubjectAllocation`;
DROP PROCEDURE IF EXISTS `sp_UpdateStaffSubjectAllocation`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateStaffSubjectAllocation`(
    IN p_Id INT,
    IN p_SubjectId INT
)
BEGIN
    UPDATE StaffSubjectAllocations SET
        SubjectId = p_SubjectId,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_Id;
END //

CREATE PROCEDURE `sp_UpdateSubjectAllocation`(IN p_Id INT, IN p_SubjectId INT)
BEGIN
    CALL sp_UpdateStaffSubjectAllocation(p_Id, p_SubjectId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteSubjectAllocation`;
DROP PROCEDURE IF EXISTS `sp_DeleteStaffSubjectAllocation`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteStaffSubjectAllocation`(IN p_Id INT)
BEGIN
    DELETE FROM StaffSubjectAllocations WHERE Id = p_Id;
END //

CREATE PROCEDURE `sp_DeleteSubjectAllocation`(IN p_Id INT)
BEGIN
    CALL sp_DeleteStaffSubjectAllocation(p_Id);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckDuplicateSubjectAllocation`;
DROP PROCEDURE IF EXISTS `sp_CheckDuplicateStaffSubjectAllocation`;
DROP PROCEDURE IF EXISTS `sp_CheckStaffSubjectAllocationExists`;
DELIMITER //
CREATE PROCEDURE `sp_CheckDuplicateStaffSubjectAllocation`(
    IN p_StaffId INT,
    IN p_SubjectId INT,
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM StaffSubjectAllocations
    WHERE StaffId = p_StaffId
      AND SubjectId = p_SubjectId
      AND (p_ExcludeId IS NULL OR p_ExcludeId <= 0 OR Id <> p_ExcludeId);
END //

CREATE PROCEDURE `sp_CheckStaffSubjectAllocationExists`(IN p_StaffId INT, IN p_SubjectId INT, IN p_ExcludeId INT)
BEGIN
    CALL sp_CheckDuplicateStaffSubjectAllocation(p_StaffId, p_SubjectId, p_ExcludeId);
END //

CREATE PROCEDURE `sp_CheckDuplicateSubjectAllocation`(IN p_FacultyId INT, IN p_SubjectId INT, IN p_ExcludeId INT)
BEGIN
    CALL sp_CheckDuplicateStaffSubjectAllocation(p_FacultyId, p_SubjectId, p_ExcludeId);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 8. Stored Procedures: Departments & Designations Filtering
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetDepartments`;
DELIMITER //
CREATE PROCEDURE `sp_GetDepartments`(
    IN p_StaffType VARCHAR(20)
)
BEGIN
    SELECT 
        DepartmentId, 
        DepartmentCode, 
        DepartmentName, 
        StaffType,
        Description, 
        IsActive
    FROM Departments
    WHERE IsActive = 1
      AND (p_StaffType IS NULL OR p_StaffType = '' OR p_StaffType = 'All' OR StaffType = 'Both' OR StaffType = p_StaffType)
    ORDER BY DepartmentName ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateDepartment`;
DELIMITER //
CREATE PROCEDURE `sp_CreateDepartment`(
    IN p_DepartmentName VARCHAR(100),
    IN p_DepartmentCode VARCHAR(20),
    IN p_StaffType VARCHAR(20),
    IN p_Description VARCHAR(500)
)
BEGIN
    DECLARE v_Code VARCHAR(20);
    IF p_DepartmentCode IS NULL OR TRIM(p_DepartmentCode) = '' THEN
        SET v_Code = CONCAT('DEP_', UPPER(REPLACE(SUBSTRING(TRIM(p_DepartmentName), 1, 8), ' ', '')));
    ELSE
        SET v_Code = TRIM(p_DepartmentCode);
    END IF;

    INSERT INTO Departments (DepartmentName, DepartmentCode, StaffType, Description, IsActive, CreatedAt)
    VALUES (TRIM(p_DepartmentName), v_Code, IFNULL(p_StaffType, 'Both'), p_Description, 1, UTC_TIMESTAMP());

    SELECT LAST_INSERT_ID() AS DepartmentId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetDesignations`;
DELIMITER //
CREATE PROCEDURE `sp_GetDesignations`(
    IN p_IncludeInactive INT,
    IN p_StaffType VARCHAR(20)
)
BEGIN
    SELECT 
        Id,
        Name,
        StaffType,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM Designations
    WHERE (p_IncludeInactive = 1 OR IsActive = 1)
      AND (p_StaffType IS NULL OR p_StaffType = '' OR p_StaffType = 'All' OR StaffType = 'Both' OR StaffType = p_StaffType)
    ORDER BY Name ASC;
END //

DROP PROCEDURE IF EXISTS `sp_GetDesignationById` //
CREATE PROCEDURE `sp_GetDesignationById`(IN p_Id INT)
BEGIN
    SELECT Id, Name, StaffType, IsActive, CreatedAt, UpdatedAt
    FROM Designations
    WHERE Id = p_Id;
END //

DROP PROCEDURE IF EXISTS `sp_GetDesignationByName` //
CREATE PROCEDURE `sp_GetDesignationByName`(IN p_Name VARCHAR(100))
BEGIN
    SELECT Id, Name, StaffType, IsActive, CreatedAt, UpdatedAt
    FROM Designations
    WHERE LOWER(TRIM(Name)) = LOWER(TRIM(p_Name))
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CheckDesignationNameUnique` //
CREATE PROCEDURE `sp_CheckDesignationNameUnique`(IN p_Name VARCHAR(100), IN p_ExcludeId INT)
BEGIN
    SELECT COUNT(*) 
    FROM Designations 
    WHERE LOWER(TRIM(Name)) = LOWER(TRIM(p_Name))
      AND (p_ExcludeId IS NULL OR p_ExcludeId <= 0 OR Id != p_ExcludeId);
END //

DROP PROCEDURE IF EXISTS `sp_CheckDesignationAssignedToStaff` //
DROP PROCEDURE IF EXISTS `sp_CheckDesignationAssignedToFaculty` //
CREATE PROCEDURE `sp_CheckDesignationAssignedToStaff`(IN p_DesignationId INT)
BEGIN
    SELECT COUNT(*) 
    FROM Staffs 
    WHERE DesignationId = p_DesignationId 
      AND (IsDeleted = 0 OR IsDeleted IS NULL);
END //

CREATE PROCEDURE `sp_CheckDesignationAssignedToFaculty`(IN p_DesignationId INT)
BEGIN
    CALL sp_CheckDesignationAssignedToStaff(p_DesignationId);
END //

DROP PROCEDURE IF EXISTS `sp_CreateDesignation` //
CREATE PROCEDURE `sp_CreateDesignation`(
    IN p_Name VARCHAR(100),
    IN p_StaffType VARCHAR(20),
    IN p_IsActive INT
)
BEGIN
    INSERT INTO Designations (Name, StaffType, IsActive, CreatedAt)
    VALUES (TRIM(p_Name), IFNULL(p_StaffType, 'Both'), IFNULL(p_IsActive, 1), UTC_TIMESTAMP());

    SELECT LAST_INSERT_ID() AS Id;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateDesignation` //
CREATE PROCEDURE `sp_UpdateDesignation`(
    IN p_Id INT,
    IN p_Name VARCHAR(100),
    IN p_StaffType VARCHAR(20),
    IN p_IsActive INT
)
BEGIN
    UPDATE Designations 
    SET Name = TRIM(p_Name),
        StaffType = IFNULL(p_StaffType, 'Both'),
        IsActive = IFNULL(p_IsActive, 1),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_Id;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteDesignation` //
CREATE PROCEDURE `sp_DeleteDesignation`(IN p_Id INT)
BEGIN
    DELETE FROM Designations WHERE Id = p_Id;
END //
DELIMITER ;

