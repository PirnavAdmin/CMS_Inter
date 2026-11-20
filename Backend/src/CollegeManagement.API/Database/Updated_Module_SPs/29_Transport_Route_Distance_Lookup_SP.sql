-- =============================================================================
-- Migration: 29_Transport_Route_Distance_Lookup_SP.sql
-- Description: Stored procedure for looking up known route and stop distances,
--              pickup points, and campus context for automatic distance calculation.
-- =============================================================================

DROP PROCEDURE IF EXISTS `sp_GetRouteDistanceLookup`;
DELIMITER //
CREATE PROCEDURE `sp_GetRouteDistanceLookup`(
    IN p_StartLocation VARCHAR(150),
    IN p_EndLocation VARCHAR(150),
    IN p_CampusId INT
)
BEGIN
    -- 1. Exact or reverse route match in TransportRoutes
    SELECT 
        Distance AS DistanceKm,
        EstimatedDurationMinutes,
        'EXACT_ROUTE' AS Source
    FROM TransportRoutes
    WHERE IsDeleted = 0
      AND (
          (LOWER(TRIM(StartLocation)) = LOWER(TRIM(p_StartLocation)) AND LOWER(TRIM(EndLocation)) = LOWER(TRIM(p_EndLocation)))
          OR
          (LOWER(TRIM(StartLocation)) = LOWER(TRIM(p_EndLocation)) AND LOWER(TRIM(EndLocation)) = LOWER(TRIM(p_StartLocation)))
      )
      AND Distance > 0
    ORDER BY RouteId DESC
    LIMIT 1;

    -- 2. PickupPoints match if one is school/campus and other is stop
    SELECT 
        DistanceFromSchool AS DistanceKm,
        ROUND((DistanceFromSchool / 30.0) * 60) AS EstimatedDurationMinutes,
        'PICKUP_POINT' AS Source
    FROM PickupPoints
    WHERE IsDeleted = 0
      AND (
          LOWER(TRIM(StopName)) = LOWER(TRIM(p_EndLocation))
          OR LOWER(TRIM(StopName)) = LOWER(TRIM(p_StartLocation))
      )
      AND DistanceFromSchool > 0
    ORDER BY PickupPointId DESC
    LIMIT 1;

    -- 3. Campus context info
    SELECT 
        CampusId,
        CampusName,
        CampusCode,
        COALESCE(Address, '') AS Address
    FROM Campuses
    WHERE (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId)
      AND IsActive = 1
    ORDER BY IsHQ DESC, CampusId ASC
    LIMIT 1;
END //
DELIMITER ;
