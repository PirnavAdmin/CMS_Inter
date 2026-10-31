-- =============================================================================
-- MODULE: STAFF MANAGEMENT - COMPLETE COMPREHENSIVE STORED PROCEDURES & SCHEMA
-- DATABASE: u819242402_CLM_System
-- DESCRIPTION: Contains all Stored Procedures (SPs), Views, Table Updates, and Master Data
--              for the complete Staff Management Module (Teaching, Non-Teaching,
--              Candidate Profile Completion Workflow, and Allocations).
-- =============================================================================

USE `u819242402_CLM_System`;

-- =============================================================================
-- PART 1: TABLE SCHEMA DEFINITIONS & SAFE MIGRATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS `Staff` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `EmployeeId` VARCHAR(50) NOT NULL,
    `FirstName` VARCHAR(100) NOT NULL,
    `MiddleName` VARCHAR(100) NULL,
    `LastName` VARCHAR(100) NOT NULL,
    `FatherOrHusbandName` VARCHAR(150) NULL,
    `Gender` VARCHAR(20) NOT NULL,
    `DateOfBirth` DATE NOT NULL,
    `MaritalStatus` VARCHAR(20) NULL,
    `Nationality` VARCHAR(50) NULL DEFAULT 'Indian',
    `Aadhaar` VARCHAR(20) NULL,
    `PanNumber` VARCHAR(20) NULL,
    `Mobile` VARCHAR(15) NOT NULL,
    `AlternateMobile` VARCHAR(15) NULL,
    `Email` VARCHAR(150) NOT NULL,
    `BloodGroup` VARCHAR(10) NULL,
    
    -- Address Details
    `CurrentAddress` VARCHAR(255) NULL,
    `PermanentAddress` VARCHAR(255) NULL,
    `City` VARCHAR(100) NULL,
    `District` VARCHAR(100) NULL,
    `State` VARCHAR(100) NULL,
    `Pincode` VARCHAR(20) NULL,
    `Country` VARCHAR(100) NULL DEFAULT 'India',
    
    -- Professional Details
    `Qualification` VARCHAR(100) NOT NULL,
    `Designation` VARCHAR(100) NOT NULL,
    `DesignationId` INT NULL,
    `StaffType` VARCHAR(20) NOT NULL DEFAULT 'Teaching',
    `DepartmentId` INT NULL,
    `BoardId` INT NULL,
    `JoiningDate` DATE NOT NULL,
    `Experience` DECIMAL(4, 1) NOT NULL DEFAULT 0.0,
    `EmploymentType` VARCHAR(50) NULL DEFAULT 'Full Time',
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Active',
    `PhotoPath` VARCHAR(500) NULL,
    
    -- Profile Completion Lifecycle Workflow
    `ProfileStatus` VARCHAR(50) NOT NULL DEFAULT 'PendingLink',
    `ProfileCompletionPercentage` INT NOT NULL DEFAULT 30,
    `ProfileLinkToken` VARCHAR(100) NULL,
    `ProfileLinkSentAt` DATETIME NULL,
    `ProfileLinkExpiresAt` DATETIME NULL,
    `SubmittedAt` DATETIME NULL,
    `ApprovedAt` DATETIME NULL,
    `CorrectionRequestedAt` DATETIME NULL,
    `CorrectionNotes` VARCHAR(1000) NULL,
    
    -- JSON Data Columns
    `EducationJson` LONGTEXT NULL,
    `ExperienceJson` LONGTEXT NULL,
    `DocumentsJson` LONGTEXT NULL,
    `BankDetailsJson` LONGTEXT NULL,
    `EmergencyContactJson` LONGTEXT NULL,
    
    -- Timestamps & Soft Delete
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    
    PRIMARY KEY (`Id`),
    INDEX `IX_Staff_EmployeeId` (`EmployeeId`),
    INDEX `IX_Staff_Email` (`Email`),
    INDEX `IX_Staff_Mobile` (`Mobile`),
    INDEX `IX_Staff_StaffType` (`StaffType`),
    INDEX `IX_Staff_DepartmentId` (`DepartmentId`),
    INDEX `IX_Staff_DesignationId` (`DesignationId`),
    INDEX `IX_Staff_BoardId` (`BoardId`),
    INDEX `IX_Staff_ProfileLinkToken` (`ProfileLinkToken`),
    INDEX `IX_Staff_IsDeleted` (`IsDeleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Safe column additions for pre-existing tables
DROP PROCEDURE IF EXISTS `AddStaffColumnsSafely`;
DELIMITER //
CREATE PROCEDURE `AddStaffColumnsSafely`()
BEGIN
    -- Columns for Staff
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'MiddleName') THEN
        ALTER TABLE `Staff` ADD `MiddleName` VARCHAR(100) NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'FatherOrHusbandName') THEN
        ALTER TABLE `Staff` ADD `FatherOrHusbandName` VARCHAR(150) NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'MaritalStatus') THEN
        ALTER TABLE `Staff` ADD `MaritalStatus` VARCHAR(20) NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'Nationality') THEN
        ALTER TABLE `Staff` ADD `Nationality` VARCHAR(50) NULL DEFAULT 'Indian';
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'PanNumber') THEN
        ALTER TABLE `Staff` ADD `PanNumber` VARCHAR(20) NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'AlternateMobile') THEN
        ALTER TABLE `Staff` ADD `AlternateMobile` VARCHAR(15) NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'CurrentAddress') THEN
        ALTER TABLE `Staff` ADD `CurrentAddress` VARCHAR(255) NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'PermanentAddress') THEN
        ALTER TABLE `Staff` ADD `PermanentAddress` VARCHAR(255) NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'City') THEN
        ALTER TABLE `Staff` ADD `City` VARCHAR(100) NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'District') THEN
        ALTER TABLE `Staff` ADD `District` VARCHAR(100) NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'State') THEN
        ALTER TABLE `Staff` ADD `State` VARCHAR(100) NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'Pincode') THEN
        ALTER TABLE `Staff` ADD `Pincode` VARCHAR(20) NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'Country') THEN
        ALTER TABLE `Staff` ADD `Country` VARCHAR(100) NULL DEFAULT 'India';
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'StaffType') THEN
        ALTER TABLE `Staff` ADD `StaffType` VARCHAR(20) NOT NULL DEFAULT 'Teaching';
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'BoardId') THEN
        ALTER TABLE `Staff` ADD `BoardId` INT NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'EmploymentType') THEN
        ALTER TABLE `Staff` ADD `EmploymentType` VARCHAR(50) NULL DEFAULT 'Full Time';
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'ProfileStatus') THEN
        ALTER TABLE `Staff` ADD `ProfileStatus` VARCHAR(50) NOT NULL DEFAULT 'PendingLink';
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'ProfileCompletionPercentage') THEN
        ALTER TABLE `Staff` ADD `ProfileCompletionPercentage` INT NOT NULL DEFAULT 30;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'ProfileLinkToken') THEN
        ALTER TABLE `Staff` ADD `ProfileLinkToken` VARCHAR(100) NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'ProfileLinkSentAt') THEN
        ALTER TABLE `Staff` ADD `ProfileLinkSentAt` DATETIME NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'ProfileLinkExpiresAt') THEN
        ALTER TABLE `Staff` ADD `ProfileLinkExpiresAt` DATETIME NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'SubmittedAt') THEN
        ALTER TABLE `Staff` ADD `SubmittedAt` DATETIME NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'ApprovedAt') THEN
        ALTER TABLE `Staff` ADD `ApprovedAt` DATETIME NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'CorrectionRequestedAt') THEN
        ALTER TABLE `Staff` ADD `CorrectionRequestedAt` DATETIME NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'CorrectionNotes') THEN
        ALTER TABLE `Staff` ADD `CorrectionNotes` VARCHAR(1000) NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'EducationJson') THEN
        ALTER TABLE `Staff` ADD `EducationJson` LONGTEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'ExperienceJson') THEN
        ALTER TABLE `Staff` ADD `ExperienceJson` LONGTEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'DocumentsJson') THEN
        ALTER TABLE `Staff` ADD `DocumentsJson` LONGTEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'BankDetailsJson') THEN
        ALTER TABLE `Staff` ADD `BankDetailsJson` LONGTEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Staff' AND COLUMN_NAME = 'EmergencyContactJson') THEN
        ALTER TABLE `Staff` ADD `EmergencyContactJson` LONGTEXT NULL;
    END IF;

    -- Departments: StaffType
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Departments') THEN
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Departments' AND COLUMN_NAME = 'StaffType') THEN
            ALTER TABLE `Departments` ADD `StaffType` VARCHAR(20) NOT NULL DEFAULT 'Both';
        END IF;
    END IF;

    -- Designations: StaffType
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Designations') THEN
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Designations' AND COLUMN_NAME = 'StaffType') THEN
            ALTER TABLE `Designations` ADD `StaffType` VARCHAR(20) NOT NULL DEFAULT 'Both';
        END IF;
    END IF;
END //
DELIMITER ;
CALL `AddStaffColumnsSafely`();
DROP PROCEDURE IF EXISTS `AddStaffColumnsSafely`;

-- StaffSubjectAllocations Table
CREATE TABLE IF NOT EXISTS `StaffSubjectAllocations` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `StaffId` INT NOT NULL,
    `SubjectId` INT NOT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`Id`),
    INDEX `IX_SSA_StaffId` (`StaffId`),
    INDEX `IX_SSA_SubjectId` (`SubjectId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- PART 2: COMPATIBILITY VIEWS
-- =============================================================================
CREATE OR REPLACE VIEW `Faculty` AS 
SELECT 
    `Id` AS `FacultyId`,
    `Id` AS `StaffId`,
    `EmployeeId`,
    `FirstName`,
    `MiddleName`,
    `LastName`,
    `Gender`,
    `DateOfBirth`,
    `Mobile`,
    `Email`,
    `DepartmentId`,
    `DesignationId`,
    `Designation`,
    `Qualification`,
    `Experience`,
    `JoiningDate`,
    `Status`,
    `StaffType` AS `FacultyType`,
    `IsDeleted`,
    `CreatedAt`,
    `UpdatedAt`
FROM `Staff`
WHERE `IsDeleted` = 0;

CREATE OR REPLACE VIEW `FacultySubjectAllocations` AS 
SELECT 
    `Id`,
    `StaffId` AS `FacultyId`,
    `StaffId`,
    `SubjectId`,
    `CreatedAt`,
    `UpdatedAt`
FROM `StaffSubjectAllocations`;

-- =============================================================================
-- PART 3: STORED PROCEDURES FOR STAFF MANAGEMENT
-- =============================================================================

DELIMITER $$

-- 1. SP: Get Paged Staff with Filtering & Sorting
DROP PROCEDURE IF EXISTS `sp_GetPagedStaff`$$
CREATE PROCEDURE `sp_GetPagedStaff`(
    IN p_PageNumber INT,
    IN p_PageSize INT,
    IN p_SearchTerm VARCHAR(100),
    IN p_Department VARCHAR(100),
    IN p_DepartmentId INT,
    IN p_Designation VARCHAR(100),
    IN p_DesignationId INT,
    IN p_BoardName VARCHAR(100),
    IN p_BoardId INT,
    IN p_StaffType VARCHAR(50),
    IN p_Status VARCHAR(50),
    IN p_ProfileStatus VARCHAR(50),
    IN p_PendingSubTab VARCHAR(50),
    IN p_SortBy VARCHAR(50),
    IN p_SortOrder VARCHAR(10),
    OUT p_TotalRecords INT
)
BEGIN
    DECLARE v_Offset INT;
    SET v_Offset = (p_PageNumber - 1) * p_PageSize;

    SET p_SearchTerm = NULLIF(TRIM(p_SearchTerm), '');
    SET p_Department = NULLIF(TRIM(p_Department), '');
    SET p_Designation = NULLIF(TRIM(p_Designation), '');
    SET p_BoardName = NULLIF(TRIM(p_BoardName), '');
    SET p_StaffType = NULLIF(TRIM(p_StaffType), '');
    SET p_Status = NULLIF(TRIM(p_Status), '');
    SET p_ProfileStatus = NULLIF(TRIM(p_ProfileStatus), '');
    SET p_PendingSubTab = NULLIF(TRIM(p_PendingSubTab), '');

    -- Count total records matching criteria
    SELECT COUNT(*) INTO p_TotalRecords
    FROM `Staff` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.Id
    LEFT JOIN `Designations` des ON s.DesignationId = des.Id
    LEFT JOIN `Boards` b ON s.BoardId = b.Id
    WHERE s.IsDeleted = 0
      AND (p_SearchTerm IS NULL OR (
          s.FirstName LIKE CONCAT('%', p_SearchTerm, '%') OR
          s.LastName LIKE CONCAT('%', p_SearchTerm, '%') OR
          s.MiddleName LIKE CONCAT('%', p_SearchTerm, '%') OR
          s.EmployeeId LIKE CONCAT('%', p_SearchTerm, '%') OR
          s.Email LIKE CONCAT('%', p_SearchTerm, '%') OR
          s.Mobile LIKE CONCAT('%', p_SearchTerm, '%')
      ))
      AND (p_DepartmentId IS NULL OR p_DepartmentId = 0 OR s.DepartmentId = p_DepartmentId)
      AND (p_Department IS NULL OR p_Department = 'All Departments' OR d.DepartmentName = p_Department OR d.DepartmentCode = p_Department)
      AND (p_DesignationId IS NULL OR p_DesignationId = 0 OR s.DesignationId = p_DesignationId)
      AND (p_Designation IS NULL OR p_Designation = 'All Designations' OR s.Designation = p_Designation OR des.Name = p_Designation)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_BoardName IS NULL OR p_BoardName = 'All Boards' OR b.BoardName = p_BoardName)
      AND (p_StaffType IS NULL OR p_StaffType = 'All' OR s.StaffType = p_StaffType)
      AND (p_Status IS NULL OR p_Status = 'All Status' OR s.Status = p_Status)
      AND (
          p_ProfileStatus IS NULL OR p_ProfileStatus = 'All'
          OR (p_ProfileStatus = 'Completed' AND (s.ProfileStatus = 'Completed' OR s.ProfileStatus = 'Approved'))
          OR (p_ProfileStatus IN ('Pending', 'Pending Profile Completion') AND (s.ProfileStatus != 'Completed' AND s.ProfileStatus != 'Approved'))
          OR s.ProfileStatus = p_ProfileStatus
      )
      AND (
          p_PendingSubTab IS NULL
          OR (p_PendingSubTab IN ('LinkSent', 'Link Sent') AND (s.ProfileStatus IN ('LinkSent', 'PendingLink') OR s.ProfileStatus IS NULL))
          OR (p_PendingSubTab IN ('InProgress', 'In Progress') AND s.ProfileStatus = 'InProgress')
          OR (p_PendingSubTab IN ('NeedsCorrection', 'Needs Correction') AND s.ProfileStatus = 'NeedsCorrection')
          OR (p_PendingSubTab = 'Submitted' AND s.ProfileStatus = 'Submitted')
      );

    -- Select paged result set
    SELECT 
        s.Id,
        s.EmployeeId,
        s.FirstName,
        s.MiddleName,
        s.LastName,
        s.FatherOrHusbandName,
        s.Gender,
        s.DateOfBirth,
        s.MaritalStatus,
        s.Nationality,
        s.Aadhaar,
        s.PanNumber,
        s.Mobile,
        s.AlternateMobile,
        s.Email,
        s.BloodGroup,
        s.CurrentAddress,
        s.PermanentAddress,
        s.City,
        s.District,
        s.State,
        s.Pincode,
        s.Country,
        s.Qualification,
        s.Designation,
        s.DesignationId,
        des.Name AS DesignationName,
        s.StaffType,
        s.DepartmentId,
        d.DepartmentName,
        s.BoardId,
        b.BoardName,
        s.JoiningDate,
        s.Experience,
        s.EmploymentType,
        s.Status,
        s.PhotoPath,
        s.ProfileStatus,
        s.ProfileCompletionPercentage,
        s.ProfileLinkToken,
        s.ProfileLinkSentAt,
        s.ProfileLinkExpiresAt,
        s.SubmittedAt,
        s.ApprovedAt,
        s.CorrectionRequestedAt,
        s.CorrectionNotes,
        s.EducationJson,
        s.ExperienceJson,
        s.DocumentsJson,
        s.BankDetailsJson,
        s.EmergencyContactJson,
        s.CreatedAt,
        s.UpdatedAt
    FROM `Staff` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.Id
    LEFT JOIN `Designations` des ON s.DesignationId = des.Id
    LEFT JOIN `Boards` b ON s.BoardId = b.Id
    WHERE s.IsDeleted = 0
      AND (p_SearchTerm IS NULL OR (
          s.FirstName LIKE CONCAT('%', p_SearchTerm, '%') OR
          s.LastName LIKE CONCAT('%', p_SearchTerm, '%') OR
          s.MiddleName LIKE CONCAT('%', p_SearchTerm, '%') OR
          s.EmployeeId LIKE CONCAT('%', p_SearchTerm, '%') OR
          s.Email LIKE CONCAT('%', p_SearchTerm, '%') OR
          s.Mobile LIKE CONCAT('%', p_SearchTerm, '%')
      ))
      AND (p_DepartmentId IS NULL OR p_DepartmentId = 0 OR s.DepartmentId = p_DepartmentId)
      AND (p_Department IS NULL OR p_Department = 'All Departments' OR d.DepartmentName = p_Department OR d.DepartmentCode = p_Department)
      AND (p_DesignationId IS NULL OR p_DesignationId = 0 OR s.DesignationId = p_DesignationId)
      AND (p_Designation IS NULL OR p_Designation = 'All Designations' OR s.Designation = p_Designation OR des.Name = p_Designation)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_BoardName IS NULL OR p_BoardName = 'All Boards' OR b.BoardName = p_BoardName)
      AND (p_StaffType IS NULL OR p_StaffType = 'All' OR s.StaffType = p_StaffType)
      AND (p_Status IS NULL OR p_Status = 'All Status' OR s.Status = p_Status)
      AND (
          p_ProfileStatus IS NULL OR p_ProfileStatus = 'All'
          OR (p_ProfileStatus = 'Completed' AND (s.ProfileStatus = 'Completed' OR s.ProfileStatus = 'Approved'))
          OR (p_ProfileStatus IN ('Pending', 'Pending Profile Completion') AND (s.ProfileStatus != 'Completed' AND s.ProfileStatus != 'Approved'))
          OR s.ProfileStatus = p_ProfileStatus
      )
      AND (
          p_PendingSubTab IS NULL
          OR (p_PendingSubTab IN ('LinkSent', 'Link Sent') AND (s.ProfileStatus IN ('LinkSent', 'PendingLink') OR s.ProfileStatus IS NULL))
          OR (p_PendingSubTab IN ('InProgress', 'In Progress') AND s.ProfileStatus = 'InProgress')
          OR (p_PendingSubTab IN ('NeedsCorrection', 'Needs Correction') AND s.ProfileStatus = 'NeedsCorrection')
          OR (p_PendingSubTab = 'Submitted' AND s.ProfileStatus = 'Submitted')
      )
    ORDER BY 
        CASE WHEN p_SortBy = 'firstname' AND p_SortOrder = 'ASC' THEN s.FirstName END ASC,
        CASE WHEN p_SortBy = 'firstname' AND p_SortOrder = 'DESC' THEN s.FirstName END DESC,
        CASE WHEN p_SortBy = 'employeeid' AND p_SortOrder = 'ASC' THEN s.EmployeeId END ASC,
        CASE WHEN p_SortBy = 'employeeid' AND p_SortOrder = 'DESC' THEN s.EmployeeId END DESC,
        CASE WHEN p_SortBy = 'joiningdate' AND p_SortOrder = 'ASC' THEN s.JoiningDate END ASC,
        CASE WHEN p_SortBy = 'joiningdate' AND p_SortOrder = 'DESC' THEN s.JoiningDate END DESC,
        CASE WHEN p_SortBy = 'profilecompletionpercentage' AND p_SortOrder = 'ASC' THEN s.ProfileCompletionPercentage END ASC,
        CASE WHEN p_SortBy = 'profilecompletionpercentage' AND p_SortOrder = 'DESC' THEN s.ProfileCompletionPercentage END DESC,
        s.Id DESC
    LIMIT p_PageSize OFFSET v_Offset;
END$$

-- 2. SP: Get Staff Dashboard Stats
DROP PROCEDURE IF EXISTS `sp_GetStaffDashboardStats`$$
CREATE PROCEDURE `sp_GetStaffDashboardStats`()
BEGIN
    SELECT 
        COUNT(*) AS TotalStaff,
        SUM(CASE WHEN s.StaffType = 'Teaching' THEN 1 ELSE 0 END) AS TeachingStaff,
        SUM(CASE WHEN s.StaffType = 'Non-Teaching' THEN 1 ELSE 0 END) AS NonTeachingStaff,
        SUM(CASE WHEN s.ProfileStatus IN ('Completed', 'Approved') THEN 1 ELSE 0 END) AS CompletedProfiles,
        SUM(CASE WHEN s.ProfileStatus NOT IN ('Completed', 'Approved') OR s.ProfileStatus IS NULL THEN 1 ELSE 0 END) AS PendingProfileCompletion,
        SUM(CASE WHEN s.ProfileStatus IN ('Completed', 'Approved') THEN 1 ELSE 0 END) AS Completed,
        SUM(CASE WHEN s.ProfileStatus IN ('LinkSent', 'PendingLink') OR s.ProfileStatus IS NULL THEN 1 ELSE 0 END) AS Pending,
        SUM(CASE WHEN s.ProfileStatus = 'InProgress' THEN 1 ELSE 0 END) AS InProgress,
        SUM(CASE WHEN s.ProfileStatus = 'NeedsCorrection' THEN 1 ELSE 0 END) AS NeedsCorrection,
        SUM(CASE WHEN s.ProfileStatus = 'Submitted' THEN 1 ELSE 0 END) AS Submitted
    FROM `Staff` s
    WHERE s.IsDeleted = 0;
END$$

-- 3. SP: Get Staff By Id
DROP PROCEDURE IF EXISTS `sp_GetStaffById`$$
CREATE PROCEDURE `sp_GetStaffById`(IN p_Id INT)
BEGIN
    SELECT 
        s.*,
        d.DepartmentName,
        d.DepartmentCode,
        des.Name AS DesignationName,
        b.BoardName
    FROM `Staff` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.Id
    LEFT JOIN `Designations` des ON s.DesignationId = des.Id
    LEFT JOIN `Boards` b ON s.BoardId = b.Id
    WHERE s.Id = p_Id AND s.IsDeleted = 0;

    -- Also return Subject Allocations
    SELECT 
        ssa.Id,
        ssa.StaffId,
        ssa.SubjectId,
        sub.SubjectName,
        sub.SubjectCode
    FROM `StaffSubjectAllocations` ssa
    LEFT JOIN `Subjects` sub ON ssa.SubjectId = sub.Id
    WHERE ssa.StaffId = p_Id;
END$$

-- 4. SP: Get Staff By EmployeeId
DROP PROCEDURE IF EXISTS `sp_GetStaffByEmployeeId`$$
CREATE PROCEDURE `sp_GetStaffByEmployeeId`(IN p_EmployeeId VARCHAR(50))
BEGIN
    SELECT 
        s.*,
        d.DepartmentName,
        des.Name AS DesignationName,
        b.BoardName
    FROM `Staff` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.Id
    LEFT JOIN `Designations` des ON s.DesignationId = des.Id
    LEFT JOIN `Boards` b ON s.BoardId = b.Id
    WHERE s.EmployeeId = p_EmployeeId AND s.IsDeleted = 0;
END$$

-- 5. SP: Get Staff By Email
DROP PROCEDURE IF EXISTS `sp_GetStaffByEmail`$$
CREATE PROCEDURE `sp_GetStaffByEmail`(IN p_Email VARCHAR(150))
BEGIN
    SELECT 
        s.*,
        d.DepartmentName,
        des.Name AS DesignationName,
        b.BoardName
    FROM `Staff` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.Id
    LEFT JOIN `Designations` des ON s.DesignationId = des.Id
    LEFT JOIN `Boards` b ON s.BoardId = b.Id
    WHERE s.Email = p_Email AND s.IsDeleted = 0;
END$$

-- 6. SP: Get Staff By Mobile
DROP PROCEDURE IF EXISTS `sp_GetStaffByMobile`$$
CREATE PROCEDURE `sp_GetStaffByMobile`(IN p_Mobile VARCHAR(15))
BEGIN
    SELECT 
        s.*,
        d.DepartmentName,
        des.Name AS DesignationName,
        b.BoardName
    FROM `Staff` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.Id
    LEFT JOIN `Designations` des ON s.DesignationId = des.Id
    LEFT JOIN `Boards` b ON s.BoardId = b.Id
    WHERE s.Mobile = p_Mobile AND s.IsDeleted = 0;
END$$

-- 7. SP: Get Staff By Aadhaar
DROP PROCEDURE IF EXISTS `sp_GetStaffByAadhaar`$$
CREATE PROCEDURE `sp_GetStaffByAadhaar`(IN p_Aadhaar VARCHAR(20))
BEGIN
    SELECT 
        s.*,
        d.DepartmentName,
        des.Name AS DesignationName,
        b.BoardName
    FROM `Staff` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.Id
    LEFT JOIN `Designations` des ON s.DesignationId = des.Id
    LEFT JOIN `Boards` b ON s.BoardId = b.Id
    WHERE s.Aadhaar = p_Aadhaar AND s.IsDeleted = 0;
END$$

-- 8. SP: Get Staff By Token (For Candidate Link Workflow)
DROP PROCEDURE IF EXISTS `sp_GetStaffByToken`$$
CREATE PROCEDURE `sp_GetStaffByToken`(IN p_Token VARCHAR(100))
BEGIN
    SELECT 
        s.*,
        d.DepartmentName,
        des.Name AS DesignationName,
        b.BoardName
    FROM `Staff` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.Id
    LEFT JOIN `Designations` des ON s.DesignationId = des.Id
    LEFT JOIN `Boards` b ON s.BoardId = b.Id
    WHERE s.ProfileLinkToken = p_Token AND s.IsDeleted = 0;
END$$

-- 9. SP: Get Staff Dropdown
DROP PROCEDURE IF EXISTS `sp_GetStaffDropdown`$$
CREATE PROCEDURE `sp_GetStaffDropdown`(IN p_StaffType VARCHAR(50))
BEGIN
    SELECT 
        s.Id,
        s.EmployeeId,
        CONCAT(s.FirstName, ' ', s.LastName) AS FullName,
        s.Designation,
        COALESCE(d.DepartmentName, s.DepartmentId, '') AS Department,
        s.StaffType
    FROM `Staff` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.Id
    WHERE s.IsDeleted = 0 AND s.Status = 'Active'
      AND (p_StaffType IS NULL OR p_StaffType = '' OR p_StaffType = 'All' OR s.StaffType = p_StaffType)
    ORDER BY s.FirstName;
END$$

-- 10. SP: Generate Next Employee ID
DROP PROCEDURE IF EXISTS `sp_GenerateStaffEmployeeId`$$
CREATE PROCEDURE `sp_GenerateStaffEmployeeId`(
    IN p_StaffType VARCHAR(50),
    OUT p_EmployeeId VARCHAR(50)
)
BEGIN
    DECLARE v_Prefix VARCHAR(10);
    DECLARE v_MaxNum INT DEFAULT 0;

    IF p_StaffType = 'Non-Teaching' THEN
        SET v_Prefix = 'PCNT';
    ELSE
        SET v_Prefix = 'PCTCH';
    END IF;

    SELECT COALESCE(MAX(CAST(SUBSTRING(EmployeeId, LENGTH(v_Prefix) + 1) AS UNSIGNED)), 0)
    INTO v_MaxNum
    FROM `Staff`
    WHERE EmployeeId LIKE CONCAT(v_Prefix, '%');

    SET p_EmployeeId = CONCAT(v_Prefix, LPAD(v_MaxNum + 1, 4, '0'));
    SELECT p_EmployeeId AS GeneratedEmployeeId;
END$$

-- 11. SP: Create Staff
DROP PROCEDURE IF EXISTS `sp_CreateStaff`$$
CREATE PROCEDURE `sp_CreateStaff`(
    IN p_EmployeeId VARCHAR(50),
    IN p_FirstName VARCHAR(100),
    IN p_MiddleName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_FatherOrHusbandName VARCHAR(150),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATE,
    IN p_MaritalStatus VARCHAR(20),
    IN p_Nationality VARCHAR(50),
    IN p_Aadhaar VARCHAR(20),
    IN p_PanNumber VARCHAR(20),
    IN p_Mobile VARCHAR(15),
    IN p_AlternateMobile VARCHAR(15),
    IN p_Email VARCHAR(150),
    IN p_BloodGroup VARCHAR(10),
    IN p_CurrentAddress VARCHAR(255),
    IN p_PermanentAddress VARCHAR(255),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(20),
    IN p_Country VARCHAR(100),
    IN p_Qualification VARCHAR(100),
    IN p_Designation VARCHAR(100),
    IN p_DesignationId INT,
    IN p_StaffType VARCHAR(20),
    IN p_DepartmentId INT,
    IN p_BoardId INT,
    IN p_JoiningDate DATE,
    IN p_Experience DECIMAL(4, 1),
    IN p_EmploymentType VARCHAR(50),
    IN p_Status VARCHAR(50),
    IN p_PhotoPath VARCHAR(500),
    IN p_ProfileStatus VARCHAR(50),
    IN p_ProfileCompletionPercentage INT,
    IN p_EducationJson LONGTEXT,
    IN p_ExperienceJson LONGTEXT,
    IN p_DocumentsJson LONGTEXT,
    IN p_BankDetailsJson LONGTEXT,
    IN p_EmergencyContactJson LONGTEXT,
    OUT p_Id INT
)
BEGIN
    INSERT INTO `Staff` (
        `EmployeeId`, `FirstName`, `MiddleName`, `LastName`, `FatherOrHusbandName`,
        `Gender`, `DateOfBirth`, `MaritalStatus`, `Nationality`, `Aadhaar`, `PanNumber`,
        `Mobile`, `AlternateMobile`, `Email`, `BloodGroup`,
        `CurrentAddress`, `PermanentAddress`, `City`, `District`, `State`, `Pincode`, `Country`,
        `Qualification`, `Designation`, `DesignationId`, `StaffType`, `DepartmentId`, `BoardId`,
        `JoiningDate`, `Experience`, `EmploymentType`, `Status`, `PhotoPath`,
        `ProfileStatus`, `ProfileCompletionPercentage`,
        `EducationJson`, `ExperienceJson`, `DocumentsJson`, `BankDetailsJson`, `EmergencyContactJson`,
        `CreatedAt`
    ) VALUES (
        p_EmployeeId, p_FirstName, p_MiddleName, p_LastName, p_FatherOrHusbandName,
        p_Gender, p_DateOfBirth, p_MaritalStatus, COALESCE(p_Nationality, 'Indian'), p_Aadhaar, p_PanNumber,
        p_Mobile, p_AlternateMobile, p_Email, p_BloodGroup,
        p_CurrentAddress, p_PermanentAddress, p_City, p_District, p_State, p_Pincode, COALESCE(p_Country, 'India'),
        p_Qualification, p_Designation, p_DesignationId, COALESCE(p_StaffType, 'Teaching'), p_DepartmentId, p_BoardId,
        p_JoiningDate, COALESCE(p_Experience, 0.0), COALESCE(p_EmploymentType, 'Full Time'), COALESCE(p_Status, 'Active'), p_PhotoPath,
        COALESCE(p_ProfileStatus, 'PendingLink'), COALESCE(p_ProfileCompletionPercentage, 30),
        p_EducationJson, p_ExperienceJson, p_DocumentsJson, p_BankDetailsJson, p_EmergencyContactJson,
        NOW()
    );

    SET p_Id = LAST_INSERT_ID();
    SELECT p_Id AS NewStaffId;
END$$

-- 12. SP: Update Staff
DROP PROCEDURE IF EXISTS `sp_UpdateStaff`$$
CREATE PROCEDURE `sp_UpdateStaff`(
    IN p_Id INT,
    IN p_EmployeeId VARCHAR(50),
    IN p_FirstName VARCHAR(100),
    IN p_MiddleName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_FatherOrHusbandName VARCHAR(150),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATE,
    IN p_MaritalStatus VARCHAR(20),
    IN p_Nationality VARCHAR(50),
    IN p_Aadhaar VARCHAR(20),
    IN p_PanNumber VARCHAR(20),
    IN p_Mobile VARCHAR(15),
    IN p_AlternateMobile VARCHAR(15),
    IN p_Email VARCHAR(150),
    IN p_BloodGroup VARCHAR(10),
    IN p_CurrentAddress VARCHAR(255),
    IN p_PermanentAddress VARCHAR(255),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(20),
    IN p_Country VARCHAR(100),
    IN p_Qualification VARCHAR(100),
    IN p_Designation VARCHAR(100),
    IN p_DesignationId INT,
    IN p_StaffType VARCHAR(20),
    IN p_DepartmentId INT,
    IN p_BoardId INT,
    IN p_JoiningDate DATE,
    IN p_Experience DECIMAL(4, 1),
    IN p_EmploymentType VARCHAR(50),
    IN p_Status VARCHAR(50),
    IN p_PhotoPath VARCHAR(500),
    IN p_ProfileStatus VARCHAR(50),
    IN p_ProfileCompletionPercentage INT,
    IN p_EducationJson LONGTEXT,
    IN p_ExperienceJson LONGTEXT,
    IN p_DocumentsJson LONGTEXT,
    IN p_BankDetailsJson LONGTEXT,
    IN p_EmergencyContactJson LONGTEXT
)
BEGIN
    UPDATE `Staff` SET
        `EmployeeId` = p_EmployeeId,
        `FirstName` = p_FirstName,
        `MiddleName` = p_MiddleName,
        `LastName` = p_LastName,
        `FatherOrHusbandName` = p_FatherOrHusbandName,
        `Gender` = p_Gender,
        `DateOfBirth` = p_DateOfBirth,
        `MaritalStatus` = p_MaritalStatus,
        `Nationality` = COALESCE(p_Nationality, 'Indian'),
        `Aadhaar` = p_Aadhaar,
        `PanNumber` = p_PanNumber,
        `Mobile` = p_Mobile,
        `AlternateMobile` = p_AlternateMobile,
        `Email` = p_Email,
        `BloodGroup` = p_BloodGroup,
        `CurrentAddress` = p_CurrentAddress,
        `PermanentAddress` = p_PermanentAddress,
        `City` = p_City,
        `District` = p_District,
        `State` = p_State,
        `Pincode` = p_Pincode,
        `Country` = COALESCE(p_Country, 'India'),
        `Qualification` = p_Qualification,
        `Designation` = p_Designation,
        `DesignationId` = p_DesignationId,
        `StaffType` = COALESCE(p_StaffType, 'Teaching'),
        `DepartmentId` = p_DepartmentId,
        `BoardId` = p_BoardId,
        `JoiningDate` = p_JoiningDate,
        `Experience` = COALESCE(p_Experience, 0.0),
        `EmploymentType` = COALESCE(p_EmploymentType, 'Full Time'),
        `Status` = COALESCE(p_Status, 'Active'),
        `PhotoPath` = COALESCE(p_PhotoPath, `PhotoPath`),
        `ProfileStatus` = COALESCE(p_ProfileStatus, `ProfileStatus`),
        `ProfileCompletionPercentage` = COALESCE(p_ProfileCompletionPercentage, `ProfileCompletionPercentage`),
        `EducationJson` = COALESCE(p_EducationJson, `EducationJson`),
        `ExperienceJson` = COALESCE(p_ExperienceJson, `ExperienceJson`),
        `DocumentsJson` = COALESCE(p_DocumentsJson, `DocumentsJson`),
        `BankDetailsJson` = COALESCE(p_BankDetailsJson, `BankDetailsJson`),
        `EmergencyContactJson` = COALESCE(p_EmergencyContactJson, `EmergencyContactJson`),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id AND `IsDeleted` = 0;
END$$

-- 13. SP: Soft Delete Staff
DROP PROCEDURE IF EXISTS `sp_SoftDeleteStaff`$$
CREATE PROCEDURE `sp_SoftDeleteStaff`(IN p_Id INT)
BEGIN
    UPDATE `Staff` 
    SET `IsDeleted` = 1, `UpdatedAt` = NOW() 
    WHERE `Id` = p_Id;
END$$

-- 14. SP: Update Photo Path
DROP PROCEDURE IF EXISTS `sp_UpdateStaffPhotoPath`$$
CREATE PROCEDURE `sp_UpdateStaffPhotoPath`(IN p_Id INT, IN p_PhotoPath VARCHAR(500))
BEGIN
    UPDATE `Staff` 
    SET `PhotoPath` = p_PhotoPath, `UpdatedAt` = NOW() 
    WHERE `Id` = p_Id AND `IsDeleted` = 0;
END$$

-- 15. SP: Bulk Send Profile Links
DROP PROCEDURE IF EXISTS `sp_BulkSendStaffProfileLink`$$
CREATE PROCEDURE `sp_BulkSendStaffProfileLink`(
    IN p_StaffId INT,
    IN p_Token VARCHAR(100),
    IN p_SentAt DATETIME,
    IN p_ExpiresAt DATETIME
)
BEGIN
    UPDATE `Staff` 
    SET 
        `ProfileLinkToken` = p_Token,
        `ProfileLinkSentAt` = p_SentAt,
        `ProfileLinkExpiresAt` = p_ExpiresAt,
        `ProfileStatus` = IF(`ProfileStatus` = 'PendingLink' OR `ProfileStatus` IS NULL, 'LinkSent', `ProfileStatus`),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_StaffId AND `IsDeleted` = 0;
END$$

-- 16. SP: Update Profile Status (Approval, Rejection, Correction)
DROP PROCEDURE IF EXISTS `sp_UpdateStaffProfileStatus`$$
CREATE PROCEDURE `sp_UpdateStaffProfileStatus`(
    IN p_StaffId INT,
    IN p_ProfileStatus VARCHAR(50),
    IN p_CompletionPercentage INT,
    IN p_CorrectionNotes VARCHAR(1000)
)
BEGIN
    UPDATE `Staff` 
    SET 
        `ProfileStatus` = p_ProfileStatus,
        `ProfileCompletionPercentage` = p_CompletionPercentage,
        `CorrectionNotes` = IF(p_CorrectionNotes IS NOT NULL, p_CorrectionNotes, `CorrectionNotes`),
        `CorrectionRequestedAt` = IF(p_ProfileStatus = 'NeedsCorrection', NOW(), `CorrectionRequestedAt`),
        `SubmittedAt` = IF(p_ProfileStatus = 'Submitted', NOW(), `SubmittedAt`),
        `ApprovedAt` = IF(p_ProfileStatus IN ('Completed', 'Approved'), NOW(), `ApprovedAt`),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_StaffId AND `IsDeleted` = 0;
END$$

-- 17. SPs for Unique Validations
DROP PROCEDURE IF EXISTS `sp_CheckStaffEmployeeIdUnique`$$
CREATE PROCEDURE `sp_CheckStaffEmployeeIdUnique`(IN p_EmployeeId VARCHAR(50), IN p_ExcludeId INT)
BEGIN
    SELECT COUNT(*) AS MatchCount 
    FROM `Staff` 
    WHERE `EmployeeId` = p_EmployeeId AND `IsDeleted` = 0 
      AND (p_ExcludeId IS NULL OR `Id` != p_ExcludeId);
END$$

DROP PROCEDURE IF EXISTS `sp_CheckStaffEmailUnique`$$
CREATE PROCEDURE `sp_CheckStaffEmailUnique`(IN p_Email VARCHAR(150), IN p_ExcludeId INT)
BEGIN
    SELECT COUNT(*) AS MatchCount 
    FROM `Staff` 
    WHERE `Email` = p_Email AND `IsDeleted` = 0 
      AND (p_ExcludeId IS NULL OR `Id` != p_ExcludeId);
END$$

DROP PROCEDURE IF EXISTS `sp_CheckStaffMobileUnique`$$
CREATE PROCEDURE `sp_CheckStaffMobileUnique`(IN p_Mobile VARCHAR(15), IN p_ExcludeId INT)
BEGIN
    SELECT COUNT(*) AS MatchCount 
    FROM `Staff` 
    WHERE `Mobile` = p_Mobile AND `IsDeleted` = 0 
      AND (p_ExcludeId IS NULL OR `Id` != p_ExcludeId);
END$$

DROP PROCEDURE IF EXISTS `sp_CheckStaffAadhaarUnique`$$
CREATE PROCEDURE `sp_CheckStaffAadhaarUnique`(IN p_Aadhaar VARCHAR(20), IN p_ExcludeId INT)
BEGIN
    IF p_Aadhaar IS NULL OR TRIM(p_Aadhaar) = '' THEN
        SELECT 0 AS MatchCount;
    ELSE
        SELECT COUNT(*) AS MatchCount 
        FROM `Staff` 
        WHERE `Aadhaar` = p_Aadhaar AND `IsDeleted` = 0 
          AND (p_ExcludeId IS NULL OR `Id` != p_ExcludeId);
    END IF;
END$$

-- 18. SPs for Subject Allocations
DROP PROCEDURE IF EXISTS `sp_GetSubjectAllocationsByStaffId`$$
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
        sub.SubjectName,
        sub.SubjectCode,
        sub.SubjectType,
        sub.BoardId,
        sub.GroupId,
        sub.AcademicLevelId,
        sub.TotalMarks,
        sub.PassingMarks,
        sub.IsActive,
        COALESCE(b.BoardName, '') AS Board,
        COALESCE(g.GroupName, '') AS `Group`,
        COALESCE(al.LevelName, '') AS AcademicLevel
    FROM `StaffSubjectAllocations` ssa
    INNER JOIN `Staff` s ON s.Id = ssa.StaffId
    INNER JOIN `Subjects` sub ON sub.SubjectId = ssa.SubjectId
    LEFT JOIN `Boards` b ON b.BoardId = sub.BoardId
    LEFT JOIN `Groups` g ON g.GroupId = sub.GroupId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = sub.AcademicLevelId
    WHERE ssa.StaffId = p_StaffId
    ORDER BY ssa.Id DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_CreateStaffSubjectAllocation`$$
CREATE PROCEDURE `sp_CreateStaffSubjectAllocation`(
    IN p_StaffId INT,
    IN p_SubjectId INT
)
BEGIN
    INSERT INTO `StaffSubjectAllocations` (`StaffId`, `SubjectId`, `CreatedAt`)
    VALUES (p_StaffId, p_SubjectId, NOW());

    SELECT LAST_INSERT_ID() AS NewAllocationId;
END$$

DROP PROCEDURE IF EXISTS `sp_DeleteStaffSubjectAllocation`$$
CREATE PROCEDURE `sp_DeleteStaffSubjectAllocation`(IN p_Id INT)
BEGIN
    DELETE FROM `StaffSubjectAllocations` WHERE `Id` = p_Id;
END$$

DROP PROCEDURE IF EXISTS `sp_CheckDuplicateStaffSubjectAllocation`$$
CREATE PROCEDURE `sp_CheckDuplicateStaffSubjectAllocation`(
    IN p_StaffId INT,
    IN p_SubjectId INT,
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) AS MatchCount
    FROM `StaffSubjectAllocations`
    WHERE `StaffId` = p_StaffId AND `SubjectId` = p_SubjectId
      AND (p_ExcludeId IS NULL OR `Id` != p_ExcludeId);
END$$

-- =============================================================================
-- PART 4: BACKWARD COMPATIBILITY PROCEDURES (FOR FACULTY CALLS)
-- =============================================================================

DROP PROCEDURE IF EXISTS `sp_GetPagedFaculties`$$
CREATE PROCEDURE `sp_GetPagedFaculties`(
    IN p_PageNumber INT,
    IN p_PageSize INT,
    IN p_SearchTerm VARCHAR(100),
    IN p_Department VARCHAR(100),
    IN p_DepartmentId INT,
    IN p_Designation VARCHAR(100),
    IN p_DesignationId INT,
    IN p_BoardName VARCHAR(100),
    IN p_BoardId INT,
    IN p_FacultyType VARCHAR(50),
    IN p_Status VARCHAR(50),
    IN p_SortBy VARCHAR(50),
    IN p_SortOrder VARCHAR(10),
    OUT p_TotalRecords INT
)
BEGIN
    CALL sp_GetPagedStaff(
        p_PageNumber, p_PageSize, p_SearchTerm,
        p_Department, p_DepartmentId, p_Designation, p_DesignationId,
        p_BoardName, p_BoardId, p_FacultyType, p_Status,
        'All', NULL, p_SortBy, p_SortOrder, p_TotalRecords
    );
END$$

DROP PROCEDURE IF EXISTS `sp_GetFacultyById`$$
CREATE PROCEDURE `sp_GetFacultyById`(IN p_Id INT)
BEGIN
    CALL sp_GetStaffById(p_Id);
END$$

DROP PROCEDURE IF EXISTS `sp_GetFacultyByEmployeeId`$$
CREATE PROCEDURE `sp_GetFacultyByEmployeeId`(IN p_EmployeeId VARCHAR(50))
BEGIN
    CALL sp_GetStaffByEmployeeId(p_EmployeeId);
END$$

DROP PROCEDURE IF EXISTS `sp_GetFacultyByEmail`$$
CREATE PROCEDURE `sp_GetFacultyByEmail`(IN p_Email VARCHAR(150))
BEGIN
    CALL sp_GetStaffByEmail(p_Email);
END$$

DROP PROCEDURE IF EXISTS `sp_GetFacultyByMobile`$$
CREATE PROCEDURE `sp_GetFacultyByMobile`(IN p_Mobile VARCHAR(15))
BEGIN
    CALL sp_GetStaffByMobile(p_Mobile);
END$$

DROP PROCEDURE IF EXISTS `sp_GetFacultyByAadhaar`$$
CREATE PROCEDURE `sp_GetFacultyByAadhaar`(IN p_Aadhaar VARCHAR(20))
BEGIN
    CALL sp_GetStaffByAadhaar(p_Aadhaar);
END$$

DROP PROCEDURE IF EXISTS `sp_SoftDeleteFaculty`$$
CREATE PROCEDURE `sp_SoftDeleteFaculty`(IN p_Id INT)
BEGIN
    CALL sp_SoftDeleteStaff(p_Id);
END$$

DROP PROCEDURE IF EXISTS `sp_GetFacultyDropdown`$$
CREATE PROCEDURE `sp_GetFacultyDropdown`(IN p_FacultyType VARCHAR(50))
BEGIN
    CALL sp_GetStaffDropdown(p_FacultyType);
END$$

DROP PROCEDURE IF EXISTS `sp_CheckEmployeeIdUnique`$$
CREATE PROCEDURE `sp_CheckEmployeeIdUnique`(IN p_EmployeeId VARCHAR(50), IN p_ExcludeId INT)
BEGIN
    CALL sp_CheckStaffEmployeeIdUnique(p_EmployeeId, p_ExcludeId);
END$$

DROP PROCEDURE IF EXISTS `sp_CheckEmailUnique`$$
CREATE PROCEDURE `sp_CheckEmailUnique`(IN p_Email VARCHAR(150), IN p_ExcludeId INT)
BEGIN
    CALL sp_CheckStaffEmailUnique(p_Email, p_ExcludeId);
END$$

DROP PROCEDURE IF EXISTS `sp_CheckMobileUnique`$$
CREATE PROCEDURE `sp_CheckMobileUnique`(IN p_Mobile VARCHAR(15), IN p_ExcludeId INT)
BEGIN
    CALL sp_CheckStaffMobileUnique(p_Mobile, p_ExcludeId);
END$$

DROP PROCEDURE IF EXISTS `sp_CheckAadhaarUnique`$$
CREATE PROCEDURE `sp_CheckAadhaarUnique`(IN p_Aadhaar VARCHAR(20), IN p_ExcludeId INT)
BEGIN
    CALL sp_CheckStaffAadhaarUnique(p_Aadhaar, p_ExcludeId);
END$$

-- =============================================================================
-- PART 5: DESIGNATION & DEPARTMENT MASTER STORED PROCEDURES
-- =============================================================================

DROP PROCEDURE IF EXISTS `sp_GetDesignations`$$
CREATE PROCEDURE `sp_GetDesignations`(
    IN p_IncludeInactive INT,
    IN p_StaffType VARCHAR(20)
)
BEGIN
    SELECT Id, Name, StaffType, IsActive, CreatedAt, UpdatedAt
    FROM `Designations`
    WHERE (p_IncludeInactive = 1 OR IsActive = 1)
      AND (
          p_StaffType IS NULL OR p_StaffType = '' OR p_StaffType = 'All' 
          OR StaffType = 'Both' OR StaffType = p_StaffType
      )
    ORDER BY Name ASC;
END$$

DROP PROCEDURE IF EXISTS `sp_GetDesignationById`$$
CREATE PROCEDURE `sp_GetDesignationById`(IN p_Id INT)
BEGIN
    SELECT Id, Name, StaffType, IsActive, CreatedAt, UpdatedAt
    FROM `Designations`
    WHERE Id = p_Id;
END$$

DROP PROCEDURE IF EXISTS `sp_GetDesignationByName`$$
CREATE PROCEDURE `sp_GetDesignationByName`(IN p_Name VARCHAR(100))
BEGIN
    SELECT Id, Name, StaffType, IsActive, CreatedAt, UpdatedAt
    FROM `Designations`
    WHERE LOWER(TRIM(Name)) = LOWER(TRIM(p_Name))
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_CheckDesignationNameUnique`$$
CREATE PROCEDURE `sp_CheckDesignationNameUnique`(
    IN p_Name VARCHAR(100),
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Designations`
    WHERE LOWER(TRIM(Name)) = LOWER(TRIM(p_Name))
      AND (p_ExcludeId IS NULL OR p_ExcludeId <= 0 OR Id != p_ExcludeId);
END$$

DROP PROCEDURE IF EXISTS `sp_CheckDesignationAssignedToStaff`$$
CREATE PROCEDURE `sp_CheckDesignationAssignedToStaff`(IN p_DesignationId INT)
BEGIN
    SELECT COUNT(*)
    FROM `Staff`
    WHERE DesignationId = p_DesignationId AND IsDeleted = 0;
END$$

DROP PROCEDURE IF EXISTS `sp_CheckDesignationAssignedToFaculty`$$
CREATE PROCEDURE `sp_CheckDesignationAssignedToFaculty`(IN p_DesignationId INT)
BEGIN
    CALL sp_CheckDesignationAssignedToStaff(p_DesignationId);
END$$

DROP PROCEDURE IF EXISTS `sp_CreateDesignation`$$
CREATE PROCEDURE `sp_CreateDesignation`(
    IN p_Name VARCHAR(100),
    IN p_StaffType VARCHAR(20),
    IN p_IsActive INT
)
BEGIN
    INSERT INTO `Designations` (Name, StaffType, IsActive, CreatedAt)
    VALUES (TRIM(p_Name), COALESCE(p_StaffType, 'Both'), IFNULL(p_IsActive, 1), NOW());
    
    SELECT LAST_INSERT_ID() AS Id;
END$$

DROP PROCEDURE IF EXISTS `sp_UpdateDesignation`$$
CREATE PROCEDURE `sp_UpdateDesignation`(
    IN p_Id INT,
    IN p_Name VARCHAR(100),
    IN p_StaffType VARCHAR(20),
    IN p_IsActive INT
)
BEGIN
    UPDATE `Designations`
    SET Name = TRIM(p_Name),
        StaffType = COALESCE(p_StaffType, 'Both'),
        IsActive = IFNULL(p_IsActive, 1),
        UpdatedAt = NOW()
    WHERE Id = p_Id;
END$$

DROP PROCEDURE IF EXISTS `sp_DeleteDesignation`$$
CREATE PROCEDURE `sp_DeleteDesignation`(IN p_Id INT)
BEGIN
    DELETE FROM `Designations` WHERE Id = p_Id;
END$$

DELIMITER ;

