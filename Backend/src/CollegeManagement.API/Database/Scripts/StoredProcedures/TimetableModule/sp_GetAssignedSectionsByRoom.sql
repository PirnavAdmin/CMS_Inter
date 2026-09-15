DROP PROCEDURE IF EXISTS `sp_GetAssignedSectionsByRoom`;
DELIMITER //
CREATE PROCEDURE `sp_GetAssignedSectionsByRoom`(
    IN p_RoomId INT,
    IN p_RoomCode VARCHAR(50)
)
BEGIN
    SELECT 
        s.SectionId, 
        s.SectionName, 
        s.MaximumStrength, 
        s.IsActive
    FROM `Sections` s
    WHERE s.IsActive = 1
      AND (
          (p_RoomId IS NOT NULL AND p_RoomId > 0 AND s.RoomId = p_RoomId)
          OR (p_RoomCode IS NOT NULL AND p_RoomCode <> '' AND s.RoomId IN (
              SELECT r.RoomId FROM `Rooms` r WHERE r.RoomCode = p_RoomCode OR r.RoomNumber = p_RoomCode
          ))
      );
END //
DELIMITER ;
