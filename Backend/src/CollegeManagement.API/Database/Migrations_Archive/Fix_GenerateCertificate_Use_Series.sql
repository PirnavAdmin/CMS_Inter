-- This script updates the sp_GenerateCertificate to accept a pre-generated CertificateNo
-- instead of generating a random number using RAND().

DROP PROCEDURE IF EXISTS `sp_GenerateCertificate`;
DELIMITER //
CREATE PROCEDURE `sp_GenerateCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_CertificateType VARCHAR(100),
    IN p_Purpose VARCHAR(250),
    IN p_RequestDate DATETIME,
    IN p_Remarks VARCHAR(1000),
    IN p_CertificateNo VARCHAR(50) -- NEW PARAMETER: Passed from C# NumberSeriesService
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
        `AcademicYear`
    ) VALUES (
        v_StudentId,
        p_CertificateNo, -- Assigned here
        p_CertificateType,
        p_Purpose,
        COALESCE(p_RequestDate, NOW()),
        NULL,
        'Pending',
        p_Remarks,
        NOW(),
        NOW(),
        'System',
        v_AcademicYear
    );

    SET v_NewId = LAST_INSERT_ID();

    SELECT * FROM `certificates` WHERE `CertificateId` = v_NewId;

END //
DELIMITER ;
