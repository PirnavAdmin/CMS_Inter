DROP PROCEDURE IF EXISTS sp_GetPromotionReport;
CREATE PROCEDURE sp_GetPromotionReport
(
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_Section VARCHAR(50),
    IN p_IncludeRolledBack BOOLEAN
)
BEGIN
    SELECT
        ph.PromotionHistoryId,
        ph.StudentId,
        s.StudentName,
        s.AdmissionNo,
        fay.AcademicYearName AS FromAcademicYearName,
        tay.AcademicYearName AS ToAcademicYearName,
        ph.FromAcademicLevel,
        ph.ToAcademicLevel,
        fg.GroupName AS FromGroupName,
        tg.GroupName AS ToGroupName,
        ph.FromSection,
        ph.ToSection,
        ph.PromotionDate,
        ph.Status,
        ph.Remarks
    FROM PromotionHistories ph
    INNER JOIN Students s ON s.StudentId = ph.StudentId
    LEFT JOIN AcademicYears fay ON fay.AcademicYearId = ph.FromAcademicYearId
    LEFT JOIN AcademicYears tay ON tay.AcademicYearId = ph.ToAcademicYearId
    LEFT JOIN `Groups` fg ON fg.GroupId = ph.FromGroupId
    LEFT JOIN `Groups` tg ON tg.GroupId = ph.ToGroupId
    WHERE (p_AcademicYearId IS NULL OR ph.ToAcademicYearId = p_AcademicYearId)
      AND (p_GroupId IS NULL OR ph.ToGroupId = p_GroupId)
      AND (p_Section IS NULL OR ph.ToSection = p_Section)
      AND (p_IncludeRolledBack = 1 OR ph.IsRolledBack = 0)
    ORDER BY ph.PromotionHistoryId DESC;
END;
