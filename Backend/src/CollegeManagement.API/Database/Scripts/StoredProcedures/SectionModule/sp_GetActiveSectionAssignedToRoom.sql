DROP PROCEDURE IF EXISTS `sp_GetActiveSectionAssignedToRoom`;
DELIMITER //
CREATE PROCEDURE `sp_GetActiveSectionAssignedToRoom`(
    IN p_RoomId INT,
    IN p_RoomCode VARCHAR(50),
    IN p_ExcludeSectionId INT
)
BEGIN
    SELECT 
        s.SectionId, 
        s.SectionName, 
        s.RoomId, 
        s.IsActive
    FROM `Sections` s
    WHERE s.IsActive = 1
      AND (
          (p_RoomId IS NOT NULL AND p_RoomId > 0 AND s.RoomId = p_RoomId)
          OR (p_RoomCode IS NOT NULL AND p_RoomCode <> '' AND s.RoomId IN (
              SELECT r.RoomId FROM `Rooms` r WHERE r.RoomCode = p_RoomCode OR r.RoomNumber = p_RoomCode
          ))
      )
      AND (p_ExcludeSectionId IS NULL OR s.SectionId <> p_ExcludeSectionId)
    LIMIT 1;
END //
DELIMITER ;
