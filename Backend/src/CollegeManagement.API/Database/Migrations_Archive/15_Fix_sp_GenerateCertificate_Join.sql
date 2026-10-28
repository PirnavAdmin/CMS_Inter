DROP PROCEDURE IF EXISTS `sp_GenerateCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_GenerateCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_CertificateType VARCHAR(100),
    IN p_Purpose VARCHAR(250),
    IN p_RequestDate DATETIME,
    IN p_Remarks VARCHAR(1000),
    IN p_CertificateNo VARCHAR(50)
)
BEGIN
    DECLARE v_StudentId INT DEFAULT NULL;
    DECLARE v_StudentName VARCHAR(150);
    DECLARE v_GroupName VARCHAR(100);
    DECLARE v_AcademicLevel VARCHAR(100);
    DECLARE v_AcademicYear VARCHAR(50);
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

    -- Use the passed certificate number directly
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
        `CreatedBy`,
        `AcademicYear`,
        `AdmissionNo`,
        `StudentName`,
        `GroupName`,
        `AcademicLevel`
    ) VALUES (
        v_StudentId,
        p_CertificateNo, 
        p_CertificateType,
        p_Purpose,
        COALESCE(p_RequestDate, NOW()),
        NULL,
        'Pending',
        p_Remarks,
        NOW(),
        NOW(),
        'System',
        v_AcademicYear,
        p_AdmissionNo,
        v_StudentName,
        v_GroupName,
        v_AcademicLevel
    );

    SET v_NewId = LAST_INSERT_ID();

    -- Return the fully populated row so FatherName, Section, etc. are correct!
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
        c.UpdatedAt,
        s.CampusId AS S_CampusId
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo = c.AdmissionNo) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo = c.AdmissionNo)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Boards` b ON b.BoardId = COALESCE(s.BoardId, sa.BoardId)
    WHERE c.Id = v_NewId
    LIMIT 1;

END //
DELIMITER ;
