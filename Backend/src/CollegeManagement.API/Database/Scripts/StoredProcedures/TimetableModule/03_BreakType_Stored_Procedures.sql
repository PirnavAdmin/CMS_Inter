-- =============================================================================
-- MODULE: BREAK TYPE STORED PROCEDURES
-- DESCRIPTION: Procedures for managing timetable break types.
-- =============================================================================

DELIMITER //

DROP PROCEDURE IF EXISTS `sp_GetBreakTypes` //
CREATE DEFINER="avnadmin"@"%" PROCEDURE "sp_GetBreakTypes"(
    IN p_IncludeInactive TINYINT(1)
)
BEGIN
    SELECT 
        Id,
        Name,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM BreakTypes
    WHERE (p_IncludeInactive = 1 OR IsActive = 1)
    ORDER BY Id ASC;
END //

DROP PROCEDURE IF EXISTS `sp_GetBreakTypeById` //
CREATE DEFINER="avnadmin"@"%" PROCEDURE "sp_GetBreakTypeById"(
    IN p_Id INT
)
BEGIN
    SELECT 
        Id,
        Name,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM BreakTypes
    WHERE Id = p_Id;
END //

DROP PROCEDURE IF EXISTS `sp_CreateBreakType` //
CREATE DEFINER="avnadmin"@"%" PROCEDURE "sp_CreateBreakType"(
    IN p_Name VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO BreakTypes (Name, IsActive, CreatedAt)
    VALUES (p_Name, IFNULL(p_IsActive, 1), CURRENT_TIMESTAMP(6));

    SELECT LAST_INSERT_ID();
END //

DROP PROCEDURE IF EXISTS `sp_UpdateBreakType` //
CREATE DEFINER="avnadmin"@"%" PROCEDURE "sp_UpdateBreakType"(
    IN p_Id INT,
    IN p_Name VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE BreakTypes
    SET 
        Name = p_Name,
        IsActive = IFNULL(p_IsActive, IsActive),
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE Id = p_Id;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteBreakType` //
CREATE DEFINER="avnadmin"@"%" PROCEDURE "sp_DeleteBreakType"(
    IN p_Id INT
)
BEGIN
    DELETE FROM BreakTypes WHERE Id = p_Id;
END //

DELIMITER ;
