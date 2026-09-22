DROP PROCEDURE IF EXISTS sp_GetGroupById;
DELIMITER //
CREATE PROCEDURE sp_GetGroupById(
    IN p_GroupId INT
)
BEGIN
    SELECT
        g.GroupId,
        g.Board,
        g.AcademicYearId,
        ay.AcademicYearName,
        g.AcademicLevel,
        g.GroupName,
        g.GroupCode,
        g.Description,
        0 AS TotalSubjects,
        g.IsActive,
        CASE
            WHEN g.IsActive = 1 THEN 'Active'
            ELSE 'Inactive'
        END AS Status,
        g.CreatedAt,
        g.UpdatedAt
    FROM `Groups` g
    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = g.AcademicYearId
    WHERE g.GroupId = p_GroupId
    LIMIT 1;
END //
DELIMITER ;
