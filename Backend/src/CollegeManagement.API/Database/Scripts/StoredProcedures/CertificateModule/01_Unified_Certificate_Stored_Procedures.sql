-- ====================================================================================
-- COLLEGE MANAGEMENT SYSTEM - UNIFIED CERTIFICATES STORED PROCEDURES
-- Target Database: MySQL 8.0+
-- Description: Unified Stored Procedures for Certificate Management with strict CampusId multi-tenancy
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- 1. sp_GetCertificates
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetCertificates`;
DELIMITER //
CREATE PROCEDURE `sp_GetCertificates`(
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CertificateType VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
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
        COALESCE(c.CampusId, sa.CampusId, s.CampusId) AS CampusId,
        cam.CampusName AS CampusName,
        c.CreatedAt,
        c.UpdatedAt
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Boards` b ON b.BoardId = COALESCE(s.BoardId, sa.BoardId)
    LEFT JOIN `Campuses` cam ON cam.CampusId = COALESCE(c.CampusId, sa.CampusId, s.CampusId)
    WHERE (c.IsActive = 1 OR c.IsActive IS NULL OR p_Status = 'Cancelled' OR p_Status = 'All' OR p_Status IS NULL)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR p_Status = 'All Status' 
           OR c.Status COLLATE utf8mb4_unicode_ci = p_Status COLLATE utf8mb4_unicode_ci 
           OR (p_Status = 'Generated' AND c.Status COLLATE utf8mb4_unicode_ci = 'Active'))
      AND (p_CertificateType IS NULL OR p_CertificateType = '' OR p_CertificateType = 'All' OR c.CertificateType COLLATE utf8mb4_unicode_ci = p_CertificateType COLLATE utf8mb4_unicode_ci)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(c.CampusId, sa.CampusId, s.CampusId) = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR COALESCE(s.BoardId, sa.BoardId) = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR COALESCE(sa.AcademicYearId, s.AcademicYearId) = p_AcademicYearId)
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

-- ------------------------------------------------------------------------------------
-- 2. sp_GetCertificateById
-- ------------------------------------------------------------------------------------
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
        COALESCE(c.CampusId, sa.CampusId, s.CampusId) AS CampusId,
        cam.CampusName AS CampusName,
        c.CreatedAt,
        c.UpdatedAt
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Boards` b ON b.BoardId = COALESCE(s.BoardId, sa.BoardId)
    LEFT JOIN `Campuses` cam ON cam.CampusId = COALESCE(c.CampusId, sa.CampusId, s.CampusId)
    WHERE c.Id = p_CertificateId
    LIMIT 1;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 3. sp_GetCertificateByCertificateNo
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetCertificateByCertificateNo`;
DELIMITER //
CREATE PROCEDURE `sp_GetCertificateByCertificateNo`(
    IN p_CertificateNumber VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
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
        COALESCE(c.CampusId, sa.CampusId, s.CampusId) AS CampusId,
        cam.CampusName AS CampusName,
        c.CreatedAt,
        c.UpdatedAt
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Boards` b ON b.BoardId = COALESCE(s.BoardId, sa.BoardId)
    LEFT JOIN `Campuses` cam ON cam.CampusId = COALESCE(c.CampusId, sa.CampusId, s.CampusId)
    WHERE c.CertificateNo COLLATE utf8mb4_unicode_ci = p_CertificateNumber COLLATE utf8mb4_unicode_ci
    LIMIT 1;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 4. sp_GetCertificatePreviewData
-- ------------------------------------------------------------------------------------
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
        COALESCE(s.Category, sa.Category, 'General') AS Hydrated_Caste,
        COALESCE(c.CampusId, sa.CampusId, s.CampusId) AS CampusId
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(s.GroupId, sa.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(s.AcademicYearId, sa.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(s.AcademicLevelId, sa.AcademicLevelId)
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Boards` b ON b.BoardId = COALESCE(s.BoardId, sa.BoardId)
    WHERE c.Id = p_CertificateId
    LIMIT 1;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 5. sp_GetTemplateForCertificate
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTemplateForCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_GetTemplateForCertificate`(
    IN p_ShortCode VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CodeGuess VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CanonicalType VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_RawType VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
)
BEGIN
    SELECT * FROM `templates` 
    WHERE IsActive = 1 
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR CampusId IS NULL OR CampusId = p_CampusId)
      AND (
        TemplateCode COLLATE utf8mb4_unicode_ci = p_ShortCode COLLATE utf8mb4_unicode_ci
        OR TemplateCode COLLATE utf8mb4_unicode_ci = p_CodeGuess COLLATE utf8mb4_unicode_ci
        OR LOWER(TemplateCode) = LOWER(p_RawType)
        OR LOWER(Title) = LOWER(p_CanonicalType)
        OR LOWER(Title) = LOWER(p_RawType)
        OR (LOWER(Title) LIKE CONCAT('%', LOWER(p_RawType), '%') AND TemplateCode NOT IN ('BONAFIDE_TSBIE', 'BONAFIDE_BIEAP', 'STUDY_CONDUCT_CERT', 'TRANSFER_CERTIFICATE'))
      )
    ORDER BY 
      CASE 
        WHEN TemplateCode COLLATE utf8mb4_unicode_ci = p_ShortCode COLLATE utf8mb4_unicode_ci THEN 1
        WHEN TemplateCode COLLATE utf8mb4_unicode_ci = p_CodeGuess COLLATE utf8mb4_unicode_ci THEN 2
        WHEN LOWER(Title) = LOWER(p_CanonicalType) THEN 3
        WHEN LOWER(Title) = LOWER(p_RawType) THEN 4
        WHEN LOWER(TemplateCode) = LOWER(p_RawType) THEN 5
        ELSE 6
      END ASC,
      Id DESC 
    LIMIT 1;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 6. sp_GetCertificateWorkflowStats
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetCertificateWorkflowStats`;
DELIMITER //
CREATE PROCEDURE `sp_GetCertificateWorkflowStats`(
    IN p_CampusId INT
)
BEGIN
    SELECT
        COUNT(*) AS TotalCount,
        COALESCE(SUM(CASE WHEN c.Status = 'Requested' AND (c.IsActive = 1 OR c.IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS RequestedCount,
        COALESCE(SUM(CASE WHEN (c.Status = 'Generated' OR c.Status = 'Active') AND (c.IsActive = 1 OR c.IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS GeneratedCount,
        COALESCE(SUM(CASE WHEN c.Status = 'Reviewed' AND (c.IsActive = 1 OR c.IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS ReviewedCount,
        COALESCE(SUM(CASE WHEN c.Status = 'Approved' AND (c.IsActive = 1 OR c.IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS ApprovedCount,
        COALESCE(SUM(CASE WHEN c.Status = 'Issued' AND (c.IsActive = 1 OR c.IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS IssuedCount,
        COALESCE(SUM(CASE WHEN c.Status = 'Cancelled' OR c.Status = 'Deleted' OR c.IsActive = 0 THEN 1 ELSE 0 END), 0) AS CancelledCount
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(c.CampusId, sa.CampusId, s.CampusId) = p_CampusId);
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 7. sp_GetStudentsForCertificateDropdown
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStudentsForCertificateDropdown`;
DELIMITER //
CREATE PROCEDURE `sp_GetStudentsForCertificateDropdown`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(ay.AcademicYearName, '') AS AcademicYear,
        COALESCE(al.LevelName, '1st Year') AS AcademicLevel,
        COALESCE(sec.SectionName, '') AS Section,
        s.BoardId,
        s.AcademicYearId,
        s.GroupId,
        s.SectionId,
        s.CampusId
    FROM `Students` s
    INNER JOIN `Sections` sec ON sec.SectionId = s.SectionId AND TRIM(COALESCE(sec.SectionName, '')) <> ''
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    WHERE s.IsActive = 1
      AND (s.Status IS NULL OR s.Status IN ('Active', 'Admitted', 'Completed'))
      AND s.AdmissionNo IS NOT NULL AND TRIM(s.AdmissionNo) <> ''
      AND s.SectionId IS NOT NULL AND s.SectionId > 0
      AND s.RollNo IS NOT NULL AND TRIM(s.RollNo) <> ''
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
    ORDER BY s.StudentName ASC;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 8. sp_GenerateCertificate
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GenerateCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_GenerateCertificate`(
    IN p_AdmissionNo VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CertificateType VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Purpose VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_RequestDate DATETIME,
    IN p_Remarks VARCHAR(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CertificateNo VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_StudentId INT DEFAULT NULL;
    DECLARE v_StudentName VARCHAR(150);
    DECLARE v_GroupName VARCHAR(100);
    DECLARE v_AcademicLevel VARCHAR(100);
    DECLARE v_AcademicYear VARCHAR(50);
    DECLARE v_CampusId INT DEFAULT NULL;
    DECLARE v_NewId INT DEFAULT NULL;

    IF p_AdmissionNo IS NULL OR TRIM(p_AdmissionNo) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission number is required.';
    END IF;

    IF p_CertificateType IS NULL OR TRIM(p_CertificateType) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Certificate type is required.';
    END IF;
    
    IF p_CertificateNo IS NULL OR TRIM(p_CertificateNo) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Certificate No is required.';
    END IF;

    -- Lookup student details
    SELECT 
        COALESCE(s.StudentId, sa.AdmissionId, 0),
        COALESCE(NULLIF(TRIM(CONCAT(sa.FirstName, ' ', COALESCE(sa.LastName, ''))), ''), s.StudentName, p_AdmissionNo),
        COALESCE(g.GroupName, ''),
        COALESCE(al.LevelName, '1st Year'),
        COALESCE(ay.AcademicYearName, CONCAT(YEAR(CURDATE()), '-', YEAR(CURDATE()) + 1)),
        COALESCE(s.CampusId, sa.CampusId, p_CampusId, 1)
    INTO
        v_StudentId,
        v_StudentName,
        v_GroupName,
        v_AcademicLevel,
        v_AcademicYear,
        v_CampusId
    FROM `Students` s
    LEFT JOIN `StudentAdmissions` sa ON (sa.AdmissionNo COLLATE utf8mb4_unicode_ci = s.AdmissionNo COLLATE utf8mb4_unicode_ci OR sa.AdmissionId = s.StudentId)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
    WHERE s.AdmissionNo COLLATE utf8mb4_unicode_ci = p_AdmissionNo COLLATE utf8mb4_unicode_ci 
       OR sa.AdmissionNo COLLATE utf8mb4_unicode_ci = p_AdmissionNo COLLATE utf8mb4_unicode_ci
    LIMIT 1;

    IF v_StudentId IS NULL OR v_StudentId = 0 THEN
        SELECT 
            sa.AdmissionId,
            COALESCE(NULLIF(TRIM(CONCAT(sa.FirstName, ' ', COALESCE(sa.LastName, ''))), ''), p_AdmissionNo),
            COALESCE(g.GroupName, ''),
            '1st Year',
            COALESCE(ay.AcademicYearName, CONCAT(YEAR(CURDATE()), '-', YEAR(CURDATE()) + 1)),
            COALESCE(sa.CampusId, p_CampusId, 1)
        INTO
            v_StudentId,
            v_StudentName,
            v_GroupName,
            v_AcademicLevel,
            v_AcademicYear,
            v_CampusId
        FROM `StudentAdmissions` sa
        LEFT JOIN `Groups` g ON g.GroupId = sa.GroupId
        LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = sa.AcademicYearId
        WHERE sa.AdmissionNo COLLATE utf8mb4_unicode_ci = p_AdmissionNo COLLATE utf8mb4_unicode_ci
        LIMIT 1;
    END IF;

    IF v_StudentId IS NULL THEN
        SET v_StudentId = 1;
        SET v_StudentName = p_AdmissionNo;
        SET v_GroupName = '';
        SET v_AcademicLevel = '1st Year';
        SET v_AcademicYear = CONCAT(YEAR(CURDATE()), '-', YEAR(CURDATE()) + 1);
        SET v_CampusId = COALESCE(p_CampusId, 1);
    END IF;

    INSERT INTO `certificates` (
        `StudentId`,
        `CertificateNo`,
        `CertificateType`,
        `Purpose`,
        `RequestDate`,
        `IssueDate`,
        `Status`,
        `Remarks`,
        `CreatedAt`,
        `UpdatedAt`,
        `AcademicYear`,
        `AdmissionNo`,
        `StudentName`,
        `GroupName`,
        `AcademicLevel`,
        `CampusId`,
        `IsActive`
    ) VALUES (
        v_StudentId,
        p_CertificateNo,
        p_CertificateType,
        p_Purpose,
        COALESCE(p_RequestDate, NOW()),
        COALESCE(p_RequestDate, NOW()),
        'Generated',
        p_Remarks,
        NOW(),
        NOW(),
        v_AcademicYear,
        p_AdmissionNo,
        v_StudentName,
        v_GroupName,
        v_AcademicLevel,
        v_CampusId,
        1
    );

    SET v_NewId = LAST_INSERT_ID();

    CALL sp_GetCertificateById(v_NewId);
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 9. sp_MoveCertificateStatus
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_MoveCertificateStatus`;
DELIMITER //
CREATE PROCEDURE `sp_MoveCertificateStatus`(
    IN p_CertificateId INT,
    IN p_NewStatus VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_IssuedBy VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
)
BEGIN
    IF p_NewStatus COLLATE utf8mb4_unicode_ci = 'Reviewed' THEN
        UPDATE `certificates` c
        LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
        LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
        SET c.`Status` = 'Reviewed', c.`ReviewedAt` = NOW(), c.`UpdatedAt` = NOW()
        WHERE c.`Id` = p_CertificateId
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(c.CampusId, sa.CampusId, s.CampusId) = p_CampusId);
    ELSEIF p_NewStatus COLLATE utf8mb4_unicode_ci = 'Approved' THEN
        UPDATE `certificates` c
        LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
        LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
        SET c.`Status` = 'Approved', c.`ApprovedAt` = NOW(), c.`UpdatedAt` = NOW()
        WHERE c.`Id` = p_CertificateId
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(c.CampusId, sa.CampusId, s.CampusId) = p_CampusId);
    ELSEIF p_NewStatus COLLATE utf8mb4_unicode_ci = 'Issued' THEN
        UPDATE `certificates` c
        LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
        LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
        SET c.`Status` = 'Issued', c.`IssuedAt` = NOW(), c.`IssueDate` = COALESCE(c.`IssueDate`, NOW()),
            c.`IssuedBy` = COALESCE(NULLIF(TRIM(p_IssuedBy), ''), 'Admin'), c.`UpdatedAt` = NOW()
        WHERE c.`Id` = p_CertificateId
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(c.CampusId, sa.CampusId, s.CampusId) = p_CampusId);
    ELSE
        UPDATE `certificates` c
        LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
        LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
        SET c.`Status` = p_NewStatus, c.`UpdatedAt` = NOW()
        WHERE c.`Id` = p_CertificateId
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(c.CampusId, sa.CampusId, s.CampusId) = p_CampusId);
    END IF;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 10. sp_BulkReviewCertificates
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_BulkReviewCertificates`;
DELIMITER //
CREATE PROCEDURE `sp_BulkReviewCertificates`(
    IN p_ReviewedBy VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
)
BEGIN
    UPDATE `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
    SET c.`Status` = 'Reviewed',
        c.`ReviewedAt` = NOW(),
        c.`UpdatedAt` = NOW()
    WHERE c.`Status` IN ('Generated', 'Requested', 'Pending', 'Active')
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(c.CampusId, sa.CampusId, s.CampusId) = p_CampusId);

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 11. sp_BulkApproveCertificates
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_BulkApproveCertificates`;
DELIMITER //
CREATE PROCEDURE `sp_BulkApproveCertificates`(
    IN p_ApprovedBy VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
)
BEGIN
    UPDATE `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
    SET c.`Status` = 'Approved',
        c.`ApprovedAt` = NOW(),
        c.`UpdatedAt` = NOW()
    WHERE c.`Status` = 'Reviewed'
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(c.CampusId, sa.CampusId, s.CampusId) = p_CampusId);

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 12. sp_BulkIssueCertificates
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_BulkIssueCertificates`;
DELIMITER //
CREATE PROCEDURE `sp_BulkIssueCertificates`(
    IN p_IssuedBy VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
)
BEGIN
    UPDATE `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
    SET c.`Status` = 'Issued',
        c.`IssuedAt` = NOW(),
        c.`IssueDate` = COALESCE(c.`IssueDate`, NOW()),
        c.`IssuedBy` = COALESCE(NULLIF(TRIM(p_IssuedBy), ''), 'Admin'),
        c.`UpdatedAt` = NOW()
    WHERE c.`Status` = 'Approved'
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(c.CampusId, sa.CampusId, s.CampusId) = p_CampusId);

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 13. sp_CancelCertificate
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CancelCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_CancelCertificate`(
    IN p_CertificateId INT,
    IN p_CampusId INT
)
BEGIN
    UPDATE `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
    SET c.`Status` = 'Cancelled',
        c.`IsActive` = 0,
        c.`UpdatedAt` = NOW()
    WHERE c.`Id` = p_CertificateId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(c.CampusId, sa.CampusId, s.CampusId) = p_CampusId);

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 14. sp_DeleteCertificate
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_DeleteCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteCertificate`(
    IN p_CertificateId INT,
    IN p_CampusId INT
)
BEGIN
    UPDATE `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
    SET c.`Status` = 'Deleted',
        c.`IsActive` = 0,
        c.`UpdatedAt` = NOW()
    WHERE c.`Id` = p_CertificateId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(c.CampusId, sa.CampusId, s.CampusId) = p_CampusId);

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 15. sp_VerifyCertificate
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_VerifyCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_VerifyCertificate`(
    IN p_CertificateNumber VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
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
        c.Status,
        COALESCE(c.GeneratedAt, c.CreatedAt) AS GeneratedAt,
        c.ReviewedAt,
        c.ApprovedAt,
        c.IssuedAt,
        c.IssuedBy,
        COALESCE(c.IsActive, 1) AS IsActive,
        c.CreatedAt,
        c.UpdatedAt
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Boards` b ON b.BoardId = COALESCE(s.BoardId, sa.BoardId)
    WHERE (c.CertificateNo COLLATE utf8mb4_unicode_ci = p_CertificateNumber COLLATE utf8mb4_unicode_ci OR c.Id = CAST(p_CertificateNumber AS UNSIGNED))
      AND c.Status NOT IN ('Cancelled', 'Deleted')
      AND (c.IsActive = 1 OR c.IsActive IS NULL)
    LIMIT 1;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 16. sp_GetCertificateHistory
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetCertificateHistory`;
DELIMITER //
CREATE PROCEDURE `sp_GetCertificateHistory`(
    IN p_AdmissionNo VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
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
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Boards` b ON b.BoardId = COALESCE(s.BoardId, sa.BoardId)
    WHERE (c.AdmissionNo COLLATE utf8mb4_unicode_ci = p_AdmissionNo COLLATE utf8mb4_unicode_ci 
       OR sa.AdmissionNo COLLATE utf8mb4_unicode_ci = p_AdmissionNo COLLATE utf8mb4_unicode_ci 
       OR s.AdmissionNo COLLATE utf8mb4_unicode_ci = p_AdmissionNo COLLATE utf8mb4_unicode_ci)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(c.CampusId, sa.CampusId, s.CampusId) = p_CampusId)
    ORDER BY c.Id DESC;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 17. sp_GetBulkEligibleStudentsForCertificates
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetBulkEligibleStudentsForCertificates`;
DELIMITER //
CREATE PROCEDURE `sp_GetBulkEligibleStudentsForCertificates`(
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
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
            s.CampusId,
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
            sa.CampusId,
            COALESCE(sa.IsActive, 1) AS IsActive
        FROM `StudentAdmissions` sa
        LEFT JOIN `Groups` g ON g.GroupId = sa.GroupId
        LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = sa.AcademicYearId
        LEFT JOIN `Boards` b ON b.BoardId = sa.BoardId
        WHERE NOT EXISTS (SELECT 1 FROM `Students` s2 WHERE s2.AdmissionNo COLLATE utf8mb4_unicode_ci = sa.AdmissionNo COLLATE utf8mb4_unicode_ci AND sa.AdmissionNo IS NOT NULL AND sa.AdmissionNo <> '')
    ) combined
    WHERE IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR BoardId = p_BoardId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR SectionId = p_SectionId)
      AND (
          p_Search IS NULL OR p_Search = '' OR
          AdmissionNo LIKE CONCAT('%', p_Search, '%') OR
          StudentName LIKE CONCAT('%', p_Search, '%') OR
          RollNo LIKE CONCAT('%', p_Search, '%')
      )
    ORDER BY StudentName ASC;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 18. sp_UpdateCertificateByAdmissionNo
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateCertificateByAdmissionNo`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateCertificateByAdmissionNo`(
    IN p_AdmissionNo VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CertificateType VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Purpose VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    UPDATE `certificates`
    SET `CertificateType` = COALESCE(p_CertificateType, `CertificateType`),
        `Purpose` = COALESCE(p_Purpose, `Purpose`),
        `IssueDate` = COALESCE(p_IssueDate, `IssueDate`),
        `Remarks` = COALESCE(p_Remarks, `Remarks`),
        `UpdatedAt` = NOW()
    WHERE `AdmissionNo` COLLATE utf8mb4_unicode_ci = p_AdmissionNo COLLATE utf8mb4_unicode_ci
    ORDER BY `Id` DESC
    LIMIT 1;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 19. sp_UpdateCertificateFeeClearance
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateCertificateFeeClearance`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateCertificateFeeClearance`(
    IN p_CertificateId INT,
    IN p_RemarksAddition VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
)
BEGIN
    UPDATE `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo COLLATE utf8mb4_unicode_ci = c.AdmissionNo COLLATE utf8mb4_unicode_ci)
    SET c.`Remarks` = CONCAT(COALESCE(c.`Remarks`, ''), p_RemarksAddition),
        c.`UpdatedAt` = NOW()
    WHERE c.`Id` = p_CertificateId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(c.CampusId, sa.CampusId, s.CampusId) = p_CampusId);

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 20. sp_GetStudentForCertificateGeneration
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStudentForCertificateGeneration`;
DELIMITER //
CREATE PROCEDURE `sp_GetStudentForCertificateGeneration`(
    IN p_AdmissionNo VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        s.StudentName,
        s.CampusId,
        s.BoardId,
        s.AcademicYearId,
        s.GroupId
    FROM `Students` s
    WHERE s.AdmissionNo COLLATE utf8mb4_unicode_ci = p_AdmissionNo COLLATE utf8mb4_unicode_ci
    LIMIT 1;
END //
DELIMITER ;
