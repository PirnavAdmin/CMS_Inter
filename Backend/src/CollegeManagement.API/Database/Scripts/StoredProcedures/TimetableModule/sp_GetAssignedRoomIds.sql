DROP PROCEDURE IF EXISTS `sp_GetAssignedRoomIds`;
DELIMITER //
CREATE PROCEDURE `sp_GetAssignedRoomIds`()
BEGIN
    SELECT DISTINCT RoomId 
    FROM `Sections` 
    WHERE IsActive = 1 AND RoomId IS NOT NULL;
END //
DELIMITER ;
