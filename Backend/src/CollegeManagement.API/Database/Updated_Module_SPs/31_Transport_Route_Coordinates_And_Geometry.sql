-- =============================================================================
-- Migration: 31_Transport_Route_Coordinates_And_Geometry.sql
-- Description: Adds StartLatitude, StartLongitude, EndLatitude, EndLongitude,
--              and RouteGeometryJson to TransportRoutes table and updates
--              corresponding CRUD stored procedures for map rendering support.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Schema Enhancement (Idempotent column additions)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_AddRouteCoordinatesColumns`;
DELIMITER //
CREATE PROCEDURE `sp_AddRouteCoordinatesColumns`()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'TransportRoutes' 
          AND COLUMN_NAME = 'StartLatitude'
    ) THEN
        ALTER TABLE `TransportRoutes` ADD COLUMN `StartLatitude` DECIMAL(10, 8) NULL DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'TransportRoutes' 
          AND COLUMN_NAME = 'StartLongitude'
    ) THEN
        ALTER TABLE `TransportRoutes` ADD COLUMN `StartLongitude` DECIMAL(11, 8) NULL DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'TransportRoutes' 
          AND COLUMN_NAME = 'EndLatitude'
    ) THEN
        ALTER TABLE `TransportRoutes` ADD COLUMN `EndLatitude` DECIMAL(10, 8) NULL DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'TransportRoutes' 
          AND COLUMN_NAME = 'EndLongitude'
    ) THEN
        ALTER TABLE `TransportRoutes` ADD COLUMN `EndLongitude` DECIMAL(11, 8) NULL DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'TransportRoutes' 
          AND COLUMN_NAME = 'RouteGeometryJson'
    ) THEN
        ALTER TABLE `TransportRoutes` ADD COLUMN `RouteGeometryJson` LONGTEXT NULL DEFAULT NULL;
    END IF;
END //
DELIMITER ;

CALL `sp_AddRouteCoordinatesColumns`();
DROP PROCEDURE IF EXISTS `sp_AddRouteCoordinatesColumns`;

-- -----------------------------------------------------------------------------
-- 2. Stored Procedure: sp_CreateTransportRoute
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CreateTransportRoute`;
DELIMITER //
CREATE PROCEDURE `sp_CreateTransportRoute`(
    IN p_RouteCode VARCHAR(50),
    IN p_RouteName VARCHAR(150),
    IN p_StartLocation VARCHAR(150),
    IN p_EndLocation VARCHAR(150),
    IN p_Distance DECIMAL(10,2),
    IN p_EstimatedDurationMinutes INT,
    IN p_DefaultMonthlyFee DECIMAL(10,2),
    IN p_MinRangeKm DECIMAL(10,2),
    IN p_NonAcBaseFare DECIMAL(10,2),
    IN p_NonAcRatePerKm DECIMAL(10,2),
    IN p_AcBaseFare DECIMAL(10,2),
    IN p_AcRatePerKm DECIMAL(10,2),
    IN p_Description VARCHAR(500),
    IN p_Status TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_CampusId INT,
    IN p_StartLatitude DECIMAL(10,8),
    IN p_StartLongitude DECIMAL(11,8),
    IN p_EndLatitude DECIMAL(10,8),
    IN p_EndLongitude DECIMAL(11,8),
    IN p_RouteGeometryJson LONGTEXT
)
BEGIN
    DECLARE v_RouteNum VARCHAR(50);
    SET v_RouteNum = COALESCE(NULLIF(p_RouteCode, ''), CONCAT('R-', UUID_SHORT()));

    INSERT INTO `TransportRoutes` (
        `RouteCode`, `RouteNumber`, `RouteName`, `StartLocation`, `EndLocation`, `Distance`,
        `EstimatedDurationMinutes`, `DefaultMonthlyFee`, `MinRangeKm`, `NonAcBaseFare`, `NonAcRatePerKm`,
        `AcBaseFare`, `AcRatePerKm`, `Description`, `Status`, `IsActive`, `IsDeleted`, `CreatedBy`, `CreatedAt`, `CampusId`,
        `StartLatitude`, `StartLongitude`, `EndLatitude`, `EndLongitude`, `RouteGeometryJson`
    ) VALUES (
        p_RouteCode, v_RouteNum, p_RouteName, p_StartLocation, p_EndLocation, COALESCE(p_Distance, 0.00),
        COALESCE(p_EstimatedDurationMinutes, 30), COALESCE(p_DefaultMonthlyFee, 0.00), COALESCE(p_MinRangeKm, 5.00),
        COALESCE(p_NonAcBaseFare, 1000.00), COALESCE(p_NonAcRatePerKm, 100.00), COALESCE(p_AcBaseFare, 1200.00),
        COALESCE(p_AcRatePerKm, 150.00), p_Description, COALESCE(p_Status, 1), COALESCE(p_Status, 1), 0, p_CreatedBy, NOW(), COALESCE(p_CampusId, 1),
        p_StartLatitude, p_StartLongitude, p_EndLatitude, p_EndLongitude, p_RouteGeometryJson
    );
    SELECT LAST_INSERT_ID() AS RouteId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 3. Stored Procedure: sp_UpdateTransportRoute
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateTransportRoute`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateTransportRoute`(
    IN p_RouteId BIGINT,
    IN p_RouteCode VARCHAR(50),
    IN p_RouteName VARCHAR(150),
    IN p_StartLocation VARCHAR(150),
    IN p_EndLocation VARCHAR(150),
    IN p_Distance DECIMAL(10,2),
    IN p_EstimatedDurationMinutes INT,
    IN p_DefaultMonthlyFee DECIMAL(10,2),
    IN p_MinRangeKm DECIMAL(10,2),
    IN p_NonAcBaseFare DECIMAL(10,2),
    IN p_NonAcRatePerKm DECIMAL(10,2),
    IN p_AcBaseFare DECIMAL(10,2),
    IN p_AcRatePerKm DECIMAL(10,2),
    IN p_Description VARCHAR(500),
    IN p_Status TINYINT(1),
    IN p_UpdatedBy BIGINT,
    IN p_CampusId INT,
    IN p_StartLatitude DECIMAL(10,8),
    IN p_StartLongitude DECIMAL(11,8),
    IN p_EndLatitude DECIMAL(10,8),
    IN p_EndLongitude DECIMAL(11,8),
    IN p_RouteGeometryJson LONGTEXT
)
BEGIN
    UPDATE `TransportRoutes`
    SET 
        `RouteCode` = COALESCE(p_RouteCode, `RouteCode`),
        `RouteNumber` = COALESCE(p_RouteCode, `RouteNumber`),
        `RouteName` = COALESCE(p_RouteName, `RouteName`),
        `StartLocation` = p_StartLocation,
        `EndLocation` = p_EndLocation,
        `Distance` = COALESCE(p_Distance, `Distance`),
        `EstimatedDurationMinutes` = COALESCE(p_EstimatedDurationMinutes, `EstimatedDurationMinutes`),
        `DefaultMonthlyFee` = COALESCE(p_DefaultMonthlyFee, `DefaultMonthlyFee`),
        `MinRangeKm` = COALESCE(p_MinRangeKm, `MinRangeKm`),
        `NonAcBaseFare` = COALESCE(p_NonAcBaseFare, `NonAcBaseFare`),
        `NonAcRatePerKm` = COALESCE(p_NonAcRatePerKm, `NonAcRatePerKm`),
        `AcBaseFare` = COALESCE(p_AcBaseFare, `AcBaseFare`),
        `AcRatePerKm` = COALESCE(p_AcRatePerKm, `AcRatePerKm`),
        `Description` = p_Description,
        `Status` = COALESCE(p_Status, `Status`),
        `IsActive` = COALESCE(p_Status, `IsActive`),
        `CampusId` = COALESCE(p_CampusId, `CampusId`),
        `StartLatitude` = COALESCE(p_StartLatitude, `StartLatitude`),
        `StartLongitude` = COALESCE(p_StartLongitude, `StartLongitude`),
        `EndLatitude` = COALESCE(p_EndLatitude, `EndLatitude`),
        `EndLongitude` = COALESCE(p_EndLongitude, `EndLongitude`),
        `RouteGeometryJson` = COALESCE(p_RouteGeometryJson, `RouteGeometryJson`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `RouteId` = p_RouteId AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. Stored Procedure: sp_GetTransportRouteById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportRouteById`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportRouteById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        r.RouteId,
        r.RouteCode,
        r.RouteName,
        r.StartLocation,
        r.EndLocation,
        r.Distance AS DistanceKm,
        r.EstimatedDurationMinutes,
        r.DefaultMonthlyFee,
        r.MinRangeKm,
        r.NonAcBaseFare,
        r.NonAcRatePerKm,
        r.AcBaseFare,
        r.AcRatePerKm,
        r.Description,
        CASE WHEN r.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        CASE WHEN r.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText,
        r.Status AS IsActive,
        r.StartLatitude,
        r.StartLongitude,
        r.EndLatitude,
        r.EndLongitude,
        r.RouteGeometryJson AS RouteGeometry,
        (SELECT COUNT(*) FROM PickupPoints p WHERE p.RouteId = r.RouteId AND p.IsDeleted = 0) AS PickupPointCount,
        a.VehicleId,
        v.VehicleNumber,
        a.DriverId,
        d.DriverName
    FROM TransportRoutes r
    LEFT JOIN TransportVehicleAssignments a ON r.RouteId = a.RouteId AND a.IsDeleted = 0 AND a.Status = 1
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId AND d.IsDeleted = 0
    WHERE r.RouteId = p_Id AND r.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 5. Stored Procedure: sp_GetTransportRoutes
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportRoutes`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportRoutes`(
    IN p_Search VARCHAR(100),
    IN p_Status TINYINT(1),
    IN p_BusType VARCHAR(20),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        r.RouteId,
        r.RouteCode,
        r.RouteName,
        r.StartLocation,
        r.EndLocation,
        r.Distance AS DistanceKm,
        r.EstimatedDurationMinutes,
        r.DefaultMonthlyFee,
        r.MinRangeKm,
        r.NonAcBaseFare,
        r.NonAcRatePerKm,
        r.AcBaseFare,
        r.AcRatePerKm,
        r.Description,
        r.Status,
        CASE WHEN r.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText,
        r.StartLatitude,
        r.StartLongitude,
        r.EndLatitude,
        r.EndLongitude,
        r.RouteGeometryJson AS RouteGeometry,
        (SELECT COUNT(*) FROM PickupPoints p WHERE p.RouteId = r.RouteId AND p.IsDeleted = 0) AS PickupPointCount,
        a.VehicleId,
        v.VehicleNumber,
        a.DriverId,
        d.DriverName,
        v.IsAC AS IsAc,
        CASE 
            WHEN v.IsAC = 1 THEN 'AC' 
            WHEN v.IsAC = 0 THEN 'Non-AC' 
            ELSE NULL 
        END AS BusType,
        r.CampusId,
        c.CampusName
    FROM TransportRoutes r
    LEFT JOIN Campuses c ON r.CampusId = c.CampusId
    LEFT JOIN TransportVehicleAssignments a ON r.RouteId = a.RouteId AND a.IsDeleted = 0 AND a.Status = 1
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId AND d.IsDeleted = 0
    WHERE r.IsDeleted = 0
      AND (p_Status IS NULL OR r.Status = p_Status)
      AND (p_CampusId IS NULL OR r.CampusId = p_CampusId)
      AND (
          p_BusType IS NULL OR p_BusType = ''
          OR (LOWER(p_BusType) IN ('ac', '1') AND (v.IsAC = 1 OR (v.IsAC IS NULL AND r.AcBaseFare > 0)))
          OR (LOWER(p_BusType) IN ('non-ac', 'nonac', 'non_ac', '0') AND (v.IsAC = 0 OR (v.IsAC IS NULL AND r.NonAcBaseFare > 0)))
      )
      AND (p_Search IS NULL OR p_Search = '' 
           OR LOWER(r.RouteCode) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(r.RouteName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(r.StartLocation) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(r.EndLocation) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY r.RouteName ASC;
END //
DELIMITER ;
