DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_UpdateCampus`$$

CREATE PROCEDURE `sp_UpdateCampus`(
    IN p_CampusId INT,
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
    DECLARE v_BoardId VARCHAR(50);
    DECLARE v_Pos INT DEFAULT 1;
    DECLARE v_NextPos INT;
    DECLARE v_BoardIdsList VARCHAR(1000);

    -- Update Campus
    UPDATE `Campuses`
    SET 
        `CampusName` = TRIM(p_CampusName),
        `CampusCode` = UPPER(TRIM(p_CampusCode)),
        `Address` = p_Address,
        `ContactPhone` = p_ContactPhone,
        `Email` = p_Email,
        `IsHQ` = IFNULL(p_IsHQ, `IsHQ`),
        `IsActive` = IFNULL(p_IsActive, `IsActive`),
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `CampusId` = p_CampusId;

    -- Update CampusBoards if provided
    IF p_BoardIds IS NOT NULL THEN
        -- Remove existing boards for this campus
        DELETE FROM `CampusBoards` WHERE `CampusId` = p_CampusId;

        -- Insert new boards
        IF TRIM(p_BoardIds) != '' THEN
            SET v_BoardIdsList = CONCAT(p_BoardIds, ',');
            WHILE LOCATE(',', v_BoardIdsList, v_Pos) > 0 DO
                SET v_NextPos = LOCATE(',', v_BoardIdsList, v_Pos);
                SET v_BoardId = TRIM(SUBSTRING(v_BoardIdsList, v_Pos, v_NextPos - v_Pos));
                IF v_BoardId != '' AND CAST(v_BoardId AS UNSIGNED) > 0 THEN
                    INSERT IGNORE INTO `CampusBoards` (`CampusId`, `BoardId`, `IsActive`, `CreatedAt`)
                    VALUES (p_CampusId, CAST(v_BoardId AS UNSIGNED), 1, UTC_TIMESTAMP());
                END IF;
                SET v_Pos = v_NextPos + 1;
            END WHILE;
        END IF;
    END IF;

    SELECT ROW_COUNT() AS `RowsAffected`;
END$$

DELIMITER ;
