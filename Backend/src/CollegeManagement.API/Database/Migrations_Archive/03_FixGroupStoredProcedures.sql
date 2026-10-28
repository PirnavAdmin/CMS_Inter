-- =============================================================================
-- FIX GROUP STORED PROCEDURES & RESULT SETS
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

DROP PROCEDURE IF EXISTS sp_GetAllGroups;
DELIMITER //
CREATE PROCEDURE sp_GetAllGroups(
    IN p_Search VARCHAR(150),
    IN p_Board VARCHAR(100),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    SELECT
        g.GroupId,
        g.Board,
        g.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        g.AcademicLevel,
        g.GroupName,
        g.GroupCode,
        g.Description,
        (SELECT COUNT(*) FROM Subjects sub WHERE sub.GroupId = g.GroupId) AS TotalSubjects,
        g.IsActive,
        CASE WHEN g.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        g.CreatedAt,
        g.UpdatedAt
    FROM `Groups` g
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = g.AcademicYearId
    WHERE (p_Search IS NULL OR TRIM(p_Search) = ''
           OR g.GroupName LIKE CONCAT('%', TRIM(p_Search), '%')
           OR g.GroupCode LIKE CONCAT('%', TRIM(p_Search), '%')
           OR g.Board LIKE CONCAT('%', TRIM(p_Search), '%'))
      AND (p_Board IS NULL OR TRIM(p_Board) = '' OR g.Board = TRIM(p_Board))
      AND (p_AcademicYearId IS NULL OR g.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevel IS NULL OR TRIM(p_AcademicLevel) = '' OR g.AcademicLevel = TRIM(p_AcademicLevel))
      AND (p_IsActive IS NULL OR g.IsActive = p_IsActive)
    ORDER BY g.GroupId DESC;
END //
DELIMITER ;
