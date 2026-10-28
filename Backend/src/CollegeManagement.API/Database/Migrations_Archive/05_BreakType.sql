-- =============================================================================
-- MODULE: BREAK TYPE MASTER
-- DATABASE: cmsdb / u819242402_CLM_System
-- DESCRIPTION: Contains table definition and Stored Procedures for BreakTypes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table: BreakTypes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS BreakTypes (
    Id INT NOT NULL AUTO_INCREMENT,
    Name VARCHAR(50) NOT NULL,
    IsActive TINYINT(1) NOT NULL DEFAULT 1,
    CreatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UpdatedAt DATETIME(6) NULL,
    PRIMARY KEY (Id),
    UNIQUE KEY UQ_BreakTypes_Name (Name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed standard break types if empty
INSERT INTO BreakTypes (Name, IsActive, CreatedAt)
SELECT 'Short Break', 1, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM BreakTypes WHERE Name = 'Short Break');

INSERT INTO BreakTypes (Name, IsActive, CreatedAt)
SELECT 'Lunch', 1, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM BreakTypes WHERE Name = 'Lunch');

INSERT INTO BreakTypes (Name, IsActive, CreatedAt)
SELECT 'Tea Break', 1, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM BreakTypes WHERE Name = 'Tea Break');

INSERT INTO BreakTypes (Name, IsActive, CreatedAt)
SELECT 'Assembly', 1, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM BreakTypes WHERE Name = 'Assembly');

-- -----------------------------------------------------------------------------
-- 2. Stored Procedures: BreakTypes
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_GetBreakTypes;
DELIMITER //
CREATE PROCEDURE sp_GetBreakTypes(
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
    ORDER BY Name ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetBreakTypeById;
DELIMITER //
CREATE PROCEDURE sp_GetBreakTypeById(
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
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CreateBreakType;
DELIMITER //
CREATE PROCEDURE sp_CreateBreakType(
    IN p_Name VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO BreakTypes (Name, IsActive, CreatedAt)
    VALUES (p_Name, IFNULL(p_IsActive, 1), NOW(6));

    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateBreakType;
DELIMITER //
CREATE PROCEDURE sp_UpdateBreakType(
    IN p_Id INT,
    IN p_Name VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE BreakTypes
    SET 
        Name = p_Name,
        IsActive = p_IsActive,
        UpdatedAt = NOW(6)
    WHERE Id = p_Id;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_DeleteBreakType;
DELIMITER //
CREATE PROCEDURE sp_DeleteBreakType(
    IN p_Id INT
)
BEGIN
    DELETE FROM BreakTypes
    WHERE Id = p_Id;
END //
DELIMITER ;