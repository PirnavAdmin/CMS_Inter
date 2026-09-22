DROP PROCEDURE IF EXISTS sp_PromoteStudents;
CREATE PROCEDURE sp_PromoteStudents
(
    IN p_StudentIds JSON,
    IN p_ToAcademicYearId INT,
    IN p_ToAcademicLevel VARCHAR(50),
    IN p_ToSection VARCHAR(50),
    IN p_Remarks VARCHAR(500)
)
BEGIN
    DECLARE v_Count INT DEFAULT 0;
    DECLARE v_StartedAt DATETIME(6);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        DROP TEMPORARY TABLE IF EXISTS tmp_promotion_students;
        RESIGNAL;
    END;

    IF p_StudentIds IS NULL OR JSON_VALID(p_StudentIds) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'StudentIds must be a valid JSON array';
    END IF;

    IF p_ToAcademicYearId IS NULL OR p_ToAcademicYearId <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Target academic year is required';
    END IF;

    IF p_ToAcademicLevel IS NULL OR TRIM(p_ToAcademicLevel) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Target academic level is required';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM AcademicYears WHERE AcademicYearId = p_ToAcademicYearId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Target academic year not found';
    END IF;

    CREATE TEMPORARY TABLE tmp_promotion_students
    (
        StudentId INT PRIMARY KEY
    );

    INSERT INTO tmp_promotion_students(StudentId)
    SELECT DISTINCT StudentId
    FROM JSON_TABLE(
        p_StudentIds,
        '$[*]' COLUMNS(StudentId INT PATH '$')
    ) AS jt
    WHERE StudentId IS NOT NULL AND StudentId > 0;

    SELECT COUNT(*) INTO v_Count FROM tmp_promotion_students;

    IF v_Count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'At least one valid student ID is required';
    END IF;

    IF v_Count <> JSON_LENGTH(p_StudentIds) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'StudentIds contains an invalid or duplicate value';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM tmp_promotion_students t
        LEFT JOIN Students s ON s.StudentId = t.StudentId
        WHERE s.StudentId IS NULL OR s.IsActive = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'One or more students were not found or are inactive';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM Students s
        INNER JOIN tmp_promotion_students t ON t.StudentId = s.StudentId
        WHERE s.AcademicYearId = p_ToAcademicYearId
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A student cannot be promoted to the same academic year';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM Students s
        INNER JOIN tmp_promotion_students t ON t.StudentId = s.StudentId
        WHERE NOT EXISTS
        (
            SELECT 1 FROM Results r
            WHERE r.StudentId = s.StudentId
              AND r.AcademicYearId = s.AcademicYearId
              AND r.IsPublished = 1
        )
        OR EXISTS
        (
            SELECT 1 FROM Results r
            WHERE r.StudentId = s.StudentId
              AND r.AcademicYearId = s.AcademicYearId
              AND r.IsPublished = 1
              AND UPPER(TRIM(r.ResultStatus)) IN ('FAIL', 'FAILED', 'F')
        )
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'One or more students are not eligible for promotion';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM PromotionHistories ph
        INNER JOIN tmp_promotion_students t ON t.StudentId = ph.StudentId
        WHERE ph.IsRolledBack = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'One or more students already have an active promotion';
    END IF;

    IF p_ToSection IS NOT NULL AND TRIM(p_ToSection) <> '' AND EXISTS
    (
        SELECT 1
        FROM tmp_promotion_students t
        INNER JOIN Students s ON s.StudentId = t.StudentId
        LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
        WHERE NOT EXISTS
        (
            SELECT 1
            FROM Sections sec
            WHERE sec.AcademicYearId = p_ToAcademicYearId
              AND sec.IsActive = 1
              AND sec.SectionName = TRIM(p_ToSection)
              AND sec.Group = g.GroupName
              AND sec.AcademicLevel = TRIM(p_ToAcademicLevel)
        )
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Target section is not valid for one or more students';
    END IF;

    START TRANSACTION;
    SET v_StartedAt = UTC_TIMESTAMP(6);

    INSERT INTO PromotionHistories
    (
        StudentId,
        FromAcademicYearId,
        ToAcademicYearId,
        FromAcademicLevel,
        ToAcademicLevel,
        FromGroupId,
        ToGroupId,
        FromSection,
        ToSection,
        PromotionDate,
        Status,
        IsRolledBack,
        Remarks,
        CreatedAt
    )
    SELECT
        s.StudentId,
        s.AcademicYearId,
        p_ToAcademicYearId,
        s.AcademicLevel,
        TRIM(p_ToAcademicLevel),
        s.GroupId,
        s.GroupId,
        s.Section,
        CASE WHEN p_ToSection IS NULL OR TRIM(p_ToSection) = '' THEN s.Section ELSE TRIM(p_ToSection) END,
        UTC_TIMESTAMP(),
        'Promoted',
        0,
        NULLIF(TRIM(p_Remarks), ''),
        UTC_TIMESTAMP(6)
    FROM Students s
    INNER JOIN tmp_promotion_students t ON t.StudentId = s.StudentId;

    UPDATE Students s
    INNER JOIN tmp_promotion_students t ON t.StudentId = s.StudentId
    SET
        s.AcademicYearId = p_ToAcademicYearId,
        s.AcademicLevel = TRIM(p_ToAcademicLevel),
        s.UpdatedAt = UTC_TIMESTAMP();

    SELECT
        ph.PromotionHistoryId,
        ph.StudentId,
        s.StudentName,
        s.AdmissionNo,
        ph.FromAcademicYearId,
        fay.AcademicYearName AS FromAcademicYearName,
        ph.ToAcademicYearId,
        tay.AcademicYearName AS ToAcademicYearName,
        ph.FromAcademicLevel,
        ph.ToAcademicLevel,
        ph.FromGroupId,
        fg.GroupName AS FromGroupName,
        ph.ToGroupId,
        tg.GroupName AS ToGroupName,
        ph.FromSection,
        ph.ToSection,
        ph.PromotionDate,
        ph.Status,
        ph.IsRolledBack,
        ph.RolledBackAt,
        ph.Remarks,
        ph.RollbackRemarks,
        ph.CreatedAt
    FROM PromotionHistories ph
    INNER JOIN Students s ON s.StudentId = ph.StudentId
    LEFT JOIN AcademicYears fay ON fay.AcademicYearId = ph.FromAcademicYearId
    LEFT JOIN AcademicYears tay ON tay.AcademicYearId = ph.ToAcademicYearId
    LEFT JOIN `Groups` fg ON fg.GroupId = ph.FromGroupId
    LEFT JOIN `Groups` tg ON tg.GroupId = ph.ToGroupId
    INNER JOIN tmp_promotion_students t ON t.StudentId = ph.StudentId
    WHERE ph.ToAcademicYearId = p_ToAcademicYearId
      AND ph.CreatedAt >= v_StartedAt
    ORDER BY ph.PromotionHistoryId;

    COMMIT;
    DROP TEMPORARY TABLE IF EXISTS tmp_promotion_students;
END;
