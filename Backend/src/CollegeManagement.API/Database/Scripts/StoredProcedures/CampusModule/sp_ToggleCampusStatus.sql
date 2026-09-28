DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_ToggleCampusStatus`$$

CREATE PROCEDURE `sp_ToggleCampusStatus`(
    IN p_CampusId INT
)
BEGIN
    UPDATE `Campuses`
    SET `IsActive` = IF(`IsActive` = 1, 0, 1),
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `CampusId` = p_CampusId;

    SELECT `CampusId`, `IsActive` FROM `Campuses` WHERE `CampusId` = p_CampusId;
END$$

DELIMITER ;
