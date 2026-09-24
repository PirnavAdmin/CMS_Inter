DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_DeleteCampus`$$

CREATE PROCEDURE `sp_DeleteCampus`(
    IN p_CampusId INT
)
BEGIN
    DECLARE v_StudentCount INT DEFAULT 0;

    -- Check if students are enrolled in this campus
    SELECT COUNT(1) INTO v_StudentCount 
    FROM `Students` 
    WHERE `CampusId` = p_CampusId AND (`IsActive` = 1 OR `IsActive` IS NULL);

    IF v_StudentCount > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Cannot delete campus branch because active students are currently enrolled in it.';
    ELSE
        -- Delete campus boards
        DELETE FROM `CampusBoards` WHERE `CampusId` = p_CampusId;
        -- Delete campus
        DELETE FROM `Campuses` WHERE `CampusId` = p_CampusId;
        SELECT 1 AS `Success`;
    END IF;
END$$

DELIMITER ;
