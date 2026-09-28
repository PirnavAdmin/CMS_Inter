-- =========================================================================
-- MODULE: Certificates_SPs
-- Generated on: 2026-09-23T10:38:49.868Z
-- =========================================================================

USE `u819242402_CLM_System`;

DELIMITER //

DROP PROCEDURE IF EXISTS `sp_ApproveCertificate` //
CREATE PROCEDURE `sp_ApproveCertificate`(
    IN p_CertificateId INT
)
BEGIN
    CALL sp_MoveCertificateStatus(p_CertificateId, 'Approved', 'Admin');
END //

DROP PROCEDURE IF EXISTS `sp_CancelCertificate` //
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

DROP PROCEDURE IF EXISTS `sp_CreateCertificate` //
CREATE PROCEDURE `sp_CreateCertificate`(
    IN p_StudentId INT,
    IN p_CertificateNo VARCHAR(50),
    IN p_CertificateType VARCHAR(100),
    IN p_Purpose VARCHAR(250),
    IN p_AdmissionNo VARCHAR(50),
    IN p_StudentName VARCHAR(150),
    IN p_GroupName VARCHAR(100),
    IN p_AcademicLevel VARCHAR(100),
    IN p_AcademicYear VARCHAR(50),
    IN p_Remarks VARCHAR(1000),
    IN p_Status VARCHAR(30)
)
BEGIN
    INSERT INTO `certificates` (
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
        `GeneratedAt`
    ) VALUES (
        p_StudentId,
        p_CertificateNo,
        p_CertificateType,
        p_Purpose,
        p_AdmissionNo,
        p_StudentName,
        p_GroupName,
        p_AcademicLevel,
        p_AcademicYear,
        NOW(),
        NOW(),
        p_Remarks,
        COALESCE(p_Status, 'Generated'),
        NOW()
    );

    SELECT LAST_INSERT_ID() AS `CertificateId`;
END //

DROP PROCEDURE IF EXISTS `sp_GenerateBonafideCertificate` //
CREATE PROCEDURE `sp_GenerateBonafideCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    CALL sp_GenerateCertificate(p_AdmissionNo, 'Bonafide Certificate', p_Purpose, p_IssueDate, p_Remarks);
END //

DROP PROCEDURE IF EXISTS `sp_GenerateConductCertificate` //
CREATE PROCEDURE `sp_GenerateConductCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    CALL sp_GenerateCertificate(p_AdmissionNo, 'Conduct Certificate', p_Purpose, p_IssueDate, p_Remarks);
END //

DROP PROCEDURE IF EXISTS `sp_GenerateFeeCertificate` //
CREATE PROCEDURE `sp_GenerateFeeCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    CALL sp_GenerateCertificate(p_AdmissionNo, 'Fee Certificate', p_Purpose, p_IssueDate, p_Remarks);
END //

DROP PROCEDURE IF EXISTS `sp_GenerateStudyCertificate` //
CREATE PROCEDURE `sp_GenerateStudyCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    CALL sp_GenerateCertificate(p_AdmissionNo, 'Study Certificate', p_Purpose, p_IssueDate, p_Remarks);
END //

DROP PROCEDURE IF EXISTS `sp_GenerateTCCertificate` //
CREATE PROCEDURE `sp_GenerateTCCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    CALL sp_GenerateCertificate(p_AdmissionNo, 'Transfer Certificate', p_Purpose, p_IssueDate, p_Remarks);
END //

DROP PROCEDURE IF EXISTS `sp_GetBulkEligibleStudentsForCertificates` //
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

DROP PROCEDURE IF EXISTS `sp_GetCertificateById` //
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

DROP PROCEDURE IF EXISTS `sp_GetCertificatePreviewData` //
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

DROP PROCEDURE IF EXISTS `sp_GetCertificateWorkflowStats` //
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

DROP PROCEDURE IF EXISTS `sp_GetCertificates` //
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

DROP PROCEDURE IF EXISTS `sp_GetTemplateForCertificate` //
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

DROP PROCEDURE IF EXISTS `sp_IssueCertificate` //
CREATE PROCEDURE `sp_IssueCertificate`(
    IN p_CertificateId INT,
    IN p_IssuedBy VARCHAR(150)
)
BEGIN
    CALL sp_MoveCertificateStatus(p_CertificateId, 'Issued', p_IssuedBy);
END //

DROP PROCEDURE IF EXISTS `sp_ReissueCertificate` //
CREATE PROCEDURE `sp_ReissueCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_CertificateType VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_RequestDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN

    DECLARE v_StudentId INT DEFAULT NULL;
    DECLARE v_StudentName VARCHAR(150);
    DECLARE v_AcademicLevel VARCHAR(100);
    DECLARE v_AcademicYear VARCHAR(50);
    DECLARE v_GroupName VARCHAR(100);
    DECLARE v_CertificateNumber VARCHAR(40);
    DECLARE v_CertificateId INT DEFAULT NULL;

    -- =========================================================
    -- VALIDATE INPUT
    -- =========================================================

    IF p_AdmissionNo IS NULL
       OR TRIM(p_AdmissionNo) = '' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'AdmissionNo is required';

    END IF;

    IF p_CertificateType IS NULL
       OR TRIM(p_CertificateType) = '' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'CertificateType is required';

    END IF;


    -- =========================================================
    -- FIND STUDENT
    -- =========================================================

    SELECT
        StudentId,
        StudentName,
        AcademicLevel,
        CAST(AcademicYearId AS CHAR),
        NULL
    INTO
        v_StudentId,
        v_StudentName,
        v_AcademicLevel,
        v_AcademicYear,
        v_GroupName
    FROM Students
    WHERE TRIM(AdmissionNo) = TRIM(p_AdmissionNo)
      AND IsActive = 1
    LIMIT 1;


    -- =========================================================
    -- STUDENT NOT FOUND
    -- =========================================================

    IF v_StudentId IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Student with the given AdmissionNo was not found';

    END IF;


    -- =========================================================
    -- GENERATE NEW CERTIFICATE NUMBER
    -- =========================================================

    SET v_CertificateNumber =
        CASE LOWER(TRIM(p_CertificateType))

            WHEN 'bonafide' THEN
                CONCAT(
                    'BON-',
                    DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'),
                    '-',
                    v_StudentId
                )

            WHEN 'study' THEN
                CONCAT(
                    'STU-',
                    DATE_FORMAT(NOW(), '%Y%m%d'),
                    '-',
                    LPAD(FLOOR(RAND() * 1000000), 6, '0')
                )

            WHEN 'conduct' THEN
                CONCAT(
                    'CON-',
                    DATE_FORMAT(NOW(), '%Y%m%d'),
                    '-',
                    LPAD(FLOOR(RAND() * 1000000), 6, '0')
                )

            WHEN 'fee' THEN
                CONCAT(
                    'FEE-',
                    DATE_FORMAT(NOW(), '%Y%m%d'),
                    '-',
                    LPAD(FLOOR(RAND() * 1000000), 6, '0')
                )

            WHEN 'tc' THEN
                CONCAT(
                    'TC-',
                    DATE_FORMAT(NOW(), '%Y%m%d'),
                    '-',
                    LPAD(FLOOR(RAND() * 1000000), 6, '0')
                )

            ELSE
                CONCAT(
                    'CER-',
                    DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'),
                    '-',
                    v_StudentId
                )

        END;


    -- =========================================================
    -- INSERT NEW REISSUED CERTIFICATE
    -- =========================================================

    INSERT INTO Certificates
    (
        CertificateNumber,
        StudentId,
        AdmissionNo,
        StudentName,
        GroupName,
        AcademicLevel,
        AcademicYear,
        CertificateType,
        Purpose,
        RequestDate,
        Remarks,
        Status,
        GeneratedAt,
        IsActive
    )
    VALUES
    (
        v_CertificateNumber,
        v_StudentId,
        p_AdmissionNo,
        v_StudentName,
        v_GroupName,
        v_AcademicLevel,
        v_AcademicYear,
        p_CertificateType,
        COALESCE(
            NULLIF(TRIM(p_Purpose), ''),
            'Certificate Reissue'
        ),
        COALESCE(p_RequestDate, NOW()),
        NULLIF(TRIM(p_Remarks), ''),
        'Generated',
        NOW(),
        1
    );


    SET v_CertificateId = LAST_INSERT_ID();


    -- =========================================================
    -- RETURN NEW CERTIFICATE
    -- =========================================================

    SELECT
        c.CertificateId AS Id,
        c.CertificateNumber AS CertificateNo,
        c.StudentId,
        c.AdmissionNo,
        c.StudentName,
        c.AcademicLevel,
        c.AcademicYear,
        c.CertificateType,
        c.Purpose,
        c.RequestDate,
        c.RequestDate AS IssueDate,
        c.Remarks,
        c.Status,
        c.GeneratedAt,
        c.ReviewedAt,
        c.ApprovedAt,
        c.IssuedAt,
        c.IssuedBy,
        c.IsActive
    FROM Certificates c
    WHERE c.CertificateId = v_CertificateId;

END //

DROP PROCEDURE IF EXISTS `sp_ReviewCertificate` //
CREATE PROCEDURE `sp_ReviewCertificate`(
    IN p_CertificateId INT
)
BEGIN
    CALL sp_MoveCertificateStatus(p_CertificateId, 'Reviewed', 'Admin');
END //

DROP PROCEDURE IF EXISTS `sp_UpdateCertificate` //
CREATE PROCEDURE `sp_UpdateCertificate`(
    IN p_CertificateId INT,
    IN p_AdmissionNo VARCHAR(30),
    IN p_CertificateType VARCHAR(100),
    IN p_Purpose VARCHAR(250),
    IN p_Remarks VARCHAR(1000)
)
BEGIN

    DECLARE v_Exists INT DEFAULT 0;

    /* =========================================================
       CHECK CERTIFICATE EXISTS
       ========================================================= */

    SELECT COUNT(*)
    INTO v_Exists
    FROM Certificates
    WHERE CertificateId = p_CertificateId;

    IF v_Exists = 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Certificate not found';

    END IF;


    /* =========================================================
       UPDATE CERTIFICATE
       ========================================================= */

    UPDATE Certificates
    SET
        AdmissionNo = p_AdmissionNo,
        CertificateType = p_CertificateType,
        Purpose = p_Purpose,
        Remarks = p_Remarks
    WHERE CertificateId = p_CertificateId;


    /* =========================================================
       RETURN UPDATED CERTIFICATE
       IMPORTANT:
       GroupName comes ONLY from Certificates
       ========================================================= */

    SELECT
        c.CertificateId,
        c.CertificateNumber,
        c.StudentId,
        c.AdmissionNo,
        c.StudentName,
        c.GroupName,
        c.AcademicLevel,
        c.AcademicYear,
        c.CertificateType,
        c.Purpose,
        c.RequestDate,
        c.Remarks,
        c.Status,
        c.GeneratedAt,
        c.ReviewedAt,
        c.ApprovedAt,
        c.IssuedAt,
        c.IssuedBy,
        c.IsActive
    FROM Certificates c
    WHERE c.CertificateId = p_CertificateId
    LIMIT 1;

END //

DROP PROCEDURE IF EXISTS `sp_UpdateCertificateByAdmissionNo` //
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

DROP PROCEDURE IF EXISTS `sp_UpdateCertificateStatus` //
CREATE PROCEDURE `sp_UpdateCertificateStatus`(
    IN p_Id INT,
    IN p_Status VARCHAR(30),
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `certificates`
    SET 
        `Status` = p_Status,
        `Remarks` = COALESCE(p_Remarks, `Remarks`),
        `ReviewedAt` = CASE WHEN p_Status = 'UnderReview' THEN NOW() ELSE `ReviewedAt` END,
        `ApprovedAt` = CASE WHEN p_Status = 'Approved' THEN NOW() ELSE `ApprovedAt` END,
        `IssuedAt` = CASE WHEN p_Status = 'Issued' THEN NOW() ELSE `IssuedAt` END
    WHERE `Id` = p_Id;

    SELECT ROW_COUNT() AS `RowsAffected`;
END //

DROP PROCEDURE IF EXISTS `sp_VerifyCertificate` //
CREATE PROCEDURE `sp_VerifyCertificate`(
    IN p_CertificateNumber VARCHAR(100)
)
BEGIN
    CALL sp_GetCertificateByCertificateNo(p_CertificateNumber);
END //

DELIMITER ;
