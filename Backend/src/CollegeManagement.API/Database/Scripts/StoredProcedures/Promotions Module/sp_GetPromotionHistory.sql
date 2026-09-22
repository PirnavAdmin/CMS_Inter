DROP PROCEDURE IF EXISTS sp_GetPromotionHistory;
CREATE PROCEDURE sp_GetPromotionHistory
(
    IN p_AcademicYearId INT,
    IN p_StudentId INT,
    IN p_IsRolledBack BOOLEAN
)
BEGIN
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
    WHERE (p_AcademicYearId IS NULL OR ph.ToAcademicYearId = p_AcademicYearId)
      AND (p_StudentId IS NULL OR ph.StudentId = p_StudentId)
      AND (p_IsRolledBack IS NULL OR ph.IsRolledBack = p_IsRolledBack)
    ORDER BY ph.PromotionHistoryId DESC;
END;
