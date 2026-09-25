DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_CreateCampus`$$

CREATE PROCEDURE `sp_CreateCampus`(
    IN p_CampusName VARCHAR(150),
    IN p_CampusCode VARCHAR(50),
    IN p_Address VARCHAR(500),
    IN p_ContactPhone VARCHAR(50),
    IN p_Email VARCHAR(150),
    IN p_IsHQ TINYINT,
    IN p_IsActive TINYINT,
    IN p_BoardIds VARCHAR(1000) -- Comma separated board IDs e.g. '1,2,3'
)
BEGIN
    DECLARE v_CampusId INT;
    DECLARE v_BoardId VARCHAR(50);
    DECLARE v_Pos INT DEFAULT 1;
    DECLARE v_NextPos INT;
    DECLARE v_BoardIdsList VARCHAR(1000);

    -- Insert Campus
    INSERT INTO `Campuses` (
        `CampusName`,
        `CampusCode`,
        `Address`,
        `ContactPhone`,
        `Email`,
        `IsHQ`,
        `IsActive`,
        `CreatedAt`
    ) VALUES (
        TRIM(p_CampusName),
        UPPER(TRIM(p_CampusCode)),
        p_Address,
        p_ContactPhone,
        p_Email,
        IFNULL(p_IsHQ, 0),
        IFNULL(p_IsActive, 1),
        UTC_TIMESTAMP()
    );

    SET v_CampusId = LAST_INSERT_ID();

    -- Parse and Insert CampusBoards
    IF p_BoardIds IS NOT NULL AND TRIM(p_BoardIds) != '' THEN
        SET v_BoardIdsList = CONCAT(p_BoardIds, ',');
        WHILE LOCATE(',', v_BoardIdsList, v_Pos) > 0 DO
            SET v_NextPos = LOCATE(',', v_BoardIdsList, v_Pos);
            SET v_BoardId = TRIM(SUBSTRING(v_BoardIdsList, v_Pos, v_NextPos - v_Pos));
            IF v_BoardId != '' AND CAST(v_BoardId AS UNSIGNED) > 0 THEN
                INSERT IGNORE INTO `CampusBoards` (`CampusId`, `BoardId`, `IsActive`, `CreatedAt`)
                VALUES (v_CampusId, CAST(v_BoardId AS UNSIGNED), 1, UTC_TIMESTAMP());
            END IF;
            SET v_Pos = v_NextPos + 1;
        END WHILE;
    END IF;

    -- Return created campus id
    SELECT v_CampusId AS `CampusId`;
END$$

DELIMITER ;
