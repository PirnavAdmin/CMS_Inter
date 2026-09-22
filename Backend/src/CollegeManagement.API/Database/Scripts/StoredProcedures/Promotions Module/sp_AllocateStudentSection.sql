DROP PROCEDURE IF EXISTS sp_AllocateStudentSection;
CREATE PROCEDURE sp_AllocateStudentSection
(  
    IN p_StudentIds JSON,
    IN p_AcademicYearId INT,
    IN p_SectionName VARCHAR(50)
)
BEGIN
    DECLARE v_Count INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        DROP TEMPORARY TABLE IF EXISTS tmp_section_students;
        RESIGNAL;
    END;

    IF p_StudentIds IS NULL OR JSON_VALID(p_StudentIds) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'StudentIds must be a valid JSON array';
    END IF;

    IF p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year is required';
    END IF;

    IF p_SectionName IS NULL OR TRIM(p_SectionName) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section name is required';
    END IF;

    CREATE TEMPORARY TABLE tmp_section_students(StudentId INT PRIMARY KEY);

    INSERT INTO tmp_section_students(StudentId)
    SELECT DISTINCT StudentId
    FROM JSON_TABLE(p_StudentIds, '$[*]' COLUMNS(StudentId INT PATH '$')) jt
    WHERE StudentId IS NOT NULL AND StudentId > 0;

    SELECT COUNT(*) INTO v_Count FROM tmp_section_students;

    IF v_Count = 0 OR v_Count <> JSON_LENGTH(p_StudentIds) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'At least one valid, unique student ID is required';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM tmp_section_students t
        LEFT JOIN Students s ON s.StudentId = t.StudentId
        WHERE s.StudentId IS NULL OR s.IsActive = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'One or more students were not found or are inactive';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM tmp_section_students t
        INNER JOIN Students s ON s.StudentId = t.StudentId
        LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
        WHERE s.AcademicYearId <> p_AcademicYearId
           OR NOT EXISTS
           (
               SELECT 1
               FROM Sections sec
               WHERE sec.AcademicYearId = p_AcademicYearId
                 AND sec.IsActive = 1
                 AND sec.SectionName = TRIM(p_SectionName)
                 AND sec.Group = g.GroupName
                 AND sec.AcademicLevel = s.AcademicLevel
           )
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section is not valid for one or more students';
    END IF;

    START TRANSACTION;

    UPDATE Students s
    INNER JOIN tmp_section_students t ON t.StudentId = s.StudentId
    SET s.Section = TRIM(p_SectionName), s.UpdatedAt = UTC_TIMESTAMP();

    UPDATE PromotionHistories ph
    INNER JOIN tmp_section_students t ON t.StudentId = ph.StudentId
    SET ph.ToSection = TRIM(p_SectionName)
    WHERE ph.IsRolledBack = 0
      AND ph.PromotionHistoryId =
      (
          SELECT MAX(ph2.PromotionHistoryId)
          FROM PromotionHistories ph2
          WHERE ph2.StudentId = ph.StudentId AND ph2.IsRolledBack = 0
      );

    SELECT
        s.StudentId,
        s.StudentName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.GroupId,
        g.GroupName,
        s.Section,
        UTC_TIMESTAMP() AS AllocatedAt
    FROM Students s
    INNER JOIN tmp_section_students t ON t.StudentId = s.StudentId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    ORDER BY s.StudentId;

    COMMIT;
    DROP TEMPORARY TABLE IF EXISTS tmp_section_students;
END;
