DROP PROCEDURE IF EXISTS sp_GetGroupsByBoard;
DELIMITER //
CREATE PROCEDURE sp_GetGroupsByBoard(
    IN p_Board VARCHAR(100)
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
    WHERE g.Board = p_Board
    ORDER BY g.GroupName ASC;
END //
DELIMITER ;
