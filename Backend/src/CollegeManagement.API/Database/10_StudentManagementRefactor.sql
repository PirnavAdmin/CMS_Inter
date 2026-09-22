-- =============================================================================
-- SCRIPT: 10_StudentManagementRefactor.sql
-- PURPOSE: Phase 8B Complete Student Management Domain Refactor
-- AUTHOR: Antigravity Team
-- DATE: 2026-08-24
-- TARGET DATABASE: Any MySQL 8.0+ Instance (CMSDB / u819242402_CLM_System)
--
-- INSTRUCTIONS FOR MANUAL DEPLOYMENT (MySQL Workbench):
-- 1. Open MySQL Workbench and select your active schema.
-- 2. Open this script (File -> Open SQL Script).
-- 3. Execute the entire script (Ctrl + Shift + Enter).
-- 4. Verify post-deployment checks at the end of the script.
-- =============================================================================

SET SQL_SAFE_UPDATES = 0;

-- =============================================================================
-- STEP 1: PRE-FLIGHT DIAGNOSTICS & SAFETY CHECKS
-- =============================================================================
SELECT '--- STEP 1: PRE-FLIGHT BASELINE ---' AS Info;
SELECT COUNT(*) AS TotalStudentsBefore FROM `Students`;
SELECT COUNT(*) AS TotalStudentAdmissionsBefore FROM `StudentAdmissions`;

-- =============================================================================
-- STEP 2: SCHEMA ALIGNMENT & NORMALIZATION ON `Students` TABLE
-- =============================================================================
SELECT '--- STEP 2: SCHEMA ALIGNMENT ON `Students` TABLE ---' AS Info;

SET @dbname = DATABASE();

-- Ensure AcademicLevelId column exists
SET @query = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dbname AND TABLE_NAME='Students' AND COLUMN_NAME='AcademicLevelId') = 0,
    'ALTER TABLE `Students` ADD COLUMN `AcademicLevelId` INT NOT NULL DEFAULT 1 AFTER `AcademicYearId`;',
    'SELECT "AcademicLevelId column already exists" AS Notice;');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure BoardId column exists
SET @query = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dbname AND TABLE_NAME='Students' AND COLUMN_NAME='BoardId') = 0,
    'ALTER TABLE `Students` ADD COLUMN `BoardId` INT NOT NULL DEFAULT 1 AFTER `StudentId`;',
    'SELECT "BoardId column already exists" AS Notice;');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure SectionId column exists
SET @query = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dbname AND TABLE_NAME='Students' AND COLUMN_NAME='SectionId') = 0,
    'ALTER TABLE `Students` ADD COLUMN `SectionId` INT NOT NULL DEFAULT 1 AFTER `GroupId`;',
    'SELECT "SectionId column already exists" AS Notice;');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure AddressLine1 column exists
SET @query = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dbname AND TABLE_NAME='Students' AND COLUMN_NAME='AddressLine1') = 0,
    'ALTER TABLE `Students` ADD COLUMN `AddressLine1` VARCHAR(255) NULL AFTER `Address`;',
    'SELECT "AddressLine1 column already exists" AS Notice;');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure AddressLine2 column exists
SET @query = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dbname AND TABLE_NAME='Students' AND COLUMN_NAME='AddressLine2') = 0,
    'ALTER TABLE `Students` ADD COLUMN `AddressLine2` VARCHAR(255) NULL AFTER `AddressLine1`;',
    'SELECT "AddressLine2 column already exists" AS Notice;');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Populate missing/empty normalized IDs from legacy data where applicable
UPDATE `Students` s
LEFT JOIN `Boards` b ON b.BoardName = s.Board
SET s.BoardId = b.BoardId
WHERE (s.BoardId IS NULL OR s.BoardId = 0) AND b.BoardId IS NOT NULL;

UPDATE `Students` s
LEFT JOIN `Sections` sec ON sec.SectionName = s.Section AND sec.GroupId = s.GroupId
SET s.SectionId = sec.SectionId
WHERE (s.SectionId IS NULL OR s.SectionId = 0) AND sec.SectionId IS NOT NULL;

-- Standard indexes
CREATE INDEX IF NOT EXISTS `IX_Students_BoardId` ON `Students`(`BoardId`);
CREATE INDEX IF NOT EXISTS `IX_Students_AcademicYearId` ON `Students`(`AcademicYearId`);
CREATE INDEX IF NOT EXISTS `IX_Students_AcademicLevelId` ON `Students`(`AcademicLevelId`);
CREATE INDEX IF NOT EXISTS `IX_Students_GroupId` ON `Students`(`GroupId`);
CREATE INDEX IF NOT EXISTS `IX_Students_SectionId` ON `Students`(`SectionId`);
CREATE INDEX IF NOT EXISTS `IX_Students_IsActive` ON `Students`(`IsActive`);
CREATE INDEX IF NOT EXISTS `IX_Students_Status` ON `Students`(`Status`);

-- =============================================================================
-- STEP 3: DROP & RECREATE ALL STUDENT STORED PROCEDURES (NO HARDCODED DEFINER)
-- =============================================================================
SELECT '--- STEP 3: RECREATING STUDENT STORED PROCEDURES ---' AS Info;

DELIMITER //

-- -----------------------------------------------------------------------------
-- 1. sp_GetAllStudents
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAllStudents`//
CREATE PROCEDURE `sp_GetAllStudents`()
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.Email,
        s.MobileNumber,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        s.GroupId,
        g.GroupName,
        s.SectionId,
        sec.SectionName,
        s.IsActive,
        s.Status,
        s.CreatedAt
    FROM `Students` s
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    ORDER BY s.StudentId DESC;
END//

-- -----------------------------------------------------------------------------
-- 2. sp_GetStudentById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStudentById`//
CREATE PROCEDURE `sp_GetStudentById`(IN p_StudentId INT)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,
        s.AadhaarNumber,
        s.Nationality,
        s.Religion,
        s.Category,
        s.Address,
        s.City,
        s.District,
        s.State,
        s.Pincode,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        s.GroupId,
        g.GroupName,
        s.SectionId,
        sec.SectionName,
        s.AdmissionDate,
        s.AdmissionType,
        s.AdmissionQuota,
        s.Medium,
        s.SecondLanguage,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.PreviousBoard,
        s.PreviousYearOfPassing,
        s.PreviousPercentage,
        s.StudentCategory,
        s.ScholarshipStatus,
        s.ScholarshipAmount,
        s.FatherName,
        s.FatherOccupation,
        s.FatherMobile,
        s.FatherEmail,
        s.MotherName,
        s.MotherOccupation,
        s.MotherMobile,
        s.MotherEmail,
        s.GuardianName,
        s.GuardianMobile,
        s.GuardianEmail,
        s.AnnualIncome,
        s.FeeAmount,
        s.FeePaid,
        (COALESCE(s.FeeAmount,0) - COALESCE(s.FeePaid,0)) AS FeeDue,
        s.FeeStatus,
        s.AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.`Rank`,
        s.BirthCertificate,
        s.TransferCertificate,
        s.StudyCertificate,
        s.AadhaarDocument,
        s.CommunityCertificate,
        s.IncomeCertificate,
        s.CasteCertificate,
        s.TenthCertificate,
        s.MarksMemo,
        s.Remarks,
        s.IsActive,
        s.Status,
        s.IsFirstLogin,
        s.LastLogin,
        s.CreatedAt,
        s.UpdatedAt
    FROM `Students` s
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.StudentId = p_StudentId;
END//

-- -----------------------------------------------------------------------------
-- 3. sp_SearchStudents
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_SearchStudents`//
CREATE PROCEDURE `sp_SearchStudents`(
    IN p_Search VARCHAR(100),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_IsActive BOOLEAN
)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.Email,
        s.MobileNumber,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        s.GroupId,
        g.GroupName,
        s.SectionId,
        sec.SectionName,
        s.IsActive,
        s.Status,
        s.CreatedAt
    FROM `Students` s
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE (p_Search IS NULL OR p_Search = '' OR 
           s.StudentName LIKE CONCAT('%', p_Search, '%') OR 
           s.AdmissionNo LIKE CONCAT('%', p_Search, '%') OR 
           s.RollNo LIKE CONCAT('%', p_Search, '%') OR 
           s.MobileNumber LIKE CONCAT('%', p_Search, '%') OR
           s.Email LIKE CONCAT('%', p_Search, '%'))
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR s.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR s.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR s.SectionId = p_SectionId)
      AND (p_IsActive IS NULL OR s.IsActive = p_IsActive)
    ORDER BY s.StudentName ASC;
END//

-- -----------------------------------------------------------------------------
-- 4. sp_GetStudentsByGroupId
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStudentsByGroupId`//
CREATE PROCEDURE `sp_GetStudentsByGroupId`(IN p_GroupId INT)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.Email,
        s.MobileNumber,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        s.GroupId,
        g.GroupName,
        s.SectionId,
        sec.SectionName,
        s.IsActive,
        s.Status,
        s.CreatedAt
    FROM `Students` s
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.GroupId = p_GroupId AND s.IsActive = 1
    ORDER BY s.StudentName ASC;
END//

-- -----------------------------------------------------------------------------
-- 5. sp_GetStudentsBySectionId
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStudentsBySectionId`//
CREATE PROCEDURE `sp_GetStudentsBySectionId`(IN p_SectionId INT)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.Email,
        s.MobileNumber,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        s.GroupId,
        g.GroupName,
        s.SectionId,
        sec.SectionName,
        s.IsActive,
        s.Status,
        s.CreatedAt
    FROM `Students` s
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.SectionId = p_SectionId AND s.IsActive = 1
    ORDER BY s.StudentName ASC;
END//

-- -----------------------------------------------------------------------------
-- 6. sp_GetActiveStudents
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetActiveStudents`//
CREATE PROCEDURE `sp_GetActiveStudents`()
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.Email,
        s.MobileNumber,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        s.GroupId,
        g.GroupName,
        s.SectionId,
        sec.SectionName,
        s.IsActive,
        s.Status,
        s.CreatedAt
    FROM `Students` s
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.IsActive = 1
    ORDER BY s.StudentName ASC;
END//

-- -----------------------------------------------------------------------------
-- 7. sp_ChangeStudentSection
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ChangeStudentSection`//
CREATE PROCEDURE `sp_ChangeStudentSection`(
    IN p_StudentId INT,
    IN p_SectionId INT
)
BEGIN
    DECLARE v_SectionName VARCHAR(100);

    SELECT SectionName INTO v_SectionName 
    FROM `Sections` 
    WHERE SectionId = p_SectionId AND IsActive = 1 
    LIMIT 1;

    IF v_SectionName IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid or inactive section';
    END IF;

    UPDATE `Students`
    SET 
        SectionId = p_SectionId,
        Section = v_SectionName,
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE StudentId = p_StudentId;

    SELECT ROW_COUNT() AS Result;
END//

-- -----------------------------------------------------------------------------
-- 8. sp_ChangeStudentGroup
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ChangeStudentGroup`//
CREATE PROCEDURE `sp_ChangeStudentGroup`(
    IN p_StudentId INT,
    IN p_GroupId INT,
    IN p_SectionId INT
)
BEGIN
    DECLARE v_SectionName VARCHAR(100);

    IF NOT EXISTS (SELECT 1 FROM `Groups` WHERE GroupId = p_GroupId AND IsActive = 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid or inactive group';
    END IF;

    SELECT SectionName INTO v_SectionName
    FROM `Sections`
    WHERE SectionId = p_SectionId AND GroupId = p_GroupId AND IsActive = 1
    LIMIT 1;

    IF v_SectionName IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section does not belong to specified group or is inactive';
    END IF;

    UPDATE `Students`
    SET 
        GroupId = p_GroupId,
        SectionId = p_SectionId,
        Section = v_SectionName,
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE StudentId = p_StudentId;

    SELECT ROW_COUNT() AS Result;
END//

-- -----------------------------------------------------------------------------
-- 9. sp_TransferStudent
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_TransferStudent`//
CREATE PROCEDURE `sp_TransferStudent`(
    IN p_StudentId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_Remarks VARCHAR(500)
)
BEGIN
    DECLARE v_BoardName VARCHAR(150);
    DECLARE v_AcademicLevelName VARCHAR(100);
    DECLARE v_SectionName VARCHAR(100);

    IF NOT EXISTS (SELECT 1 FROM `Students` WHERE StudentId = p_StudentId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student not found';
    END IF;

    SELECT BoardName INTO v_BoardName FROM `Boards` WHERE BoardId = p_BoardId LIMIT 1;
    SELECT LevelName INTO v_AcademicLevelName FROM `AcademicLevels` WHERE AcademicLevelId = p_AcademicLevelId LIMIT 1;
    SELECT SectionName INTO v_SectionName FROM `Sections` WHERE SectionId = p_SectionId AND GroupId = p_GroupId LIMIT 1;

    IF v_SectionName IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Target Section does not belong to target Group';
    END IF;

    UPDATE `Students`
    SET 
        BoardId = p_BoardId,
        Board = v_BoardName,
        AcademicYearId = p_AcademicYearId,
        AcademicLevelId = p_AcademicLevelId,
        AcademicLevel = v_AcademicLevelName,
        GroupId = p_GroupId,
        SectionId = p_SectionId,
        Section = v_SectionName,
        Remarks = COALESCE(p_Remarks, Remarks),
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE StudentId = p_StudentId;

    SELECT ROW_COUNT() AS Result;
END//

-- -----------------------------------------------------------------------------
-- 10. sp_SuspendStudent
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_SuspendStudent`//
CREATE PROCEDURE `sp_SuspendStudent`(
    IN p_StudentId INT,
    IN p_Reason VARCHAR(500)
)
BEGIN
    UPDATE `Students`
    SET 
        Status = 'Suspended',
        IsActive = 0,
        Remarks = CASE WHEN p_Reason IS NOT NULL AND p_Reason <> '' THEN CONCAT(COALESCE(Remarks,''), ' [Suspension Reason: ', p_Reason, ']') ELSE Remarks END,
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE StudentId = p_StudentId;

    SELECT ROW_COUNT() AS Result;
END//

-- -----------------------------------------------------------------------------
-- 11. sp_ActivateStudent
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ActivateStudent`//
CREATE PROCEDURE `sp_ActivateStudent`(IN p_StudentId INT)
BEGIN
    UPDATE `Students`
    SET 
        Status = 'Active',
        IsActive = 1,
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE StudentId = p_StudentId;

    SELECT ROW_COUNT() AS Result;
END//

-- -----------------------------------------------------------------------------
-- 12. sp_DeleteStudent (Soft Delete)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_DeleteStudent`//
CREATE PROCEDURE `sp_DeleteStudent`(IN p_StudentId INT)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM `Students` WHERE StudentId = p_StudentId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student not found';
    END IF;

    UPDATE `Students`
    SET 
        Status = 'Inactive',
        IsActive = 0,
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE StudentId = p_StudentId;

    SELECT ROW_COUNT() AS Result;
END//

-- -----------------------------------------------------------------------------
-- 13. sp_ResetStudentLogin
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ResetStudentLogin`//
CREATE PROCEDURE `sp_ResetStudentLogin`(IN p_StudentId INT)
BEGIN
    UPDATE `Students`
    SET 
        PasswordHash = '',
        IsFirstLogin = 1,
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE StudentId = p_StudentId;

    SELECT ROW_COUNT() AS Result;
END//

-- -----------------------------------------------------------------------------
-- 14. sp_GetStudentDashboard
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStudentDashboard`//
CREATE PROCEDURE `sp_GetStudentDashboard`(IN p_StudentId INT)
BEGIN
    SELECT 
        s.StudentId,
        s.StudentName,
        s.AdmissionNo,
        s.RollNo,
        s.AttendancePercentage,
        s.PerformanceGrade,
        (COALESCE(s.FeeAmount,0) - COALESCE(s.FeePaid,0)) AS FeeDue,
        s.FeeStatus,
        s.CGPA,
        s.`Rank`,
        s.IsActive
    FROM `Students` s
    WHERE s.StudentId = p_StudentId;
END//

-- -----------------------------------------------------------------------------
-- 15. sp_GetStudentProfile
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStudentProfile`//
CREATE PROCEDURE `sp_GetStudentProfile`(IN p_StudentId INT)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,
        s.AadhaarNumber,
        s.Address,
        s.City,
        s.District,
        s.State,
        s.Pincode,
        s.Nationality,
        s.Religion,
        s.Category,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        s.GroupId,
        g.GroupName,
        s.SectionId,
        sec.SectionName,
        s.AdmissionDate,
        s.AdmissionType,
        s.Medium,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.StudentCategory,
        s.ScholarshipStatus,
        s.FatherName,
        s.FatherOccupation,
        s.FatherMobile,
        s.FatherEmail,
        s.MotherName,
        s.MotherOccupation,
        s.MotherMobile,
        s.MotherEmail,
        s.GuardianName,
        s.GuardianMobile,
        s.GuardianEmail,
        s.AnnualIncome,
        s.FeeAmount,
        s.FeePaid,
        (COALESCE(s.FeeAmount,0) - COALESCE(s.FeePaid,0)) AS FeeDue,
        s.ScholarshipAmount,
        s.FeeStatus,
        s.AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.`Rank`,
        s.Remarks,
        s.IsActive,
        s.Status
    FROM `Students` s
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.StudentId = p_StudentId;
END//

-- -----------------------------------------------------------------------------
-- 16. sp_UpdateStudentProfile
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateStudentProfile`//
CREATE PROCEDURE `sp_UpdateStudentProfile`(
    IN p_StudentId INT,
    IN p_StudentName VARCHAR(150),
    IN p_Photo VARCHAR(500),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME,
    IN p_BloodGroup VARCHAR(10),
    IN p_Email VARCHAR(150),
    IN p_MobileNumber VARCHAR(20),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Address VARCHAR(500),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(20),
    IN p_Nationality VARCHAR(50),
    IN p_Religion VARCHAR(50),
    IN p_Category VARCHAR(50),
    IN p_FatherName VARCHAR(150),
    IN p_FatherOccupation VARCHAR(100),
    IN p_FatherMobile VARCHAR(20),
    IN p_FatherEmail VARCHAR(150),
    IN p_MotherName VARCHAR(150),
    IN p_MotherOccupation VARCHAR(100),
    IN p_MotherMobile VARCHAR(20),
    IN p_MotherEmail VARCHAR(150),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),
    IN p_GuardianEmail VARCHAR(150),
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM `Students` WHERE StudentId = p_StudentId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student not found';
    END IF;

    IF p_Email IS NOT NULL AND EXISTS (SELECT 1 FROM `Students` WHERE Email = p_Email AND StudentId <> p_StudentId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email already in use by another student';
    END IF;

    UPDATE `Students`
    SET 
        StudentName = COALESCE(p_StudentName, StudentName),
        Photo = COALESCE(p_Photo, Photo),
        Gender = COALESCE(p_Gender, Gender),
        DateOfBirth = COALESCE(p_DateOfBirth, DateOfBirth),
        BloodGroup = COALESCE(p_BloodGroup, BloodGroup),
        Email = p_Email,
        MobileNumber = p_MobileNumber,
        AadhaarNumber = p_AadhaarNumber,
        Address = p_Address,
        AddressLine1 = p_Address,
        City = p_City,
        District = p_District,
        State = p_State,
        Pincode = p_Pincode,
        Nationality = p_Nationality,
        Religion = p_Religion,
        Category = p_Category,
        FatherName = p_FatherName,
        FatherOccupation = p_FatherOccupation,
        FatherMobile = p_FatherMobile,
        FatherEmail = p_FatherEmail,
        MotherName = p_MotherName,
        MotherOccupation = p_MotherOccupation,
        MotherMobile = p_MotherMobile,
        MotherEmail = p_MotherEmail,
        GuardianName = p_GuardianName,
        GuardianMobile = p_GuardianMobile,
        GuardianEmail = p_GuardianEmail,
        Remarks = COALESCE(p_Remarks, Remarks),
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE StudentId = p_StudentId;

    CALL sp_GetStudentProfile(p_StudentId);
END//

-- -----------------------------------------------------------------------------
-- 17. sp_CheckStudentEmail
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CheckStudentEmail`//
CREATE PROCEDURE `sp_CheckStudentEmail`(
    IN p_Email VARCHAR(255),
    IN p_ExcludeStudentId INT
)
BEGIN
    SELECT COUNT(*) AS ExistingCount 
    FROM `Students` 
    WHERE Email = p_Email AND (p_ExcludeStudentId IS NULL OR StudentId <> p_ExcludeStudentId);
END//

-- -----------------------------------------------------------------------------
-- 18. sp_CheckStudentMobile
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CheckStudentMobile`//
CREATE PROCEDURE `sp_CheckStudentMobile`(
    IN p_MobileNumber VARCHAR(20),
    IN p_ExcludeStudentId INT
)
BEGIN
    SELECT COUNT(*) AS ExistingCount 
    FROM `Students` 
    WHERE MobileNumber = p_MobileNumber AND (p_ExcludeStudentId IS NULL OR StudentId <> p_ExcludeStudentId);
END//

-- -----------------------------------------------------------------------------
-- 19. sp_UpdateStudent
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateStudent`//
CREATE PROCEDURE `sp_UpdateStudent`(
    IN p_StudentId INT,
    IN p_AdmissionNo VARCHAR(50),
    IN p_RollNo VARCHAR(50),
    IN p_StudentName VARCHAR(150),
    IN p_Photo VARCHAR(500),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME,
    IN p_BloodGroup VARCHAR(10),
    IN p_Email VARCHAR(150),
    IN p_MobileNumber VARCHAR(20),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Nationality VARCHAR(50),
    IN p_Religion VARCHAR(50),
    IN p_Category VARCHAR(50),
    IN p_Address VARCHAR(500),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(20),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_AdmissionDate DATETIME,
    IN p_AdmissionType VARCHAR(50),
    IN p_AdmissionQuota VARCHAR(50),
    IN p_Medium VARCHAR(50),
    IN p_SecondLanguage VARCHAR(50),
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousHallTicketNumber VARCHAR(100),
    IN p_PreviousBoard VARCHAR(100),
    IN p_PreviousYearOfPassing INT,
    IN p_PreviousPercentage DECIMAL(5,2),
    IN p_StudentCategory VARCHAR(50),
    IN p_ScholarshipStatus VARCHAR(50),
    IN p_ScholarshipAmount DECIMAL(18,2),
    IN p_FatherName VARCHAR(150),
    IN p_FatherOccupation VARCHAR(100),
    IN p_FatherMobile VARCHAR(20),
    IN p_FatherEmail VARCHAR(150),
    IN p_MotherName VARCHAR(150),
    IN p_MotherOccupation VARCHAR(100),
    IN p_MotherMobile VARCHAR(20),
    IN p_MotherEmail VARCHAR(150),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),
    IN p_GuardianEmail VARCHAR(150),
    IN p_AnnualIncome DECIMAL(18,2),
    IN p_FeeAmount DECIMAL(10,2),
    IN p_FeePaid DECIMAL(10,2),
    IN p_FeeStatus VARCHAR(30),
    IN p_AttendancePercentage DECIMAL(5,2),
    IN p_PerformanceGrade VARCHAR(20),
    IN p_CGPA DECIMAL(5,2),
    IN p_Rank INT,
    IN p_BirthCertificate VARCHAR(500),
    IN p_TransferCertificate VARCHAR(500),
    IN p_StudyCertificate VARCHAR(500),
    IN p_AadhaarDocument VARCHAR(500),
    IN p_CommunityCertificate VARCHAR(500),
    IN p_IncomeCertificate VARCHAR(500),
    IN p_CasteCertificate VARCHAR(500),
    IN p_TenthCertificate VARCHAR(500),
    IN p_MarksMemo VARCHAR(500),
    IN p_Remarks VARCHAR(1000),
    IN p_PasswordHash VARCHAR(255),
    IN p_IsFirstLogin BOOLEAN,
    IN p_IsActive BOOLEAN
)
BEGIN
    DECLARE v_BoardName VARCHAR(150);
    DECLARE v_AcademicLevelName VARCHAR(100);
    DECLARE v_SectionName VARCHAR(100);

    IF NOT EXISTS (SELECT 1 FROM `Students` WHERE StudentId = p_StudentId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student not found';
    END IF;

    SELECT BoardName INTO v_BoardName FROM `Boards` WHERE BoardId = p_BoardId LIMIT 1;
    SELECT LevelName INTO v_AcademicLevelName FROM `AcademicLevels` WHERE AcademicLevelId = p_AcademicLevelId LIMIT 1;
    SELECT SectionName INTO v_SectionName FROM `Sections` WHERE SectionId = p_SectionId AND GroupId = p_GroupId LIMIT 1;

    UPDATE `Students`
    SET 
        AdmissionNo = COALESCE(p_AdmissionNo, AdmissionNo),
        RollNo = COALESCE(p_RollNo, RollNo),
        StudentName = p_StudentName,
        Photo = p_Photo,
        Gender = p_Gender,
        DateOfBirth = p_DateOfBirth,
        BloodGroup = p_BloodGroup,
        Email = p_Email,
        MobileNumber = p_MobileNumber,
        AadhaarNumber = p_AadhaarNumber,
        Nationality = p_Nationality,
        Religion = p_Religion,
        Category = p_Category,
        Address = p_Address,
        AddressLine1 = p_Address,
        City = p_City,
        District = p_District,
        State = p_State,
        Pincode = p_Pincode,
        BoardId = p_BoardId,
        Board = v_BoardName,
        AcademicYearId = p_AcademicYearId,
        AcademicLevelId = p_AcademicLevelId,
        AcademicLevel = v_AcademicLevelName,
        GroupId = p_GroupId,
        SectionId = p_SectionId,
        Section = v_SectionName,
        AdmissionDate = p_AdmissionDate,
        AdmissionType = p_AdmissionType,
        AdmissionQuota = p_AdmissionQuota,
        Medium = p_Medium,
        SecondLanguage = p_SecondLanguage,
        PreviousSchool = p_PreviousSchool,
        PreviousHallTicketNumber = p_PreviousHallTicketNumber,
        PreviousBoard = p_PreviousBoard,
        PreviousYearOfPassing = p_PreviousYearOfPassing,
        PreviousPercentage = p_PreviousPercentage,
        StudentCategory = p_StudentCategory,
        ScholarshipStatus = p_ScholarshipStatus,
        ScholarshipAmount = p_ScholarshipAmount,
        FatherName = p_FatherName,
        FatherOccupation = p_FatherOccupation,
        FatherMobile = p_FatherMobile,
        FatherEmail = p_FatherEmail,
        MotherName = p_MotherName,
        MotherOccupation = p_MotherOccupation,
        MotherMobile = p_MotherMobile,
        MotherEmail = p_MotherEmail,
        GuardianName = p_GuardianName,
        GuardianMobile = p_GuardianMobile,
        GuardianEmail = p_GuardianEmail,
        AnnualIncome = p_AnnualIncome,
        FeeAmount = p_FeeAmount,
        FeePaid = p_FeePaid,
        FeeStatus = p_FeeStatus,
        AttendancePercentage = p_AttendancePercentage,
        PerformanceGrade = p_PerformanceGrade,
        CGPA = p_CGPA,
        `Rank` = p_Rank,
        BirthCertificate = p_BirthCertificate,
        TransferCertificate = p_TransferCertificate,
        StudyCertificate = p_StudyCertificate,
        AadhaarDocument = p_AadhaarDocument,
        CommunityCertificate = p_CommunityCertificate,
        IncomeCertificate = p_IncomeCertificate,
        CasteCertificate = p_CasteCertificate,
        TenthCertificate = p_TenthCertificate,
        MarksMemo = p_MarksMemo,
        Remarks = p_Remarks,
        IsActive = COALESCE(p_IsActive, IsActive),
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE StudentId = p_StudentId;

    CALL sp_GetStudentById(p_StudentId);
END//

DELIMITER ;

-- =============================================================================
-- STEP 4: POST-DEPLOYMENT VERIFICATION CHECKS
-- =============================================================================
SELECT '--- STEP 4: POST-DEPLOYMENT VERIFICATION ---' AS Info;
SELECT COUNT(*) AS TotalStudentsAfter FROM `Students`;
SELECT COUNT(*) AS TotalActiveStudentsAfter FROM `Students` WHERE IsActive = 1;
SELECT '10_StudentManagementRefactor.sql DEPLOYMENT COMPLETED SUCCESSFULLY' AS Status;
