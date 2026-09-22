DROP PROCEDURE IF EXISTS sp_GetEligiblePromotionStudents;
CREATE PROCEDURE sp_GetEligiblePromotionStudents
(
    IN p_AcademicYearId INT,
    IN p_TargetAcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,
    IN p_Section VARCHAR(50),
    IN p_TargetAcademicLevel VARCHAR(50)
)
BEGIN
    DECLARE v_AcademicYearId INT;
    DECLARE v_TargetAcademicYearId INT;

    SET v_AcademicYearId = p_AcademicYearId;

    IF v_AcademicYearId IS NULL OR v_AcademicYearId <= 0 THEN
        SELECT AcademicYearId INTO v_AcademicYearId
        FROM AcademicYears
        WHERE IsActive = 1
        ORDER BY StartDate DESC
        LIMIT 1;
    END IF;

    SET v_TargetAcademicYearId = p_TargetAcademicYearId;

    IF v_TargetAcademicYearId IS NULL OR v_TargetAcademicYearId <= 0 THEN
        SELECT AcademicYearId INTO v_TargetAcademicYearId
        FROM AcademicYears
        WHERE StartDate > (SELECT StartDate FROM AcademicYears WHERE AcademicYearId = v_AcademicYearId)
        ORDER BY StartDate
        LIMIT 1;
    END IF;

    IF v_AcademicYearId IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No active academic year was found';
    END IF;

    SELECT
        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Board,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.AcademicLevel,
        s.GroupId,
        g.GroupName,
        s.Section,
        s.AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        'PASS' AS ResultStatus,
        v_TargetAcademicYearId AS TargetAcademicYearId,
        tay.AcademicYearName AS TargetAcademicYearName
    FROM Students s
    INNER JOIN AcademicYears ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN AcademicYears tay ON tay.AcademicYearId = v_TargetAcademicYearId
    WHERE s.IsActive = 1
      AND s.AcademicYearId = v_AcademicYearId
      AND (p_AcademicLevel IS NULL OR TRIM(p_AcademicLevel) = '' OR s.AcademicLevel = TRIM(p_AcademicLevel))
      AND (p_GroupId IS NULL OR s.GroupId = p_GroupId)
      AND (p_Section IS NULL OR TRIM(p_Section) = '' OR s.Section = TRIM(p_Section))
      AND NOT EXISTS
      (
          SELECT 1
          FROM PromotionHistories ph
          WHERE ph.StudentId = s.StudentId
            AND ph.IsRolledBack = 0
      )
    ORDER BY s.StudentId;
END;
