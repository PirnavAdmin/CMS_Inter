-- =====================================================================
-- ROLLBACK BACKUP: sp_GetPickupPoints
-- Captured on: 2026-09-29
-- Database: u819242402_CLM_System
-- =====================================================================

DROP PROCEDURE IF EXISTS `sp_GetPickupPoints`;
DELIMITER $$
CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GetPickupPoints`(
    IN p_RouteId BIGINT,
    IN p_Search VARCHAR(100),
    IN p_Status TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        p.PickupPointId,
        p.RouteId,
        r.RouteName,
        r.RouteCode,
        COALESCE(NULLIF(p.PickupPointName, ''), p.StopName) AS PickupPointName,
        p.StopAddress AS Landmark,
        p.StopOrder AS SequenceNo,
        p.PickupTime,
        p.DropTime,
        p.DistanceFromSchool AS DistanceFromStart,
        p.MonthlyFee,
        p.Status,
        CASE WHEN p.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText
    FROM PickupPoints p
    LEFT JOIN TransportRoutes r ON p.RouteId = r.RouteId
    WHERE p.IsDeleted = 0
      AND (r.IsDeleted = 0 OR r.IsDeleted IS NULL)
      AND (p_RouteId IS NULL OR p.RouteId = p_RouteId)
      AND (p_Status IS NULL OR p.Status = p_Status)
      AND (p_CampusId IS NULL OR r.CampusId = p_CampusId)
      AND (p_Search IS NULL OR p_Search = '' 
           OR LOWER(p.StopName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(p.StopAddress) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(r.RouteName) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY p.RouteId ASC, p.StopOrder ASC;
END$$
DELIMITER ;
