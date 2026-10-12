-- ============================================================================
-- Migration: 16_Align_sp_GenerateCertificate_And_CertificatesSchema.sql
-- Description: Aligns sp_GenerateCertificate and sp_GetCertificates with canonical
--              Students table, ensures CampusId and CertificateNumber are persisted,
--              and sets up CERTIFICATE_NO series in NumberSeriesConfigurations.
-- ============================================================================

-- 1. Ensure CERTIFICATE_NO exists in NumberSeriesConfigurations
INSERT INTO `NumberSeriesConfigurations` (
    `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, `IsActive`, `CampusId`, `CreatedAt`, `UpdatedAt`
)
SELECT 'CERTIFICATE_NO', 'Certificate Number', 'CERT', 'CERT-{YYYY}-{SEQ}', 4, 1, 0, 'Default sequence for certificate generation', 1, NULL, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM `NumberSeriesConfigurations` 
    WHERE `SeriesCode` = 'CERTIFICATE_NO' OR `SeriesCode` = 'CERTIFICATE_NUMBER'
);

-- 2. Drop and Recreate sp_GenerateCertificate
DROP PROCEDURE IF EXISTS `sp_GenerateCertificate`;

DELIMITER $$

CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GenerateCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_CertificateType VARCHAR(100),
    IN p_Purpose VARCHAR(250),
    IN p_RequestDate DATETIME,
    IN p_Remarks VARCHAR(1000),
    IN p_CertificateNo VARCHAR(50)
)
BEGIN
    DECLARE v_StudentId INT DEFAULT NULL;
    DECLARE v_CampusId INT DEFAULT NULL;
    DECLARE v_StudentName VARCHAR(150) DEFAULT NULL;
    DECLARE v_GroupName VARCHAR(100) DEFAULT NULL;
    DECLARE v_AcademicLevel VARCHAR(100) DEFAULT NULL;
    DECLARE v_AcademicYear VARCHAR(50) DEFAULT NULL;
    DECLARE v_NewId INT DEFAULT NULL;

    IF p_AdmissionNo IS NULL OR TRIM(p_AdmissionNo) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission number is required.';
    END IF;

    IF p_CertificateType IS NULL OR TRIM(p_CertificateType) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Certificate type is required.';
    END IF;
    
    IF p_CertificateNo IS NULL OR TRIM(p_CertificateNo) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Certificate No is required (Generate from Number Series first).';
    END IF;

    -- Lookup canonical student record from Students table
    SELECT 
        s.StudentId,
        s.CampusId,
        COALESCE(NULLIF(TRIM(s.StudentName), ''), TRIM(CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, ''))), p_AdmissionNo),
        COALESCE(g.GroupName, ''),
        COALESCE(al.LevelName, '1st Year'),
        COALESCE(ay.AcademicYearName, CONCAT(YEAR(CURDATE()), '-', YEAR(CURDATE()) + 1))
    INTO
        v_StudentId,
        v_CampusId,
        v_StudentName,
        v_GroupName,
        v_AcademicLevel,
        v_AcademicYear
    FROM `Students` s
    LEFT JOIN `StudentAdmissions` sa ON sa.AdmissionNo = s.AdmissionNo
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(s.GroupId, sa.GroupId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(s.AcademicLevelId, sa.AcademicLevelId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(s.AcademicYearId, sa.AcademicYearId)
    WHERE TRIM(s.AdmissionNo) = TRIM(p_AdmissionNo)
    LIMIT 1;
    
    IF v_StudentId IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Student record not found in Students table. Student must be enrolled before certificate generation.';
    END IF;

    INSERT INTO `certificates` (
        `CertificateNumber`,
        `StudentId`,
        `CertificateNo`,
        `CertificateType`,
        `Purpose`,
        `AdmissionNo`,
        `StudentName`,
        `GroupName`,
        `AcademicLevel`,
        `AcademicYear`,
        `RequestDate`,
        `IssueDate`,
        `Remarks`,
        `Status`,
        `CreatedAt`,
        `IsVerified`,
        `GeneratedAt`,
        `IsActive`,
        `CampusId`
    ) VALUES (
        p_CertificateNo,
        v_StudentId,
        p_CertificateNo,
        p_CertificateType,
        p_Purpose,
        TRIM(p_AdmissionNo),
        COALESCE(v_StudentName, p_AdmissionNo),
        v_GroupName,
        v_AcademicLevel,
        v_AcademicYear,
        COALESCE(p_RequestDate, NOW()),
        NOW(),
        p_Remarks,
        'Generated',
        NOW(),
        1,
        NOW(),
        1,
        COALESCE(v_CampusId, 1)
    );

    SET v_NewId = LAST_INSERT_ID();

    SELECT 
        c.Id AS CertificateId,
        c.Id,
        c.CertificateNumber,
        c.CertificateNo,
        c.StudentId,
        c.CampusId,
        camp.CampusName AS CampusName,
        c.AdmissionNo,
        c.StudentName,
        c.GroupName,
        c.AcademicLevel,
        c.AcademicYear,
        c.CertificateType,
        c.Purpose,
        c.RequestDate,
        c.IssueDate,
        c.Remarks,
        c.Status,
        c.GeneratedAt,
        c.ReviewedAt,
        c.ApprovedAt,
        c.IssuedAt,
        c.IssuedBy,
        c.IsActive,
        c.CreatedAt,
        c.UpdatedAt,
        s.StudentName AS S_StudentName,
        s.AdmissionNo AS S_AdmissionNo,
        s.RollNo AS S_RollNo,
        COALESCE(sa.FatherName, s.FatherName) AS S_FatherName,
        COALESCE(sa.MotherName, s.MotherName, 'Anita Devi') AS S_MotherName,
        COALESCE(sa.DateOfBirth, s.DateOfBirth) AS S_DateOfBirth,
        g.GroupName AS S_GroupName,
        ay.AcademicYearName AS S_AcademicYear,
        al.LevelName AS S_AcademicLevel,
        sec.SectionName AS S_SectionName,
        b.BoardName AS S_BoardName
    FROM `certificates` c
    JOIN `Students` s ON s.StudentId = c.StudentId
    LEFT JOIN `StudentAdmissions` sa ON sa.AdmissionNo = s.AdmissionNo
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(s.GroupId, sa.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(s.AcademicYearId, sa.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(s.AcademicLevelId, sa.AcademicLevelId)
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Boards` b ON b.BoardId = COALESCE(s.BoardId, sa.BoardId)
    LEFT JOIN `Campuses` camp ON camp.CampusId = c.CampusId
    WHERE c.Id = v_NewId;
END$$

DELIMITER ;

-- 3. Drop and Recreate sp_GetCertificates
DROP PROCEDURE IF EXISTS `sp_GetCertificates`;

DELIMITER $$

CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GetCertificates`(
    IN p_Search VARCHAR(150),
    IN p_Status VARCHAR(50),
    IN p_CertificateType VARCHAR(100)
)
BEGIN
    SELECT 
        c.Id AS CertificateId,
        COALESCE(NULLIF(c.CertificateNumber, ''), NULLIF(c.CertificateNo, ''), CONCAT('CERT-', c.Id)) AS CertificateNumber,
        c.StudentId,
        COALESCE(c.CampusId, s.CampusId, sa.CampusId) AS CampusId,
        camp.CampusName AS CampusName,
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
    LEFT JOIN `Campuses` camp ON camp.CampusId = COALESCE(c.CampusId, s.CampusId, sa.CampusId)
    WHERE c.Status != 'Deleted'
      AND (c.IsActive = 1 OR c.IsActive IS NULL OR p_Status = 'Cancelled' OR p_Status = 'All' OR p_Status IS NULL)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR p_Status = 'All Status' 
           OR c.Status = p_Status 
           OR (p_Status = 'Generated' AND c.Status = 'Active'))
      AND (p_CertificateType IS NULL OR p_CertificateType = '' OR p_CertificateType = 'All' OR c.CertificateType = p_CertificateType)
      AND (p_Search IS NULL OR p_Search = '' 
           OR c.CertificateNo LIKE CONCAT('%', p_Search, '%')
           OR c.CertificateNumber LIKE CONCAT('%', p_Search, '%')
           OR c.AdmissionNo LIKE CONCAT('%', p_Search, '%')
           OR sa.AdmissionNo LIKE CONCAT('%', p_Search, '%')
           OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%')
           OR c.StudentName LIKE CONCAT('%', p_Search, '%')
           OR s.StudentName LIKE CONCAT('%', p_Search, '%')
           OR CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, '')) LIKE CONCAT('%', p_Search, '%')
           OR c.CertificateType LIKE CONCAT('%', p_Search, '%')
           OR c.Purpose LIKE CONCAT('%', p_Search, '%'))
    GROUP BY c.Id
    ORDER BY c.Id DESC;
END$$

-- 4. Drop and Recreate sp_GetBulkEligibleStudentsForCertificates
DROP PROCEDURE IF EXISTS `sp_GetBulkEligibleStudentsForCertificates`;

CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GetBulkEligibleStudentsForCertificates`(
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_Search VARCHAR(150)
)
BEGIN
    SELECT 
        s.StudentId AS StudentId,
        s.AdmissionNo AS AdmissionNo,
        s.RollNo AS RollNo,
        COALESCE(NULLIF(s.StudentName, ''), 'Student') AS StudentName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(ay.AcademicYearName, '') AS AcademicYear,
        COALESCE(b.BoardName, '') AS BoardName
    FROM `Students` s
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    WHERE s.IsActive = 1
      AND (s.Status IS NULL OR s.Status = '' OR s.Status NOT IN ('Cancelled', 'Deleted', 'Inactive', 'Withdrawn'))
      AND s.SectionId IS NOT NULL AND s.SectionId > 0
      AND s.RollNo IS NOT NULL AND TRIM(s.RollNo) != ''
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
      AND (p_GroupId IS NULL OR s.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR s.SectionId = p_SectionId)
      AND (
          p_Search IS NULL OR p_Search = '' OR
          s.AdmissionNo LIKE CONCAT('%', p_Search, '%') OR
          s.StudentName LIKE CONCAT('%', p_Search, '%') OR
          s.RollNo LIKE CONCAT('%', p_Search, '%')
      )
    ORDER BY CAST(REGEXP_REPLACE(COALESCE(NULLIF(s.AdmissionNo, ''), '0'), '[^0-9]', '') AS UNSIGNED) ASC, s.AdmissionNo ASC;
END$$

DELIMITER ;
