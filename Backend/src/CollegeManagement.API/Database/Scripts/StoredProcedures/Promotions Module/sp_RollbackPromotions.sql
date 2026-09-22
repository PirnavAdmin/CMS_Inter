DROP PROCEDURE IF EXISTS sp_RollbackPromotions;
CREATE PROCEDURE sp_RollbackPromotions
(
    IN p_PromotionHistoryIds JSON,
    IN p_Remarks VARCHAR(500)
)
BEGIN
    DECLARE v_Count INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        DROP TEMPORARY TABLE IF EXISTS tmp_rollback_history;
        RESIGNAL;
    END;

    IF p_PromotionHistoryIds IS NULL OR JSON_VALID(p_PromotionHistoryIds) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'PromotionHistoryIds must be a valid JSON array';
    END IF;

    CREATE TEMPORARY TABLE tmp_rollback_history
    (
        PromotionHistoryId INT PRIMARY KEY
    );

    INSERT INTO tmp_rollback_history(PromotionHistoryId)
    SELECT DISTINCT PromotionHistoryId
    FROM JSON_TABLE(
        p_PromotionHistoryIds,
        '$[*]' COLUMNS(PromotionHistoryId INT PATH '$')
    ) AS jt
    WHERE PromotionHistoryId IS NOT NULL AND PromotionHistoryId > 0;

    SELECT COUNT(*) INTO v_Count FROM tmp_rollback_history;

    IF v_Count = 0 OR v_Count <> JSON_LENGTH(p_PromotionHistoryIds) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'At least one valid, unique promotion history ID is required';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM tmp_rollback_history t
        LEFT JOIN PromotionHistories ph ON ph.PromotionHistoryId = t.PromotionHistoryId
        WHERE ph.PromotionHistoryId IS NULL
           OR ph.IsRolledBack = 1
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'One or more promotion history records are invalid or already rolled back';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM PromotionHistories ph
        INNER JOIN tmp_rollback_history t ON t.PromotionHistoryId = ph.PromotionHistoryId
        INNER JOIN PromotionHistories newer
            ON newer.StudentId = ph.StudentId
           AND newer.PromotionHistoryId > ph.PromotionHistoryId
           AND newer.IsRolledBack = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only the latest active promotion for a student can be rolled back';
    END IF;

    START TRANSACTION;

    UPDATE Students s
    INNER JOIN PromotionHistories ph ON ph.StudentId = s.StudentId
    INNER JOIN tmp_rollback_history t ON t.PromotionHistoryId = ph.PromotionHistoryId
    SET
        s.AcademicYearId = ph.FromAcademicYearId,
        s.AcademicLevel = ph.FromAcademicLevel,
        s.GroupId = ph.FromGroupId,
        s.Section = ph.FromSection,
        s.UpdatedAt = UTC_TIMESTAMP();

    UPDATE PromotionHistories ph
    INNER JOIN tmp_rollback_history t ON t.PromotionHistoryId = ph.PromotionHistoryId
    SET
        ph.IsRolledBack = 1,
        ph.Status = 'RolledBack',
        ph.RolledBackAt = UTC_TIMESTAMP(),
        ph.RollbackRemarks = NULLIF(TRIM(p_Remarks), '');

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
    INNER JOIN tmp_rollback_history t ON t.PromotionHistoryId = ph.PromotionHistoryId
    ORDER BY ph.PromotionHistoryId;

    COMMIT;
    DROP TEMPORARY TABLE IF EXISTS tmp_rollback_history;
END;
