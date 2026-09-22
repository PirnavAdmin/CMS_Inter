DROP PROCEDURE IF EXISTS sp_CreateGroup;
DELIMITER //
CREATE PROCEDURE sp_CreateGroup(
    IN p_Board VARCHAR(100),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupName VARCHAR(100),
    IN p_GroupCode VARCHAR(30),
    IN p_Description VARCHAR(500),
    IN p_IsActive BOOLEAN
)
BEGIN
    DECLARE v_GroupId INT;

    IF p_Board IS NULL OR TRIM(p_Board) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Board is required';
    END IF;

    IF p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Valid AcademicYearId is required';
    END IF;

    IF p_AcademicLevel IS NULL OR TRIM(p_AcademicLevel) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Academic level is required';
    END IF;

    IF p_GroupName IS NULL OR TRIM(p_GroupName) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Group name is required';
    END IF;

    IF p_GroupCode IS NULL OR TRIM(p_GroupCode) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Group code is required';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM `Groups`
        WHERE GroupCode = TRIM(p_GroupCode)
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Group code already exists';
    END IF;

    INSERT INTO `Groups`
    (
        Board,
        AcademicYearId,
        AcademicLevel,
        GroupName,
        GroupCode,
        Description,
        IsActive,
        CreatedAt,
        UpdatedAt
    )
    VALUES
    (
        TRIM(p_Board),
        p_AcademicYearId,
        TRIM(p_AcademicLevel),
        TRIM(p_GroupName),
        TRIM(p_GroupCode),
        NULLIF(TRIM(p_Description), ''),
        IFNULL(p_IsActive, 1),
        UTC_TIMESTAMP(),
        NULL
    );

    SET v_GroupId = LAST_INSERT_ID();

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
    WHERE g.GroupId = v_GroupId;
END //
DELIMITER ;
