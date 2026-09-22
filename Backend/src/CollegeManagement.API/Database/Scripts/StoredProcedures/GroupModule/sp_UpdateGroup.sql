DROP PROCEDURE IF EXISTS sp_UpdateGroup;
DELIMITER //
CREATE PROCEDURE sp_UpdateGroup(
    IN p_GroupId INT,
    IN p_Board VARCHAR(100),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupName VARCHAR(100),
    IN p_GroupCode VARCHAR(30),
    IN p_Description VARCHAR(500),
    IN p_IsActive BOOLEAN
)
BEGIN
    IF NOT EXISTS
    (
        SELECT 1
        FROM `Groups`
        WHERE GroupId = p_GroupId
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Group not found';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM `Groups`
        WHERE GroupCode = TRIM(p_GroupCode)
          AND GroupId <> p_GroupId
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Group code already exists';
    END IF;

    UPDATE `Groups`
    SET
        Board = TRIM(p_Board),
        AcademicYearId = p_AcademicYearId,
        AcademicLevel = TRIM(p_AcademicLevel),
        GroupName = TRIM(p_GroupName),
        GroupCode = TRIM(p_GroupCode),
        Description = NULLIF(TRIM(p_Description), ''),
        IsActive = p_IsActive,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE GroupId = p_GroupId;

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
    WHERE g.GroupId = p_GroupId;
END //
DELIMITER ;
