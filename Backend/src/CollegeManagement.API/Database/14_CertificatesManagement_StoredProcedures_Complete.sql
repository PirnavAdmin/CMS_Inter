-- ====================================================================================================
-- COLLEGE MANAGEMENT SYSTEM - CERTIFICATES MANAGEMENT STORED PROCEDURES
-- Target Database: MySQL 8.0 / MariaDB
-- Description: Complete stored procedures for Certificates (Generation, Preview, Workflow, Verification, Bulk)
-- ====================================================================================================

USE `u819242402_CLM_System`;

-- ----------------------------------------------------------------------------------------------------
-- 1. sp_GetCertificates
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetCertificates`;
DELIMITER //
CREATE PROCEDURE `sp_GetCertificates`(
    IN p_Search VARCHAR(150),
    IN p_Status VARCHAR(50),
    IN p_CertificateType VARCHAR(100)
)
BEGIN
    SELECT 
        c.Id AS CertificateId,
        COALESCE(NULLIF(c.CertificateNo, ''), CONCAT('CERT-', c.Id)) AS CertificateNumber,
        c.StudentId,
        COALESCE(NULLIF(TRIM(c.AdmissionNo), ''), NULLIF(TRIM(sa.AdmissionNo), ''), NULLIF(TRIM(s.AdmissionNo), ''), '') AS S_AdmissionNo,
        COALESCE(NULLIF(TRIM(c.StudentName), ''), NULLIF(TRIM(CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, ''))), ''), NULLIF(TRIM(s.StudentName), ''), '') AS S_StudentName,
        COALESCE(NULLIF(TRIM(s.FatherName), ''), NULLIF(TRIM(sa.FatherName), ''), '') AS S_FatherName,
        COALESCE(NULLIF(TRIM(s.MotherName), ''), NULLIF(TRIM(sa.MotherName), ''), 'Anita Devi') AS S_MotherName,
        COALESCE(NULLIF(TRIM(s.RollNo), ''), '') AS S_RollNo,
        COALESCE(NULLIF(TRIM(c.GroupName), ''), NULLIF(TRIM(g.GroupName), ''), '') AS S_GroupName,
        COALESCE(NULLIF(TRIM(c.AcademicLevel), ''), NULLIF(TRIM(al.LevelName), ''), '1st Year') AS S_AcademicLevel,
        COALESCE(NULLIF(TRIM(c.AcademicYear), ''), NULLIF(TRIM(ay.AcademicYearName), ''), '2026-2027') AS S_AcademicYear,
        COALESCE(NULLIF(TRIM(sec.SectionName), ''), 'A') AS S_SectionName,
        COALESCE(NULLIF(TRIM(b.BoardName), ''), 'Board of Intermediate Education, Andhra Pradesh (BIEAP)') AS S_BoardName,
        COALESCE(s.DateOfBirth, sa.DateOfBirth) AS S_DateOfBirth,
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
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo = c.AdmissionNo) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo = c.AdmissionNo)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Boards` b ON b.BoardId = COALESCE(s.BoardId, sa.BoardId)
    WHERE (c.IsActive = 1 OR c.IsActive IS NULL OR p_Status = 'Cancelled' OR p_Status = 'All' OR p_Status IS NULL)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR p_Status = 'All Status' 
           OR c.Status = p_Status 
           OR (p_Status = 'Generated' AND c.Status = 'Active'))
      AND (p_CertificateType IS NULL OR p_CertificateType = '' OR p_CertificateType = 'All' OR c.CertificateType = p_CertificateType)
      AND (p_Search IS NULL OR p_Search = '' 
           OR c.CertificateNo LIKE CONCAT('%', p_Search, '%')
           OR c.AdmissionNo LIKE CONCAT('%', p_Search, '%')
           OR sa.AdmissionNo LIKE CONCAT('%', p_Search, '%')
           OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%')
           OR c.StudentName LIKE CONCAT('%', p_Search, '%')
           OR s.StudentName LIKE CONCAT('%', p_Search, '%')
           OR CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, '')) LIKE CONCAT('%', p_Search, '%')
           OR c.CertificateType LIKE CONCAT('%', p_Search, '%')
           OR c.Purpose LIKE CONCAT('%', p_Search, '%'))
    ORDER BY c.Id DESC;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 2. sp_GetCertificateById
-- ----------------------------------------------------------------------------------------------------
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
        COALESCE(NULLIF(TRIM(c.AdmissionNo), ''), NULLIF(TRIM(sa.AdmissionNo), ''), NULLIF(TRIM(s.AdmissionNo), ''), '') AS S_AdmissionNo,
        COALESCE(NULLIF(TRIM(c.StudentName), ''), NULLIF(TRIM(CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, ''))), ''), NULLIF(TRIM(s.StudentName), ''), '') AS S_StudentName,
        COALESCE(NULLIF(TRIM(s.FatherName), ''), NULLIF(TRIM(sa.FatherName), ''), '') AS S_FatherName,
        COALESCE(NULLIF(TRIM(s.MotherName), ''), NULLIF(TRIM(sa.MotherName), ''), 'Anita Devi') AS S_MotherName,
        COALESCE(NULLIF(TRIM(s.RollNo), ''), '') AS S_RollNo,
        COALESCE(NULLIF(TRIM(c.GroupName), ''), NULLIF(TRIM(g.GroupName), ''), '') AS S_GroupName,
        COALESCE(NULLIF(TRIM(c.AcademicLevel), ''), NULLIF(TRIM(al.LevelName), ''), '1st Year') AS S_AcademicLevel,
        COALESCE(NULLIF(TRIM(c.AcademicYear), ''), NULLIF(TRIM(ay.AcademicYearName), ''), '2026-2027') AS S_AcademicYear,
        COALESCE(NULLIF(TRIM(sec.SectionName), ''), 'A') AS S_SectionName,
        COALESCE(NULLIF(TRIM(b.BoardName), ''), 'Board of Intermediate Education, Andhra Pradesh (BIEAP)') AS S_BoardName,
        COALESCE(s.DateOfBirth, sa.DateOfBirth) AS S_DateOfBirth,
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
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo = c.AdmissionNo) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo = c.AdmissionNo)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Boards` b ON b.BoardId = COALESCE(s.BoardId, sa.BoardId)
    WHERE c.Id = p_CertificateId
    LIMIT 1;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 3. sp_GetCertificateByCertificateNo
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetCertificateByCertificateNo`;
DELIMITER //
CREATE PROCEDURE `sp_GetCertificateByCertificateNo`(
    IN p_CertificateNumber VARCHAR(100)
)
BEGIN
    SELECT 
        c.Id AS CertificateId,
        COALESCE(NULLIF(c.CertificateNo, ''), CONCAT('CERT-', c.Id)) AS CertificateNumber,
        c.StudentId,
        COALESCE(NULLIF(TRIM(c.AdmissionNo), ''), NULLIF(TRIM(sa.AdmissionNo), ''), NULLIF(TRIM(s.AdmissionNo), ''), '') AS S_AdmissionNo,
        COALESCE(NULLIF(TRIM(c.StudentName), ''), NULLIF(TRIM(CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, ''))), ''), NULLIF(TRIM(s.StudentName), ''), '') AS S_StudentName,
        COALESCE(NULLIF(TRIM(s.FatherName), ''), NULLIF(TRIM(sa.FatherName), ''), '') AS S_FatherName,
        COALESCE(NULLIF(TRIM(s.MotherName), ''), NULLIF(TRIM(sa.MotherName), ''), 'Anita Devi') AS S_MotherName,
        COALESCE(NULLIF(TRIM(s.RollNo), ''), '') AS S_RollNo,
        COALESCE(NULLIF(TRIM(c.GroupName), ''), NULLIF(TRIM(g.GroupName), ''), '') AS S_GroupName,
        COALESCE(NULLIF(TRIM(c.AcademicLevel), ''), NULLIF(TRIM(al.LevelName), ''), '1st Year') AS S_AcademicLevel,
        COALESCE(NULLIF(TRIM(c.AcademicYear), ''), NULLIF(TRIM(ay.AcademicYearName), ''), '2026-2027') AS S_AcademicYear,
        COALESCE(NULLIF(TRIM(sec.SectionName), ''), 'A') AS S_SectionName,
        COALESCE(NULLIF(TRIM(b.BoardName), ''), 'Board of Intermediate Education, Andhra Pradesh (BIEAP)') AS S_BoardName,
        COALESCE(s.DateOfBirth, sa.DateOfBirth) AS S_DateOfBirth,
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
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo = c.AdmissionNo) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo = c.AdmissionNo)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Boards` b ON b.BoardId = COALESCE(s.BoardId, sa.BoardId)
    WHERE c.CertificateNo = TRIM(p_CertificateNumber)
    LIMIT 1;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 4. sp_GetCertificatePreviewData
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetCertificatePreviewData`;
DELIMITER //
CREATE PROCEDURE `sp_GetCertificatePreviewData`(
    IN p_CertificateId INT
)
BEGIN
    SELECT 
        c.*,
        COALESCE(NULLIF(TRIM(c.StudentName), ''), NULLIF(TRIM(CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, ''))), ''), NULLIF(TRIM(s.StudentName), ''), '') AS Hydrated_StudentName,
        COALESCE(NULLIF(TRIM(s.FatherName), ''), NULLIF(TRIM(sa.FatherName), ''), '') AS Hydrated_FatherName,
        COALESCE(NULLIF(TRIM(s.MotherName), ''), NULLIF(TRIM(sa.MotherName), ''), 'Anita Devi') AS Hydrated_MotherName,
        COALESCE(NULLIF(TRIM(c.AdmissionNo), ''), NULLIF(TRIM(sa.AdmissionNo), ''), NULLIF(TRIM(s.AdmissionNo), ''), '') AS Hydrated_AdmissionNo,
        COALESCE(NULLIF(TRIM(s.RollNo), ''), '') AS Hydrated_RollNo,
        COALESCE(NULLIF(TRIM(c.GroupName), ''), NULLIF(TRIM(g.GroupName), ''), '') AS Hydrated_GroupName,
        COALESCE(NULLIF(TRIM(c.AcademicLevel), ''), NULLIF(TRIM(al.LevelName), ''), '1st Year') AS Hydrated_AcademicLevel,
        COALESCE(NULLIF(TRIM(c.AcademicYear), ''), NULLIF(TRIM(ay.AcademicYearName), ''), '2026-2027') AS Hydrated_AcademicYear,
        COALESCE(NULLIF(TRIM(b.BoardName), ''), 'Board of Intermediate Education, Andhra Pradesh (BIEAP)') AS Hydrated_BoardName,
        COALESCE(NULLIF(TRIM(sec.SectionName), ''), 'A') AS Hydrated_SectionName,
        COALESCE(s.DateOfBirth, sa.DateOfBirth) AS Hydrated_Dob,
        COALESCE(s.Gender, sa.Gender, '') AS Hydrated_Gender,
        COALESCE(s.BloodGroup, sa.BloodGroup, 'O+') AS Hydrated_BloodGroup,
        COALESCE(s.MobileNumber, sa.StudentMobileNumber, '') AS Hydrated_Mobile,
        COALESCE(s.Medium, sa.Medium, 'English') AS Hydrated_Medium,
        COALESCE(s.AdmissionDate, sa.AdmissionDate) AS Hydrated_AdmissionDate,
        COALESCE(s.Nationality, sa.Nationality, 'Indian') AS Hydrated_Nationality,
        COALESCE(s.Religion, sa.Religion, 'Hindu') AS Hydrated_Religion,
        COALESCE(s.Category, sa.Category, 'General') AS Hydrated_Caste
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo = c.AdmissionNo) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo = c.AdmissionNo)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(s.GroupId, sa.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(s.AcademicYearId, sa.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(s.AcademicLevelId, sa.AcademicLevelId)
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Boards` b ON b.BoardId = COALESCE(s.BoardId, sa.BoardId)
    WHERE c.Id = p_CertificateId
    LIMIT 1;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 5. sp_GetTemplateForCertificate
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTemplateForCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_GetTemplateForCertificate`(
    IN p_ShortCode VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CodeGuess VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CanonicalType VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_RawType VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT * FROM `templates` 
    WHERE IsActive = 1 
      AND (
        TemplateCode = p_ShortCode
        OR TemplateCode = p_CodeGuess
        OR LOWER(TemplateCode) = LOWER(p_RawType)
        OR LOWER(Title) = LOWER(p_CanonicalType)
        OR LOWER(Title) = LOWER(p_RawType)
        OR (LOWER(Title) LIKE CONCAT('%', LOWER(p_RawType), '%') AND TemplateCode NOT IN ('BONAFIDE_TSBIE', 'BONAFIDE_BIEAP', 'STUDY_CONDUCT_CERT', 'TRANSFER_CERTIFICATE'))
      )
    ORDER BY 
      CASE 
        WHEN TemplateCode = p_ShortCode THEN 1
        WHEN TemplateCode = p_CodeGuess THEN 2
        WHEN LOWER(Title) = LOWER(p_CanonicalType) THEN 3
        WHEN LOWER(Title) = LOWER(p_RawType) THEN 4
        WHEN LOWER(TemplateCode) = LOWER(p_RawType) THEN 5
        ELSE 6
      END ASC,
      Id DESC 
    LIMIT 1;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 6. sp_GetCertificateWorkflowStats
-- ----------------------------------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------------------------------
-- 7. sp_GetStudentsForCertificateDropdown
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStudentsForCertificateDropdown`;
DELIMITER //
CREATE PROCEDURE `sp_GetStudentsForCertificateDropdown`()
BEGIN
    SELECT 
        StudentId, AdmissionNo, RollNo, StudentName, GroupName, AcademicYear, AcademicLevel, Section
    FROM (
        SELECT 
            s.StudentId AS StudentId,
            COALESCE(NULLIF(s.AdmissionNo, ''), CONCAT('ADM-', s.StudentId)) AS AdmissionNo,
            COALESCE(s.RollNo, '') AS RollNo,
            COALESCE(NULLIF(s.StudentName, ''), 'Student') AS StudentName,
            COALESCE(g.GroupName, '') AS GroupName,
            COALESCE(ay.AcademicYearName, '') AS AcademicYear,
            COALESCE(al.LevelName, '1st Year') AS AcademicLevel,
            COALESCE(sec.SectionName, '') AS Section,
            COALESCE(s.IsActive, 1) AS IsActive
        FROM `Students` s
        LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
        LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
        LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
        LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId

        UNION ALL

        SELECT 
            sa.AdmissionId AS StudentId,
            COALESCE(NULLIF(sa.AdmissionNo, ''), CONCAT('ADM-', sa.AdmissionId)) AS AdmissionNo,
            '' AS RollNo,
            TRIM(CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, ''))) AS StudentName,
            COALESCE(g.GroupName, '') AS GroupName,
            COALESCE(ay.AcademicYearName, '') AS AcademicYear,
            '1st Year' AS AcademicLevel,
            '' AS Section,
            COALESCE(sa.IsActive, 1) AS IsActive
        FROM `StudentAdmissions` sa
        LEFT JOIN `Groups` g ON g.GroupId = sa.GroupId
        LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = sa.AcademicYearId
        WHERE NOT EXISTS (SELECT 1 FROM `Students` s2 WHERE s2.AdmissionNo = sa.AdmissionNo AND sa.AdmissionNo IS NOT NULL AND sa.AdmissionNo <> '')
    ) combined
    WHERE IsActive = 1
    ORDER BY StudentName ASC;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 8. sp_GenerateCertificate
-- ----------------------------------------------------------------------------------------------------
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

    -- Lookup student details
    SELECT 
        COALESCE(s.StudentId, sa.AdmissionId, 0),
        COALESCE(NULLIF(TRIM(CONCAT(sa.FirstName, ' ', COALESCE(sa.LastName, ''))), ''), s.StudentName, p_AdmissionNo),
        COALESCE(g.GroupName, ''),
        COALESCE(al.LevelName, '1st Year'),
        COALESCE(ay.AcademicYearName, CONCAT(YEAR(CURDATE()), '-', YEAR(CURDATE()) + 1))
    INTO
        v_StudentId,
        v_StudentName,
        v_GroupName,
        v_AcademicLevel,
        v_AcademicYear
    FROM `Students` s
    LEFT JOIN `StudentAdmissions` sa ON (TRIM(sa.AdmissionNo) = TRIM(s.AdmissionNo) OR sa.AdmissionId = s.StudentId)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
    WHERE TRIM(s.AdmissionNo) = TRIM(p_AdmissionNo) OR TRIM(sa.AdmissionNo) = TRIM(p_AdmissionNo)
    LIMIT 1;

    IF v_StudentId IS NULL OR v_StudentId = 0 THEN
        SELECT 
            sa.AdmissionId,
            COALESCE(NULLIF(TRIM(CONCAT(sa.FirstName, ' ', COALESCE(sa.LastName, ''))), ''), p_AdmissionNo),
            COALESCE(g.GroupName, ''),
            '1st Year',
            COALESCE(ay.AcademicYearName, CONCAT(YEAR(CURDATE()), '-', YEAR(CURDATE()) + 1))
        INTO
            v_StudentId,
            v_StudentName,
            v_GroupName,
            v_AcademicLevel,
            v_AcademicYear
        FROM `StudentAdmissions` sa
        LEFT JOIN `Groups` g ON g.GroupId = sa.GroupId
        LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = sa.AcademicYearId
        WHERE TRIM(sa.AdmissionNo) = TRIM(p_AdmissionNo)
        LIMIT 1;
    END IF;

    IF v_StudentId IS NULL THEN
        SET v_StudentId = 1;
        SET v_StudentName = p_AdmissionNo;
        SET v_GroupName = '';
        SET v_AcademicLevel = '1st Year';
        SET v_AcademicYear = CONCAT(YEAR(CURDATE()), '-', YEAR(CURDATE()) + 1);
    END IF;

    SET v_Prefix = CASE 
        WHEN p_CertificateType LIKE '%Bonafide%' THEN 'BON'
        WHEN p_CertificateType LIKE '%Study%' THEN 'STU'
        WHEN p_CertificateType LIKE '%Conduct%' THEN 'CND'
        WHEN p_CertificateType LIKE '%Transfer%' OR p_CertificateType LIKE '%TC%' THEN 'TC'
        WHEN p_CertificateType LIKE '%Migration%' THEN 'MIG'
        WHEN p_CertificateType LIKE '%Pass%' THEN 'IPC'
        WHEN p_CertificateType LIKE '%Fee%' THEN 'FEE'
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

-- ----------------------------------------------------------------------------------------------------
-- 9. sp_MoveCertificateStatus
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_MoveCertificateStatus`;
DELIMITER //
CREATE PROCEDURE `sp_MoveCertificateStatus`(
    IN p_CertificateId INT,
    IN p_NewStatus VARCHAR(50),
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

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 10. sp_BulkReviewCertificates
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_BulkReviewCertificates`;
DELIMITER //
CREATE PROCEDURE `sp_BulkReviewCertificates`(
    IN p_ReviewedBy VARCHAR(150)
)
BEGIN
    UPDATE `certificates`
    SET `Status` = 'Reviewed',
        `ReviewedAt` = NOW(),
        `UpdatedAt` = NOW()
    WHERE `Status` IN ('Generated', 'Requested', 'Pending', 'Active');

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 11. sp_BulkApproveCertificates
-- ----------------------------------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------------------------------
-- 12. sp_BulkIssueCertificates
-- ----------------------------------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------------------------------
-- 13. sp_CancelCertificate
-- ----------------------------------------------------------------------------------------------------
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

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 14. sp_DeleteCertificate
-- ----------------------------------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------------------------------
-- 15. sp_VerifyCertificate
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_VerifyCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_VerifyCertificate`(
    IN p_CertificateNumber VARCHAR(100)
)
BEGIN
    CALL sp_GetCertificateByCertificateNo(p_CertificateNumber);
END //
DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 16. sp_GetCertificateHistory
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetCertificateHistory`;
DELIMITER //
CREATE PROCEDURE `sp_GetCertificateHistory`(
    IN p_AdmissionNo VARCHAR(100)
)
BEGIN
    CALL sp_GetCertificates(p_AdmissionNo, 'All', 'All');
END //
DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 17. sp_GetBulkEligibleStudentsForCertificates
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetBulkEligibleStudentsForCertificates`;
DELIMITER //
CREATE PROCEDURE `sp_GetBulkEligibleStudentsForCertificates`(
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_Search VARCHAR(150)
)
BEGIN
    SELECT 
        StudentId, AdmissionNo, RollNo, StudentName, GroupName, SectionName, AcademicYear, BoardName
    FROM (
        SELECT 
            s.StudentId AS StudentId,
            COALESCE(NULLIF(s.AdmissionNo, ''), CONCAT('ADM-', s.StudentId)) AS AdmissionNo,
            COALESCE(s.RollNo, '') AS RollNo,
            COALESCE(NULLIF(s.StudentName, ''), 'Student') AS StudentName,
            COALESCE(g.GroupName, '') AS GroupName,
            COALESCE(sec.SectionName, '') AS SectionName,
            COALESCE(ay.AcademicYearName, '') AS AcademicYear,
            COALESCE(b.BoardName, '') AS BoardName,
            s.AcademicYearId,
            s.BoardId,
            s.GroupId,
            s.SectionId,
            COALESCE(s.IsActive, 1) AS IsActive
        FROM `Students` s
        LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
        LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
        LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
        LEFT JOIN `Boards` b ON b.BoardId = s.BoardId

        UNION ALL

        SELECT 
            sa.AdmissionId AS StudentId,
            COALESCE(NULLIF(sa.AdmissionNo, ''), CONCAT('ADM-', sa.AdmissionId)) AS AdmissionNo,
            '' AS RollNo,
            TRIM(CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, ''))) AS StudentName,
            COALESCE(g.GroupName, '') AS GroupName,
            '' AS SectionName,
            COALESCE(ay.AcademicYearName, '') AS AcademicYear,
            COALESCE(b.BoardName, '') AS BoardName,
            sa.AcademicYearId,
            sa.BoardId,
            sa.GroupId,
            CAST(NULL AS SIGNED) AS SectionId,
            COALESCE(sa.IsActive, 1) AS IsActive
        FROM `StudentAdmissions` sa
        LEFT JOIN `Groups` g ON g.GroupId = sa.GroupId
        LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = sa.AcademicYearId
        LEFT JOIN `Boards` b ON b.BoardId = sa.BoardId
        WHERE NOT EXISTS (SELECT 1 FROM `Students` s2 WHERE s2.AdmissionNo = sa.AdmissionNo AND sa.AdmissionNo IS NOT NULL AND sa.AdmissionNo <> '')
    ) combined
    WHERE IsActive = 1
      AND (p_AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR BoardId = p_BoardId)
      AND (p_GroupId IS NULL OR GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR SectionId = p_SectionId)
      AND (
          p_Search IS NULL OR p_Search = '' OR
          AdmissionNo LIKE CONCAT('%', p_Search, '%') OR
          StudentName LIKE CONCAT('%', p_Search, '%') OR
          RollNo LIKE CONCAT('%', p_Search, '%')
      )
    ORDER BY StudentName ASC;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 18. sp_UpdateCertificateByAdmissionNo
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateCertificateByAdmissionNo`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateCertificateByAdmissionNo`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_CertificateType VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `certificates`
    SET 
        CertificateType = COALESCE(NULLIF(p_CertificateType, ''), CertificateType),
        Purpose = COALESCE(NULLIF(p_Purpose, ''), Purpose),
        IssueDate = COALESCE(p_IssueDate, IssueDate),
        Remarks = p_Remarks,
        UpdatedAt = NOW()
    WHERE StudentId = (SELECT StudentId FROM `Students` WHERE TRIM(AdmissionNo) = TRIM(p_AdmissionNo) LIMIT 1)
       OR TRIM(AdmissionNo) = TRIM(p_AdmissionNo)
    ORDER BY Id DESC
    LIMIT 1;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;
