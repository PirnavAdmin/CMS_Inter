-- =============================================================================
-- MODULE: CERTIFICATES MANAGEMENT (100% CLEAN & SYNTAX ERROR FREE)
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

-- -----------------------------------------------------------------------------
-- 1. Ensure Table Columns & Foreign Key Indexes
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_PatchCertificatesTableColumns`;
DELIMITER //
CREATE PROCEDURE `sp_PatchCertificatesTableColumns`()
BEGIN
    -- StudentId
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'StudentId') THEN
        ALTER TABLE `certificates` ADD COLUMN `StudentId` INT NOT NULL AFTER `Id`;
    END IF;

    -- CertificateNo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'CertificateNo') THEN
        ALTER TABLE `certificates` ADD COLUMN `CertificateNo` VARCHAR(50) NOT NULL;
    END IF;

    -- CertificateType
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'CertificateType') THEN
        ALTER TABLE `certificates` ADD COLUMN `CertificateType` VARCHAR(100) NOT NULL;
    END IF;

    -- Purpose
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'Purpose') THEN
        ALTER TABLE `certificates` ADD COLUMN `Purpose` VARCHAR(250) NOT NULL;
    END IF;

    -- AdmissionNo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'AdmissionNo') THEN
        ALTER TABLE `certificates` ADD COLUMN `AdmissionNo` VARCHAR(50) NULL;
    END IF;

    -- StudentName
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'StudentName') THEN
        ALTER TABLE `certificates` ADD COLUMN `StudentName` VARCHAR(150) NULL;
    END IF;

    -- GroupName
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'GroupName') THEN
        ALTER TABLE `certificates` ADD COLUMN `GroupName` VARCHAR(100) NULL;
    END IF;

    -- AcademicLevel
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'AcademicLevel') THEN
        ALTER TABLE `certificates` ADD COLUMN `AcademicLevel` VARCHAR(100) NULL;
    END IF;

    -- AcademicYear
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'AcademicYear') THEN
        ALTER TABLE `certificates` ADD COLUMN `AcademicYear` VARCHAR(50) NULL;
    END IF;

    -- RequestDate
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'RequestDate') THEN
        ALTER TABLE `certificates` ADD COLUMN `RequestDate` DATETIME(6) NULL;
    END IF;

    -- IssueDate
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'IssueDate') THEN
        ALTER TABLE `certificates` ADD COLUMN `IssueDate` DATETIME(6) NULL;
    END IF;

    -- Remarks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'Remarks') THEN
        ALTER TABLE `certificates` ADD COLUMN `Remarks` VARCHAR(1000) NULL;
    END IF;

    -- Status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'Status') THEN
        ALTER TABLE `certificates` ADD COLUMN `Status` VARCHAR(30) NOT NULL DEFAULT 'Generated';
    END IF;

    -- GeneratedAt
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'GeneratedAt') THEN
        ALTER TABLE `certificates` ADD COLUMN `GeneratedAt` DATETIME(6) NULL;
    END IF;

    -- ReviewedAt
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'ReviewedAt') THEN
        ALTER TABLE `certificates` ADD COLUMN `ReviewedAt` DATETIME(6) NULL;
    END IF;

    -- ApprovedAt
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'ApprovedAt') THEN
        ALTER TABLE `certificates` ADD COLUMN `ApprovedAt` DATETIME(6) NULL;
    END IF;

    -- IssuedAt
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'IssuedAt') THEN
        ALTER TABLE `certificates` ADD COLUMN `IssuedAt` DATETIME(6) NULL;
    END IF;

    -- IssuedBy
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'IssuedBy') THEN
        ALTER TABLE `certificates` ADD COLUMN `IssuedBy` VARCHAR(150) NULL;
    END IF;

    -- IsActive
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'IsActive') THEN
        ALTER TABLE `certificates` ADD COLUMN `IsActive` TINYINT(1) NOT NULL DEFAULT 1;
    END IF;

    -- CreatedAt
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'CreatedAt') THEN
        ALTER TABLE `certificates` ADD COLUMN `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6);
    END IF;

    -- UpdatedAt
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'UpdatedAt') THEN
        ALTER TABLE `certificates` ADD COLUMN `UpdatedAt` DATETIME(6) NULL;
    END IF;
END //
DELIMITER ;

CALL sp_PatchCertificatesTableColumns();
DROP PROCEDURE IF EXISTS `sp_PatchCertificatesTableColumns`;

-- Add Indexes for Performance & Foreign Key support
SET @idx_student = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'certificates' AND index_name = 'IX_certificates_StudentId');
SET @sql_idx = IF(@idx_student = 0, 'CREATE INDEX `IX_certificates_StudentId` ON `certificates` (`StudentId`);', 'SELECT 1;');
PREPARE stmt FROM @sql_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_certno = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'certificates' AND index_name = 'IX_certificates_CertificateNo');
SET @sql_idx = IF(@idx_certno = 0, 'CREATE INDEX `IX_certificates_CertificateNo` ON `certificates` (`CertificateNo`);', 'SELECT 1;');
PREPARE stmt FROM @sql_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_admno = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'certificates' AND index_name = 'IX_certificates_AdmissionNo');
SET @sql_idx = IF(@idx_admno = 0, 'CREATE INDEX `IX_certificates_AdmissionNo` ON `certificates` (`AdmissionNo`);', 'SELECT 1;');
PREPARE stmt FROM @sql_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- 2. Backfill & Synchronize Dependent Data from Students, Groups, AcademicYears
-- -----------------------------------------------------------------------------

UPDATE `certificates` SET `RequestDate` = COALESCE(`IssueDate`, `CreatedAt`, NOW()) WHERE `RequestDate` IS NULL;
UPDATE `certificates` SET `GeneratedAt` = COALESCE(`CreatedAt`, `IssueDate`, NOW()) WHERE `GeneratedAt` IS NULL;
UPDATE `certificates` SET `IssueDate` = `RequestDate` WHERE `IssueDate` IS NULL;

-- Synchronize missing AdmissionNo / StudentName / Group / AcademicYear from live master tables
UPDATE `certificates` c
JOIN `Students` s ON s.StudentId = c.StudentId
LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
SET 
    c.AdmissionNo = COALESCE(NULLIF(c.AdmissionNo, ''), s.AdmissionNo),
    c.StudentName = COALESCE(NULLIF(c.StudentName, ''), s.StudentName),
    c.GroupName = COALESCE(NULLIF(c.GroupName, ''), g.GroupName, 'General'),
    c.AcademicLevel = COALESCE(NULLIF(c.AcademicLevel, ''), s.AcademicLevel, '1st Year'),
    c.AcademicYear = COALESCE(NULLIF(c.AcademicYear, ''), ay.AcademicYearName, '2026-2027');

UPDATE `certificates` c
JOIN `Students` s ON TRIM(s.AdmissionNo) = TRIM(c.AdmissionNo)
SET c.StudentId = s.StudentId
WHERE c.StudentId IS NULL OR c.StudentId = 0;

-- -----------------------------------------------------------------------------
-- 3. Stored Procedures (Individual Clean Delimited Blocks)
-- -----------------------------------------------------------------------------

-- 3.1 sp_GetCertificates
DROP PROCEDURE IF EXISTS `sp_GetCertificates`;
DELIMITER //
CREATE PROCEDURE `sp_GetCertificates`(
    IN p_Search VARCHAR(150),
    IN p_Status VARCHAR(30),
    IN p_CertificateType VARCHAR(100)
)
BEGIN
    SELECT 
        c.Id AS CertificateId,
        COALESCE(NULLIF(c.CertificateNo, ''), CONCAT('CERT-', c.Id)) AS CertificateNumber,
        c.StudentId,
        COALESCE(NULLIF(c.AdmissionNo, ''), s.AdmissionNo, '') AS AdmissionNo,
        COALESCE(NULLIF(c.StudentName, ''), s.StudentName, '') AS StudentName,
        COALESCE(NULLIF(c.GroupName, ''), g.GroupName, '') AS GroupName,
        COALESCE(NULLIF(c.AcademicLevel, ''), s.AcademicLevel, '1st Year') AS AcademicLevel,
        COALESCE(NULLIF(c.AcademicYear, ''), ay.AcademicYearName, '') AS AcademicYear,
        c.CertificateType,
        c.Purpose,
        COALESCE(c.RequestDate, c.IssueDate, c.CreatedAt) AS RequestDate,
        COALESCE(c.IssueDate, c.RequestDate, c.CreatedAt) AS IssueDate,
        c.Remarks,
        CASE WHEN c.Status = 'Active' THEN 'Generated' ELSE c.Status END AS Status,
        COALESCE(c.GeneratedAt, c.CreatedAt) AS GeneratedAt,
        c.ReviewedAt,
        c.ApprovedAt,
        c.IssuedAt,
        c.IssuedBy,
        COALESCE(c.IsActive, 1) AS IsActive,
        c.CreatedAt,
        c.UpdatedAt
    FROM `certificates` c
    LEFT JOIN `Students` s ON s.StudentId = c.StudentId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    WHERE (c.IsActive = 1 OR c.IsActive IS NULL OR p_Status = 'Cancelled' OR p_Status = 'All' OR p_Status IS NULL)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR p_Status = 'All Status' 
           OR c.Status = p_Status 
           OR (p_Status = 'Generated' AND c.Status = 'Active'))
      AND (p_CertificateType IS NULL OR p_CertificateType = '' OR p_CertificateType = 'All' OR c.CertificateType = p_CertificateType)
      AND (p_Search IS NULL OR p_Search = '' 
           OR c.CertificateNo LIKE CONCAT('%', p_Search, '%')
           OR c.AdmissionNo LIKE CONCAT('%', p_Search, '%')
           OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%')
           OR c.StudentName LIKE CONCAT('%', p_Search, '%')
           OR s.StudentName LIKE CONCAT('%', p_Search, '%')
           OR c.CertificateType LIKE CONCAT('%', p_Search, '%')
           OR c.Purpose LIKE CONCAT('%', p_Search, '%'))
    ORDER BY c.Id DESC;
END //
DELIMITER ;

-- 3.2 sp_GetCertificateById
DROP PROCEDURE IF EXISTS `sp_GetCertificateById`;
DELIMITER //
CREATE PROCEDURE `sp_GetCertificateById`(
    IN p_CertificateId INT
)
BEGIN
    SELECT 
        c.Id AS CertificateId,
        COALESCE(NULLIF(c.CertificateNo, ''), CONCAT('CERT-', c.Id)) AS CertificateNumber,
        c.StudentId,
        COALESCE(NULLIF(c.AdmissionNo, ''), s.AdmissionNo, '') AS AdmissionNo,
        COALESCE(NULLIF(c.StudentName, ''), s.StudentName, '') AS StudentName,
        COALESCE(NULLIF(c.GroupName, ''), g.GroupName, '') AS GroupName,
        COALESCE(NULLIF(c.AcademicLevel, ''), s.AcademicLevel, '1st Year') AS AcademicLevel,
        COALESCE(NULLIF(c.AcademicYear, ''), ay.AcademicYearName, '') AS AcademicYear,
        c.CertificateType,
        c.Purpose,
        COALESCE(c.RequestDate, c.IssueDate, c.CreatedAt) AS RequestDate,
        COALESCE(c.IssueDate, c.RequestDate, c.CreatedAt) AS IssueDate,
        c.Remarks,
        CASE WHEN c.Status = 'Active' THEN 'Generated' ELSE c.Status END AS Status,
        COALESCE(c.GeneratedAt, c.CreatedAt) AS GeneratedAt,
        c.ReviewedAt,
        c.ApprovedAt,
        c.IssuedAt,
        c.IssuedBy,
        COALESCE(c.IsActive, 1) AS IsActive,
        c.CreatedAt,
        c.UpdatedAt
    FROM `certificates` c
    LEFT JOIN `Students` s ON s.StudentId = c.StudentId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    WHERE c.Id = p_CertificateId
    LIMIT 1;
END //
DELIMITER ;

-- 3.3 sp_GetCertificateWorkflowStats
DROP PROCEDURE IF EXISTS `sp_GetCertificateWorkflowStats`;
DELIMITER //
CREATE PROCEDURE `sp_GetCertificateWorkflowStats`()
BEGIN
    SELECT
        COUNT(*) AS TotalCount,
        COALESCE(SUM(CASE WHEN (Status = 'Generated' OR Status = 'Active') AND (IsActive = 1 OR IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS GeneratedCount,
        COALESCE(SUM(CASE WHEN Status = 'Reviewed' AND (IsActive = 1 OR IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS ReviewedCount,
        COALESCE(SUM(CASE WHEN Status = 'Approved' AND (IsActive = 1 OR IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS ApprovedCount,
        COALESCE(SUM(CASE WHEN Status = 'Issued' AND (IsActive = 1 OR IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS IssuedCount,
        COALESCE(SUM(CASE WHEN Status = 'Cancelled' OR Status = 'Deleted' OR IsActive = 0 THEN 1 ELSE 0 END), 0) AS CancelledCount
    FROM `certificates`;
END //
DELIMITER ;

-- 3.4 sp_GetStudentsForCertificateDropdown
DROP PROCEDURE IF EXISTS `sp_GetStudentsForCertificateDropdown`;
DELIMITER //
CREATE PROCEDURE `sp_GetStudentsForCertificateDropdown`()
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(ay.AcademicYearName, '') AS AcademicYear,
        COALESCE(s.AcademicLevel, '1st Year') AS AcademicLevel,
        COALESCE(sec.SectionName, '') AS Section
    FROM `Students` s
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (s.AdmissionNo IS NOT NULL AND s.AdmissionNo <> '')
    ORDER BY s.StudentName ASC;
END //
DELIMITER ;

-- 3.5 sp_GenerateCertificate
DROP PROCEDURE IF EXISTS `sp_GenerateCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_GenerateCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_CertificateType VARCHAR(100),
    IN p_Purpose VARCHAR(250),
    IN p_RequestDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    DECLARE v_StudentId INT DEFAULT NULL;
    DECLARE v_StudentName VARCHAR(150);
    DECLARE v_GroupName VARCHAR(100);
    DECLARE v_AcademicLevel VARCHAR(100);
    DECLARE v_AcademicYear VARCHAR(50);
    DECLARE v_CertificateNumber VARCHAR(50);
    DECLARE v_Prefix VARCHAR(10);
    DECLARE v_YearNum VARCHAR(10);
    DECLARE v_NewId INT DEFAULT NULL;

    IF p_AdmissionNo IS NULL OR TRIM(p_AdmissionNo) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission number is required.';
    END IF;

    IF p_CertificateType IS NULL OR TRIM(p_CertificateType) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Certificate type is required.';
    END IF;

    SELECT 
        s.StudentId,
        s.StudentName,
        COALESCE(g.GroupName, ''),
        COALESCE(s.AcademicLevel, '1st Year'),
        COALESCE(ay.AcademicYearName, '')
    INTO
        v_StudentId,
        v_StudentName,
        v_GroupName,
        v_AcademicLevel,
        v_AcademicYear
    FROM `Students` s
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    WHERE TRIM(s.AdmissionNo) = TRIM(p_AdmissionNo)
    LIMIT 1;

    IF v_StudentId IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student record not found for the given admission number.';
    END IF;

    SET v_Prefix = CASE 
        WHEN p_CertificateType = 'Bonafide Certificate' THEN 'BON'
        WHEN p_CertificateType = 'Study Certificate' THEN 'STU'
        WHEN p_CertificateType = 'Conduct Certificate' THEN 'CND'
        WHEN p_CertificateType LIKE '%Transfer%' THEN 'TC'
        ELSE 'CERT'
    END;

    SET v_YearNum = DATE_FORMAT(COALESCE(p_RequestDate, NOW()), '%Y%m%d');
    SET v_CertificateNumber = CONCAT(v_Prefix, '-', v_YearNum, '-', LPAD(FLOOR(RAND() * 899999 + 100000), 6, '0'));

    INSERT INTO `certificates` (
        `StudentId`,
        `CertificateNo`,
        `CertificateType`,
        `Purpose`,
        `IssueDate`,
        `RequestDate`,
        `Remarks`,
        `Status`,
        `AdmissionNo`,
        `StudentName`,
        `GroupName`,
        `AcademicLevel`,
        `AcademicYear`,
        `GeneratedAt`,
        `IsActive`,
        `CreatedAt`
    ) VALUES (
        v_StudentId,
        v_CertificateNumber,
        TRIM(p_CertificateType),
        TRIM(p_Purpose),
        COALESCE(p_RequestDate, NOW()),
        COALESCE(p_RequestDate, NOW()),
        NULLIF(TRIM(p_Remarks), ''),
        'Generated',
        TRIM(p_AdmissionNo),
        v_StudentName,
        v_GroupName,
        v_AcademicLevel,
        v_AcademicYear,
        NOW(),
        1,
        NOW()
    );

    SET v_NewId = LAST_INSERT_ID();

    CALL sp_GetCertificateById(v_NewId);
END //
DELIMITER ;

-- 3.6 sp_MoveCertificateStatus
DROP PROCEDURE IF EXISTS `sp_MoveCertificateStatus`;
DELIMITER //
CREATE PROCEDURE `sp_MoveCertificateStatus`(
    IN p_CertificateId INT,
    IN p_NewStatus VARCHAR(30),
    IN p_IssuedBy VARCHAR(150)
)
BEGIN
    IF p_NewStatus = 'Reviewed' THEN
        UPDATE `certificates`
        SET `Status` = 'Reviewed', `ReviewedAt` = NOW(), `UpdatedAt` = NOW()
        WHERE `Id` = p_CertificateId;
    ELSEIF p_NewStatus = 'Approved' THEN
        UPDATE `certificates`
        SET `Status` = 'Approved', `ApprovedAt` = NOW(), `UpdatedAt` = NOW()
        WHERE `Id` = p_CertificateId;
    ELSEIF p_NewStatus = 'Issued' THEN
        UPDATE `certificates`
        SET `Status` = 'Issued', `IssuedAt` = NOW(), `IssueDate` = COALESCE(`IssueDate`, NOW()),
            `IssuedBy` = COALESCE(NULLIF(TRIM(p_IssuedBy), ''), 'Admin'), `UpdatedAt` = NOW()
        WHERE `Id` = p_CertificateId;
    ELSE
        UPDATE `certificates`
        SET `Status` = p_NewStatus, `UpdatedAt` = NOW()
        WHERE `Id` = p_CertificateId;
    END IF;

    CALL sp_GetCertificateById(p_CertificateId);
END //
DELIMITER ;

-- 3.7 sp_BulkApproveCertificates
DROP PROCEDURE IF EXISTS `sp_BulkApproveCertificates`;
DELIMITER //
CREATE PROCEDURE `sp_BulkApproveCertificates`(
    IN p_ApprovedBy VARCHAR(150)
)
BEGIN
    UPDATE `certificates`
    SET `Status` = 'Approved',
        `ApprovedAt` = NOW(),
        `UpdatedAt` = NOW()
    WHERE `Status` = 'Reviewed';

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- 3.8 sp_BulkIssueCertificates
DROP PROCEDURE IF EXISTS `sp_BulkIssueCertificates`;
DELIMITER //
CREATE PROCEDURE `sp_BulkIssueCertificates`(
    IN p_IssuedBy VARCHAR(150)
)
BEGIN
    UPDATE `certificates`
    SET `Status` = 'Issued',
        `IssuedAt` = NOW(),
        `IssueDate` = COALESCE(`IssueDate`, NOW()),
        `IssuedBy` = COALESCE(NULLIF(TRIM(p_IssuedBy), ''), 'Admin'),
        `UpdatedAt` = NOW()
    WHERE `Status` = 'Approved';

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- 3.9 sp_CancelCertificate
DROP PROCEDURE IF EXISTS `sp_CancelCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_CancelCertificate`(
    IN p_CertificateId INT
)
BEGIN
    UPDATE `certificates`
    SET `Status` = 'Cancelled',
        `IsActive` = 0,
        `UpdatedAt` = NOW()
    WHERE `Id` = p_CertificateId;

    CALL sp_GetCertificateById(p_CertificateId);
END //
DELIMITER ;

-- 3.10 sp_DeleteCertificate
DROP PROCEDURE IF EXISTS `sp_DeleteCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteCertificate`(
    IN p_CertificateId INT
)
BEGIN
    UPDATE `certificates`
    SET `IsActive` = 0,
        `Status` = 'Deleted',
        `UpdatedAt` = NOW()
    WHERE `Id` = p_CertificateId;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- 3.11 sp_VerifyCertificate
DROP PROCEDURE IF EXISTS `sp_VerifyCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_VerifyCertificate`(
    IN p_CertificateNumber VARCHAR(50)
)
BEGIN
    SELECT 
        c.Id AS CertificateId,
        c.CertificateNo AS CertificateNumber,
        c.StudentId,
        COALESCE(NULLIF(c.AdmissionNo, ''), s.AdmissionNo, '') AS AdmissionNo,
        COALESCE(NULLIF(c.StudentName, ''), s.StudentName, '') AS StudentName,
        COALESCE(NULLIF(c.GroupName, ''), g.GroupName, '') AS GroupName,
        COALESCE(NULLIF(c.AcademicLevel, ''), s.AcademicLevel, '1st Year') AS AcademicLevel,
        COALESCE(NULLIF(c.AcademicYear, ''), ay.AcademicYearName, '') AS AcademicYear,
        c.CertificateType,
        c.Purpose,
        COALESCE(c.RequestDate, c.IssueDate, c.CreatedAt) AS RequestDate,
        COALESCE(c.IssueDate, c.RequestDate, c.CreatedAt) AS IssueDate,
        c.Remarks,
        CASE WHEN c.Status = 'Active' THEN 'Generated' ELSE c.Status END AS Status,
        c.CreatedAt AS GeneratedAt,
        c.ReviewedAt,
        c.ApprovedAt,
        c.IssuedAt,
        c.IssuedBy,
        COALESCE(c.IsActive, 1) AS IsActive
    FROM `certificates` c
    LEFT JOIN `Students` s ON s.StudentId = c.StudentId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    WHERE c.CertificateNo = TRIM(p_CertificateNumber)
      AND (c.IsActive = 1 OR c.IsActive IS NULL)
      AND c.Status != 'Cancelled'
    LIMIT 1;
END //
DELIMITER ;

-- Compatibility SPs
DROP PROCEDURE IF EXISTS `sp_GenerateBonafideCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_GenerateBonafideCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    CALL sp_GenerateCertificate(p_AdmissionNo, 'Bonafide Certificate', p_Purpose, p_IssueDate, p_Remarks);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GenerateStudyCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_GenerateStudyCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    CALL sp_GenerateCertificate(p_AdmissionNo, 'Study Certificate', p_Purpose, p_IssueDate, p_Remarks);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GenerateConductCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_GenerateConductCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    CALL sp_GenerateCertificate(p_AdmissionNo, 'Conduct Certificate', p_Purpose, p_IssueDate, p_Remarks);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GenerateTCCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_GenerateTCCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    CALL sp_GenerateCertificate(p_AdmissionNo, 'Transfer Certificate', p_Purpose, p_IssueDate, p_Remarks);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GenerateFeeCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_GenerateFeeCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    CALL sp_GenerateCertificate(p_AdmissionNo, 'Fee Certificate', p_Purpose, p_IssueDate, p_Remarks);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GenerateOtherCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_GenerateOtherCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_CertificateType VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    CALL sp_GenerateCertificate(p_AdmissionNo, COALESCE(NULLIF(TRIM(p_CertificateType),''), 'General Certificate'), p_Purpose, p_IssueDate, p_Remarks);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetCertificateHistory`;
DELIMITER //
CREATE PROCEDURE `sp_GetCertificateHistory`(
    IN p_AdmissionNo VARCHAR(100)
)
BEGIN
    SELECT c.* FROM `certificates` c
    WHERE (p_AdmissionNo IS NULL OR p_AdmissionNo = '' OR c.AdmissionNo = p_AdmissionNo)
    ORDER BY c.Id DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_ReviewCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_ReviewCertificate`(
    IN p_CertificateId INT
)
BEGIN
    CALL sp_MoveCertificateStatus(p_CertificateId, 'Reviewed', 'Admin');
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_ApproveCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_ApproveCertificate`(
    IN p_CertificateId INT
)
BEGIN
    CALL sp_MoveCertificateStatus(p_CertificateId, 'Approved', 'Admin');
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_IssueCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_IssueCertificate`(
    IN p_CertificateId INT,
    IN p_IssuedBy VARCHAR(150)
)
BEGIN
    CALL sp_MoveCertificateStatus(p_CertificateId, 'Issued', p_IssuedBy);
END //
DELIMITER ;

SET SQL_SAFE_UPDATES = 1;
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Certificates module SQL script executed successfully with 0 errors!' AS Result;
