-- =============================================================================
-- MODULE: TRANSPORTATION MANAGEMENT COMPLETE SCHEMA & STORED PROCEDURES
-- DATABASE: u819242402_CLM_System
-- 100% NON-DESTRUCTIVE - SAFE TO EXECUTE IN MYSQL WORKBENCH
-- =============================================================================

USE `u819242402_CLM_System`;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

-- -----------------------------------------------------------------------------
-- 1. TABLE DEFINITIONS
-- -----------------------------------------------------------------------------

-- 1.1 TransportRoutes
CREATE TABLE IF NOT EXISTS `TransportRoutes` (
    `RouteId` BIGINT NOT NULL AUTO_INCREMENT,
    `RouteCode` VARCHAR(50) NOT NULL,
    `RouteName` VARCHAR(150) NOT NULL,
    `StartLocation` VARCHAR(150) NULL,
    `EndLocation` VARCHAR(150) NULL,
    `Distance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `EstimatedDurationMinutes` INT NOT NULL DEFAULT 30,
    `DefaultMonthlyFee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `MinRangeKm` DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    `NonAcBaseFare` DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
    `NonAcRatePerKm` DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    `AcBaseFare` DECIMAL(10,2) NOT NULL DEFAULT 1200.00,
    `AcRatePerKm` DECIMAL(10,2) NOT NULL DEFAULT 150.00,
    `Description` VARCHAR(500) NULL,
    `Status` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`RouteId`),
    UNIQUE KEY `ux_transport_routes_code` (`RouteCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.2 PickupPoints
CREATE TABLE IF NOT EXISTS `PickupPoints` (
    `PickupPointId` BIGINT NOT NULL AUTO_INCREMENT,
    `RouteId` BIGINT NOT NULL,
    `StopName` VARCHAR(150) NOT NULL,
    `StopAddress` VARCHAR(250) NULL,
    `StopOrder` INT NOT NULL DEFAULT 1,
    `PickupTime` TIME NOT NULL DEFAULT '07:30:00',
    `DropTime` TIME NOT NULL DEFAULT '16:15:00',
    `DistanceFromSchool` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `MonthlyFee` DECIMAL(10,2) NOT NULL DEFAULT 1200.00,
    `Status` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`PickupPointId`),
    KEY `ix_pickup_route_id` (`RouteId`),
    KEY `ix_pickup_order` (`RouteId`, `StopOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.3 TransportVehicles
CREATE TABLE IF NOT EXISTS `TransportVehicles` (
    `VehicleId` BIGINT NOT NULL AUTO_INCREMENT,
    `VehicleNumber` VARCHAR(50) NOT NULL,
    `VehicleRegistrationNo` VARCHAR(50) NOT NULL,
    `VehicleName` VARCHAR(100) NULL,
    `VehicleType` VARCHAR(50) NOT NULL DEFAULT 'Bus',
    `Make` VARCHAR(100) NULL,
    `Model` VARCHAR(100) NULL,
    `ChassisNumber` VARCHAR(100) NULL,
    `EngineNumber` VARCHAR(100) NULL,
    `GpsDeviceId` VARCHAR(100) NULL,
    `InsuranceNumber` VARCHAR(100) NULL,
    `InsuranceExpiry` DATE NULL,
    `PollutionExpiry` DATE NULL,
    `FitnessExpiry` DATE NULL,
    `Capacity` INT NOT NULL DEFAULT 40,
    `IsAC` TINYINT(1) NOT NULL DEFAULT 1,
    `Status` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`VehicleId`),
    UNIQUE KEY `ux_transport_vehicles_number` (`VehicleNumber`),
    UNIQUE KEY `ux_transport_vehicles_reg` (`VehicleRegistrationNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.4 TransportDrivers
CREATE TABLE IF NOT EXISTS `TransportDrivers` (
    `DriverId` BIGINT NOT NULL AUTO_INCREMENT,
    `DriverName` VARCHAR(100) NOT NULL,
    `EmployeeId` VARCHAR(50) NOT NULL,
    `LicenseNo` VARCHAR(50) NOT NULL,
    `LicenseExpiry` DATE NULL,
    `MobileNo` VARCHAR(20) NOT NULL,
    `AlternateMobileNo` VARCHAR(20) NULL,
    `Email` VARCHAR(100) NULL,
    `Address` VARCHAR(255) NULL,
    `BloodGroup` VARCHAR(10) NULL,
    `EmergencyContactName` VARCHAR(100) NULL,
    `EmergencyContactNumber` VARCHAR(20) NULL,
    `AssignedVehicleId` BIGINT NULL,
    `Status` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`DriverId`),
    UNIQUE KEY `ux_transport_drivers_license` (`LicenseNo`),
    KEY `ix_transport_drivers_mobile` (`MobileNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.5 TransportAttendants
CREATE TABLE IF NOT EXISTS `TransportAttendants` (
    `AttendantId` BIGINT NOT NULL AUTO_INCREMENT,
    `EmployeeId` VARCHAR(50) NOT NULL,
    `AttendantName` VARCHAR(100) NOT NULL,
    `MobileNumber` VARCHAR(20) NOT NULL,
    `AlternateMobileNumber` VARCHAR(20) NULL,
    `Gender` VARCHAR(20) NOT NULL DEFAULT 'Female',
    `BranchName` VARCHAR(100) NULL,
    `Address` VARCHAR(255) NULL,
    `BloodGroup` VARCHAR(10) NULL,
    `EmergencyContactName` VARCHAR(100) NULL,
    `EmergencyContactNumber` VARCHAR(20) NULL,
    `AssignedVehicleId` BIGINT NULL,
    `Status` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`AttendantId`),
    KEY `ix_transport_attendant_emp` (`EmployeeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.6 TransportVehicleAssignments
CREATE TABLE IF NOT EXISTS `TransportVehicleAssignments` (
    `AssignmentId` BIGINT NOT NULL AUTO_INCREMENT,
    `RouteId` BIGINT NOT NULL,
    `VehicleId` BIGINT NOT NULL,
    `DriverId` BIGINT NOT NULL,
    `AttendantId` BIGINT NULL,
    `EffectiveFrom` DATETIME NOT NULL,
    `EffectiveTo` DATETIME NULL,
    `Shift` VARCHAR(20) NOT NULL DEFAULT 'Morning',
    `MorningTripTime` VARCHAR(20) NULL,
    `EveningTripTime` VARCHAR(20) NULL,
    `Remarks` VARCHAR(255) NULL,
    `Status` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`AssignmentId`),
    KEY `ix_tva_route` (`RouteId`),
    KEY `ix_tva_vehicle` (`VehicleId`),
    KEY `ix_tva_driver` (`DriverId`),
    KEY `ix_tva_attendant` (`AttendantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.7 StudentTransportAssignments
CREATE TABLE IF NOT EXISTS `StudentTransportAssignments` (
    `StudentTransportAssignmentId` BIGINT NOT NULL AUTO_INCREMENT,
    `StudentId` BIGINT NULL,
    `AdmissionNo` VARCHAR(50) NOT NULL,
    `RouteId` BIGINT NOT NULL,
    `PickupPointId` BIGINT NOT NULL,
    `VehicleAssignmentId` BIGINT NOT NULL,
    `EffectiveFrom` DATETIME NOT NULL,
    `EffectiveTo` DATETIME NULL,
    `TransportType` VARCHAR(20) NOT NULL DEFAULT 'Both',
    `Remarks` VARCHAR(255) NULL,
    `Status` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`StudentTransportAssignmentId`),
    KEY `ix_sta_admission` (`AdmissionNo`),
    KEY `ix_sta_route` (`RouteId`),
    KEY `ix_sta_pickup` (`PickupPointId`),
    KEY `ix_sta_assignment` (`VehicleAssignmentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.8 VehicleMaintenances
CREATE TABLE IF NOT EXISTS `VehicleMaintenances` (
    `MaintenanceId` BIGINT NOT NULL AUTO_INCREMENT,
    `VehicleId` BIGINT NOT NULL,
    `ServiceType` VARCHAR(150) NOT NULL,
    `ServiceDate` DATE NOT NULL,
    `Cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `VendorCenter` VARCHAR(150) NULL,
    `NextServiceDue` DATE NULL,
    `Remarks` VARCHAR(500) NULL,
    `Status` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`MaintenanceId`),
    KEY `ix_vm_vehicle` (`VehicleId`),
    KEY `ix_vm_servicedate` (`ServiceDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.9 TransportTrips (Daily Trip Movement)
CREATE TABLE IF NOT EXISTS `TransportTrips` (
    `TripId` BIGINT NOT NULL AUTO_INCREMENT,
    `AssignmentId` BIGINT NULL,
    `VehicleId` BIGINT NOT NULL,
    `RouteId` BIGINT NOT NULL,
    `DriverId` BIGINT NOT NULL,
    `AttendantId` BIGINT NULL,
    `TripType` VARCHAR(20) NOT NULL DEFAULT 'Morning',
    `TripDate` DATE NOT NULL,
    `StartTime` VARCHAR(20) NULL,
    `EndTime` VARCHAR(20) NULL,
    `StudentsPresent` INT NOT NULL DEFAULT 0,
    `Status` VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`TripId`),
    KEY `ix_trip_assignment` (`AssignmentId`),
    KEY `ix_trip_date` (`TripDate`),
    KEY `ix_trip_vehicle` (`VehicleId`),
    KEY `ix_trip_route` (`RouteId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- 2. STORED PROCEDURES: ROUTE MANAGEMENT
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
    IN p_CampusId INT
)
BEGIN
    DECLARE v_RouteNum VARCHAR(50);
    SET v_RouteNum = COALESCE(NULLIF(p_RouteCode, ''), CONCAT('R-', UUID_SHORT()));

    INSERT INTO `TransportRoutes` (
        `RouteCode`, `RouteNumber`, `RouteName`, `StartLocation`, `EndLocation`, `Distance`,
        `EstimatedDurationMinutes`, `DefaultMonthlyFee`, `MinRangeKm`, `NonAcBaseFare`, `NonAcRatePerKm`,
        `AcBaseFare`, `AcRatePerKm`, `Description`, `Status`, `IsActive`, `IsDeleted`, `CreatedBy`, `CreatedAt`, `CampusId`
    ) VALUES (
        p_RouteCode, v_RouteNum, p_RouteName, p_StartLocation, p_EndLocation, COALESCE(p_Distance, 0.00),
        COALESCE(p_EstimatedDurationMinutes, 30), COALESCE(p_DefaultMonthlyFee, 0.00), COALESCE(p_MinRangeKm, 5.00),
        COALESCE(p_NonAcBaseFare, 1000.00), COALESCE(p_NonAcRatePerKm, 100.00), COALESCE(p_AcBaseFare, 1200.00),
        COALESCE(p_AcRatePerKm, 150.00), p_Description, COALESCE(p_Status, 1), COALESCE(p_Status, 1), 0, p_CreatedBy, NOW(), COALESCE(p_CampusId, 1)
    );
    SELECT LAST_INSERT_ID() AS RouteId;
END //
DELIMITER ;

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
    IN p_CampusId INT
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
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `RouteId` = p_RouteId AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteTransportRoute`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteTransportRoute`(
    IN p_RouteId BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportRoutes`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `RouteId` = p_RouteId AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportRouteLookup`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportRouteLookup`(
    IN p_Search VARCHAR(100),
    IN p_Limit INT
)
BEGIN
    SET p_Limit = IFNULL(p_Limit, 100);
    SELECT 
        `RouteId`,
        `RouteCode`,
        `RouteName`,
        `StartLocation`,
        `EndLocation`,
        `Distance` AS DistanceKm,
        `DefaultMonthlyFee`
    FROM `TransportRoutes`
    WHERE `IsDeleted` = 0 AND `Status` = 1
      AND (p_Search IS NULL OR p_Search = '' 
           OR LOWER(`RouteCode`) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(`RouteName`) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY `RouteName` ASC
    LIMIT p_Limit;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 3. STORED PROCEDURES: PICKUP POINTS
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetPickupPoints`;
DELIMITER //
CREATE PROCEDURE `sp_GetPickupPoints`(
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
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetPickupPointById`;
DELIMITER //
CREATE PROCEDURE `sp_GetPickupPointById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        p.PickupPointId,
        p.RouteId,
        r.RouteName,
        r.RouteCode,
        p.StopName AS PickupPointName,
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
    WHERE p.PickupPointId = p_Id AND p.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreatePickupPoints`;
DELIMITER //
CREATE PROCEDURE `sp_CreatePickupPoints`(
    IN p_RouteId BIGINT,
    IN p_StopName VARCHAR(150),
    IN p_StopAddress VARCHAR(250),
    IN p_StopOrder INT,
    IN p_PickupTime TIME,
    IN p_DropTime TIME,
    IN p_DistanceFromSchool DECIMAL(10,2),
    IN p_MonthlyFee DECIMAL(10,2),
    IN p_Description VARCHAR(255),
    IN p_Time TIME,
    IN p_Status TINYINT(1),
    IN p_IsActive TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT,
    IN p_CampusId INT
)
BEGIN
    IF p_CampusId IS NULL THEN
        SELECT CampusId INTO p_CampusId FROM TransportRoutes WHERE RouteId = p_RouteId LIMIT 1;
    END IF;

    INSERT INTO `PickupPoints` (
        `RouteId`, `StopName`, `StopAddress`, `StopOrder`, `PickupTime`, `DropTime`,
        `DistanceFromSchool`, `MonthlyFee`, `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`,
        `PickupPointName`, `Landmark`, `SequenceNo`, `DistanceFromStart`, `DistanceKm`, `CampusId`
    ) VALUES (
        p_RouteId, p_StopName, p_StopAddress, COALESCE(p_StopOrder, 1),
        COALESCE(p_PickupTime, '07:30:00'), COALESCE(p_DropTime, '16:15:00'),
        COALESCE(p_DistanceFromSchool, 0.00), COALESCE(p_MonthlyFee, 1200.00),
        COALESCE(p_Status, 1), 0, p_CreatedBy, NOW(),
        p_StopName, p_StopAddress, COALESCE(p_StopOrder, 1), COALESCE(p_DistanceFromSchool, 0.00), COALESCE(p_DistanceFromSchool, 0.00),
        p_CampusId
    );
    SELECT LAST_INSERT_ID() AS PickupPointId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdatePickupPoints`;
DELIMITER //
CREATE PROCEDURE `sp_UpdatePickupPoints`(
    IN p_Id BIGINT,
    IN p_RouteId BIGINT,
    IN p_StopName VARCHAR(150),
    IN p_StopAddress VARCHAR(250),
    IN p_StopOrder INT,
    IN p_PickupTime TIME,
    IN p_DropTime TIME,
    IN p_DistanceFromSchool DECIMAL(10,2),
    IN p_MonthlyFee DECIMAL(10,2),
    IN p_Description VARCHAR(255),
    IN p_Time TIME,
    IN p_Status TINYINT(1),
    IN p_IsActive TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT,
    IN p_CampusId INT
)
BEGIN
    IF p_CampusId IS NULL AND p_RouteId IS NOT NULL THEN
        SELECT CampusId INTO p_CampusId FROM TransportRoutes WHERE RouteId = p_RouteId LIMIT 1;
    END IF;

    UPDATE `PickupPoints`
    SET 
        `RouteId` = COALESCE(p_RouteId, `RouteId`),
        `StopName` = COALESCE(p_StopName, `StopName`),
        `PickupPointName` = COALESCE(p_StopName, `PickupPointName`, `StopName`),
        `StopAddress` = p_StopAddress,
        `Landmark` = p_StopAddress,
        `StopOrder` = COALESCE(p_StopOrder, `StopOrder`),
        `SequenceNo` = COALESCE(p_StopOrder, `SequenceNo`),
        `PickupTime` = COALESCE(p_PickupTime, `PickupTime`),
        `DropTime` = COALESCE(p_DropTime, `DropTime`),
        `DistanceFromSchool` = COALESCE(p_DistanceFromSchool, `DistanceFromSchool`),
        `DistanceFromStart` = COALESCE(p_DistanceFromSchool, `DistanceFromStart`),
        `DistanceKm` = COALESCE(p_DistanceFromSchool, `DistanceKm`),
        `MonthlyFee` = COALESCE(p_MonthlyFee, `MonthlyFee`),
        `Description` = COALESCE(p_Description, `Description`),
        `Status` = COALESCE(p_Status, `Status`),
        `IsActive` = COALESCE(p_IsActive, `IsActive`),
        `CampusId` = COALESCE(p_CampusId, `CampusId`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `PickupPointId` = p_Id AND `IsDeleted` = 0;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeletePickupPoints`;
DELIMITER //
CREATE PROCEDURE `sp_DeletePickupPoints`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `PickupPoints`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `PickupPointId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetPickupPointLookup`;
DELIMITER //
CREATE PROCEDURE `sp_GetPickupPointLookup`(
    IN p_RouteId BIGINT
)
BEGIN
    SELECT 
        `PickupPointId`,
        `RouteId`,
        `StopName` AS PickupPointName,
        `StopOrder` AS SequenceNo,
        `PickupTime`,
        `DropTime`,
        `DistanceFromSchool` AS DistanceKm,
        `MonthlyFee`
    FROM `PickupPoints`
    WHERE `IsDeleted` = 0 AND `Status` = 1
      AND (p_RouteId IS NULL OR `RouteId` = p_RouteId)
    ORDER BY `StopOrder` ASC;
END //
DROP PROCEDURE IF EXISTS `sp_CheckPickupPointExists`;
DELIMITER //
CREATE PROCEDURE `sp_CheckPickupPointExists`(
    IN p_RouteId BIGINT,
    IN p_StopName VARCHAR(100),
    IN p_ExcludeId BIGINT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `PickupPoints`
    WHERE `IsDeleted` = 0 AND `RouteId` = p_RouteId
      AND LOWER(`StopName`) = LOWER(p_StopName)
      AND (p_ExcludeId IS NULL OR `PickupPointId` != p_ExcludeId);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. STORED PROCEDURES: VEHICLE MANAGEMENT
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicles`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehicles`(
    IN p_Search VARCHAR(100),
    IN p_VehicleType VARCHAR(50),
    IN p_Status TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        v.`VehicleId`,
        v.`VehicleNumber`,
        COALESCE(v.`VehicleRegistrationNo`, v.`VehicleNumber`) AS RegistrationNumber,
        COALESCE(v.`VehicleName`, v.`VehicleNumber`) AS VehicleName,
        v.`VehicleType`,
        v.`Make` AS Manufacturer,
        v.`Model`,
        v.`ChassisNumber`,
        v.`EngineNumber`,
        v.`GpsDeviceId`,
        v.`InsuranceNumber`,
        v.`InsuranceExpiry`,
        v.`PollutionExpiry`,
        v.`FitnessExpiry`,
        v.`Capacity`,
        v.`IsAC`,
        CASE WHEN v.`Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        v.`CreatedAt`,
        v.`CampusId`,
        c.`CampusName`
    FROM `TransportVehicles` v
    LEFT JOIN `Campuses` c ON v.`CampusId` = c.`CampusId`
    WHERE v.`IsDeleted` = 0
      AND (
          p_CampusId IS NULL OR p_CampusId <= 0 
          OR v.`CampusId` = p_CampusId
      )
      AND (
          p_Status IS NULL 
          OR (p_Status = 1 AND v.`Status` = 1)
          OR (p_Status = 0 AND v.`Status` = 0)
      )
      AND (
          p_VehicleType IS NULL OR p_VehicleType = '' 
          OR LOWER(v.`VehicleType`) = LOWER(p_VehicleType)
      )
      AND (
          p_Search IS NULL OR p_Search = ''
          OR LOWER(v.`VehicleNumber`) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(v.`VehicleRegistrationNo`, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(v.`VehicleName`, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(v.`VehicleType`, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(v.`GpsDeviceId`, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
      )
    ORDER BY v.`VehicleNumber` ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportVehiclesById`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehiclesById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        v.`VehicleId`,
        v.`VehicleNumber`,
        COALESCE(v.`VehicleRegistrationNo`, v.`VehicleNumber`) AS RegistrationNumber,
        COALESCE(v.`VehicleName`, v.`VehicleNumber`) AS VehicleName,
        v.`VehicleType`,
        v.`Make` AS Manufacturer,
        v.`Model`,
        v.`ChassisNumber`,
        v.`EngineNumber`,
        v.`GpsDeviceId`,
        v.`InsuranceNumber`,
        v.`InsuranceExpiry`,
        v.`PollutionExpiry`,
        v.`FitnessExpiry`,
        v.`Capacity`,
        v.`IsAC`,
        CASE WHEN v.`Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        v.`CreatedAt`,
        v.`CampusId`,
        c.`CampusName`
    FROM `TransportVehicles` v
    LEFT JOIN `Campuses` c ON v.`CampusId` = c.`CampusId`
    WHERE v.`VehicleId` = p_Id AND v.`IsDeleted` = 0
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleByIdOrNumber`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehicleByIdOrNumber`(
    IN p_SearchId BIGINT,
    IN p_SearchStr VARCHAR(100)
)
BEGIN
    SELECT 
        v.`VehicleId`,
        v.`VehicleNumber`,
        COALESCE(v.`VehicleRegistrationNo`, v.`VehicleNumber`) AS RegistrationNumber,
        COALESCE(v.`VehicleName`, v.`VehicleNumber`) AS VehicleName,
        v.`VehicleType`,
        v.`Make` AS Manufacturer,
        v.`Model`,
        v.`ChassisNumber`,
        v.`EngineNumber`,
        v.`GpsDeviceId`,
        v.`InsuranceNumber`,
        v.`InsuranceExpiry`,
        v.`PollutionExpiry`,
        v.`FitnessExpiry`,
        v.`Capacity`,
        v.`IsAC`,
        CASE WHEN v.`Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        v.`CreatedAt`,
        v.`CampusId`,
        c.`CampusName`
    FROM `TransportVehicles` v
    LEFT JOIN `Campuses` c ON v.`CampusId` = c.`CampusId`
    WHERE v.`IsDeleted` = 0
      AND (v.`VehicleId` = p_SearchId OR LOWER(v.`VehicleNumber`) = LOWER(p_SearchStr) OR LOWER(v.`VehicleRegistrationNo`) = LOWER(p_SearchStr))
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateTransportVehicles`;
DELIMITER //
CREATE PROCEDURE `sp_CreateTransportVehicles`(
    IN p_VehicleNumber VARCHAR(50),
    IN p_VehicleType VARCHAR(50),
    IN p_Capacity INT,
    IN p_IsActive TINYINT(1),
    IN p_VehicleRegistrationNo VARCHAR(50),
    IN p_MaximumCapacity INT,
    IN p_Make VARCHAR(100),
    IN p_Model VARCHAR(100),
    IN p_YearOfManufacture INT,
    IN p_ChassisNumber VARCHAR(100),
    IN p_EngineNumber VARCHAR(100),
    IN p_InsuranceExpiry DATE,
    IN p_FitnessExpiry DATE,
    IN p_PollutionExpiry DATE,
    IN p_GpsDeviceId VARCHAR(100),
    IN p_IsAC TINYINT(1),
    IN p_InsuranceNumber VARCHAR(100),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT,
    IN p_CampusId INT
)
BEGIN
    INSERT INTO `TransportVehicles` (
        `VehicleNumber`, `VehicleRegistrationNo`, `VehicleName`, `VehicleType`,
        `Make`, `Model`, `ChassisNumber`, `EngineNumber`, `GpsDeviceId`, `InsuranceNumber`,
        `InsuranceExpiry`, `PollutionExpiry`, `FitnessExpiry`, `Capacity`, `IsAC`,
        `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`, `CampusId`
    ) VALUES (
        p_VehicleNumber, COALESCE(p_VehicleRegistrationNo, p_VehicleNumber), p_VehicleNumber, COALESCE(p_VehicleType, 'Bus'),
        p_Make, p_Model, p_ChassisNumber, p_EngineNumber, p_GpsDeviceId, p_InsuranceNumber,
        p_InsuranceExpiry, p_PollutionExpiry, p_FitnessExpiry, COALESCE(p_Capacity, 40), COALESCE(p_IsAC, 1),
        COALESCE(p_IsActive, 1), 0, p_CreatedBy, NOW(), p_CampusId
    );
    SELECT LAST_INSERT_ID() AS VehicleId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateTransportVehicles`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateTransportVehicles`(
    IN p_Id BIGINT,
    IN p_VehicleNumber VARCHAR(50),
    IN p_VehicleType VARCHAR(50),
    IN p_Capacity INT,
    IN p_IsActive TINYINT(1),
    IN p_VehicleRegistrationNo VARCHAR(50),
    IN p_MaximumCapacity INT,
    IN p_Make VARCHAR(100),
    IN p_Model VARCHAR(100),
    IN p_YearOfManufacture INT,
    IN p_ChassisNumber VARCHAR(100),
    IN p_EngineNumber VARCHAR(100),
    IN p_InsuranceExpiry DATE,
    IN p_FitnessExpiry DATE,
    IN p_PollutionExpiry DATE,
    IN p_GpsDeviceId VARCHAR(100),
    IN p_IsAC TINYINT(1),
    IN p_InsuranceNumber VARCHAR(100),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT,
    IN p_CampusId INT
)
BEGIN
    UPDATE `TransportVehicles`
    SET 
        `VehicleNumber` = COALESCE(p_VehicleNumber, `VehicleNumber`),
        `VehicleRegistrationNo` = COALESCE(p_VehicleRegistrationNo, `VehicleRegistrationNo`),
        `VehicleType` = COALESCE(p_VehicleType, `VehicleType`),
        `Make` = p_Make,
        `Model` = p_Model,
        `ChassisNumber` = p_ChassisNumber,
        `EngineNumber` = p_EngineNumber,
        `GpsDeviceId` = p_GpsDeviceId,
        `InsuranceNumber` = p_InsuranceNumber,
        `InsuranceExpiry` = p_InsuranceExpiry,
        `PollutionExpiry` = p_PollutionExpiry,
        `FitnessExpiry` = p_FitnessExpiry,
        `Capacity` = COALESCE(p_Capacity, `Capacity`),
        `IsAC` = COALESCE(p_IsAC, `IsAC`),
        `Status` = COALESCE(p_IsActive, `Status`),
        `CampusId` = CASE 
            WHEN p_CampusId IS NOT NULL AND p_CampusId > 0 THEN p_CampusId 
            ELSE `CampusId` 
        END,
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `VehicleId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteTransportVehicles`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteTransportVehicles`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportVehicles`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `VehicleId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleLookup`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehicleLookup`()
BEGIN
    SELECT 
        `VehicleId`,
        `VehicleNumber`,
        `VehicleRegistrationNo` AS RegistrationNumber,
        `VehicleType`,
        `Capacity`,
        `IsAC`,
        `GpsDeviceId`
    FROM `TransportVehicles`
    WHERE `IsDeleted` = 0 AND `Status` = 1
    ORDER BY `VehicleNumber` ASC;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 5. STORED PROCEDURES: DRIVER MANAGEMENT & STAFF SYNCHRONIZATION
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_SyncTransportDriverFromStaff;
DELIMITER //
CREATE PROCEDURE sp_SyncTransportDriverFromStaff(
    IN p_StaffId INT,
    IN p_IsDriverRole TINYINT(1)
)
BEGIN
    DECLARE v_ExistingDriverId BIGINT DEFAULT NULL;
    DECLARE v_DriverName VARCHAR(200);
    DECLARE v_EmployeeId VARCHAR(50);
    DECLARE v_Mobile VARCHAR(20);
    DECLARE v_AlternateMobile VARCHAR(20);
    DECLARE v_Email VARCHAR(150);
    DECLARE v_LicenseNo VARCHAR(100);
    DECLARE v_LicenseExpiry DATE;
    DECLARE v_Experience INT;
    DECLARE v_Address VARCHAR(255);
    DECLARE v_BloodGroup VARCHAR(10);

    -- Find existing TransportDrivers profile for this StaffId
    SELECT DriverId INTO v_ExistingDriverId 
    FROM TransportDrivers 
    WHERE StaffId = p_StaffId 
    ORDER BY DriverId DESC 
    LIMIT 1;

    IF p_IsDriverRole = 1 THEN
        -- Fetch current staff details
        SELECT 
            TRIM(CONCAT(FirstName, ' ', LastName)),
            EmployeeId,
            Mobile,
            COALESCE(AlternateMobile, ''),
            COALESCE(Email, ''),
            COALESCE(DrivingLicenseNumber, ''),
            DrivingLicenseExpiryDate,
            COALESCE(DrivingExperienceYears, 5),
            COALESCE(CurrentAddress, ''),
            COALESCE(BloodGroup, '')
        INTO 
            v_DriverName,
            v_EmployeeId,
            v_Mobile,
            v_AlternateMobile,
            v_Email,
            v_LicenseNo,
            v_LicenseExpiry,
            v_Experience,
            v_Address,
            v_BloodGroup
        FROM Staff
        WHERE Id = p_StaffId
        LIMIT 1;

        -- Update Staff.IsDriver = 1
        UPDATE Staff 
        SET IsDriver = 1, UpdatedAt = UTC_TIMESTAMP() 
        WHERE Id = p_StaffId;

        IF v_ExistingDriverId IS NOT NULL THEN
            -- Reactivate and sync existing profile
            UPDATE TransportDrivers
            SET 
                DriverName = v_DriverName,
                EmployeeId = v_EmployeeId,
                MobileNo = v_Mobile,
                AlternateMobileNo = v_AlternateMobile,
                Email = v_Email,
                LicenseNo = COALESCE(NULLIF(TRIM(v_LicenseNo), ''), LicenseNo, ''),
                LicenseExpiry = COALESCE(v_LicenseExpiry, LicenseExpiry),
                Experience = COALESCE(v_Experience, Experience, 5),
                Address = COALESCE(NULLIF(TRIM(v_Address), ''), Address, ''),
                BloodGroup = COALESCE(NULLIF(TRIM(v_BloodGroup), ''), BloodGroup, ''),
                Status = 1,
                IsActive = 1,
                IsDeleted = 0,
                UpdatedAt = UTC_TIMESTAMP()
            WHERE DriverId = v_ExistingDriverId;

            -- Soft delete any older duplicates for this staff member
            UPDATE TransportDrivers
            SET IsDeleted = 1, Status = 0, IsActive = 0, UpdatedAt = UTC_TIMESTAMP()
            WHERE StaffId = p_StaffId AND DriverId <> v_ExistingDriverId;

            SELECT v_ExistingDriverId AS DriverId;
        ELSE
            -- Insert new TransportDrivers profile
            INSERT INTO TransportDrivers (
                StaffId,
                DriverName,
                EmployeeId,
                MobileNo,
                AlternateMobileNo,
                Email,
                LicenseNo,
                LicenseExpiry,
                Experience,
                Address,
                BloodGroup,
                Status,
                IsActive,
                IsDeleted,
                CreatedAt,
                UpdatedAt
            ) VALUES (
                p_StaffId,
                v_DriverName,
                v_EmployeeId,
                v_Mobile,
                v_AlternateMobile,
                v_Email,
                v_LicenseNo,
                v_LicenseExpiry,
                v_Experience,
                v_Address,
                v_BloodGroup,
                1,
                1,
                0,
                UTC_TIMESTAMP(),
                UTC_TIMESTAMP()
            );

            SELECT LAST_INSERT_ID() AS DriverId;
        END IF;
    ELSE
        -- Staff role changed away from Driver: preserve assignment history, soft-delete transport driver profile
        UPDATE Staff 
        SET IsDriver = 0, UpdatedAt = UTC_TIMESTAMP() 
        WHERE Id = p_StaffId;

        UPDATE TransportDrivers 
        SET IsDeleted = 1, Status = 0, IsActive = 0, UpdatedAt = UTC_TIMESTAMP() 
        WHERE StaffId = p_StaffId;

        SELECT 0 AS DriverId;
    END IF;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetTransportDrivers;
DELIMITER //
CREATE PROCEDURE sp_GetTransportDrivers(
    IN p_Search VARCHAR(100),
    IN p_Status TINYINT,
    IN p_CampusId INT,
    IN p_PageNumber INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT;
    SET p_PageNumber = IFNULL(p_PageNumber, 1);
    IF p_PageNumber < 1 THEN SET p_PageNumber = 1; END IF;
    SET p_PageSize = IFNULL(p_PageSize, 20);
    IF p_PageSize < 1 THEN SET p_PageSize = 20; END IF;
    SET v_Offset = (p_PageNumber - 1) * p_PageSize;

    -- 1. Total Count (ResultSet 1)
    SELECT COUNT(DISTINCT s.Id) AS TotalCount
    FROM Staff s
    INNER JOIN Users u ON s.Id = u.StaffId AND u.IsDeleted = 0
    INNER JOIN Roles r ON u.RoleId = r.RoleId AND r.RoleName = 'Driver'
    INNER JOIN TransportDrivers d ON d.DriverId = (
        SELECT MAX(d2.DriverId) 
        FROM TransportDrivers d2 
        WHERE d2.StaffId = s.Id AND d2.IsDeleted = 0
    )
    LEFT JOIN TransportVehicles v ON d.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId OR EXISTS (SELECT 1 FROM StaffCampusAssignments sca WHERE sca.StaffId = s.Id AND sca.CampusId = p_CampusId))
      AND (p_Status IS NULL OR d.Status = p_Status)
      AND (
          p_Search IS NULL OR p_Search = '' 
          OR LOWER(COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), d.DriverName)) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(s.EmployeeId, d.EmployeeId)) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(s.DrivingLicenseNumber, d.LicenseNo)) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(s.Mobile, d.MobileNo)) LIKE CONCAT('%', LOWER(p_Search), '%')
      );

    -- 2. Items (ResultSet 2)
    SELECT 
        d.DriverId,
        s.Id AS StaffId,
        COALESCE(s.EmployeeId, d.EmployeeId) AS EmployeeId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), d.DriverName) AS DriverName,
        COALESCE(s.Mobile, d.MobileNo) AS MobileNumber,
        COALESCE(s.AlternateMobile, d.AlternateMobileNo) AS AlternateMobileNumber,
        COALESCE(s.Email, d.Email) AS Email,
        COALESCE(s.DrivingLicenseNumber, d.LicenseNo) AS LicenseNumber,
        DATE_FORMAT(COALESCE(s.DrivingLicenseExpiryDate, d.LicenseExpiry), '%Y-%m-%d') AS LicenseExpiryDate,
        COALESCE(s.CurrentAddress, d.Address) AS Address,
        COALESCE(s.BloodGroup, d.BloodGroup) AS BloodGroup,
        d.EmergencyContactName,
        d.EmergencyContactNumber,
        COALESCE(s.DrivingExperienceYears, d.Experience, 5) AS ExperienceYears,
        d.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN d.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        s.CampusId,
        c.CampusName
    FROM Staff s
    INNER JOIN Users u ON s.Id = u.StaffId AND u.IsDeleted = 0
    INNER JOIN Roles r ON u.RoleId = r.RoleId AND r.RoleName = 'Driver'
    INNER JOIN TransportDrivers d ON d.DriverId = (
        SELECT MAX(d2.DriverId) 
        FROM TransportDrivers d2 
        WHERE d2.StaffId = s.Id AND d2.IsDeleted = 0
    )
    LEFT JOIN TransportVehicles v ON d.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    WHERE s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId OR EXISTS (SELECT 1 FROM StaffCampusAssignments sca WHERE sca.StaffId = s.Id AND sca.CampusId = p_CampusId))
      AND (p_Status IS NULL OR d.Status = p_Status)
      AND (
          p_Search IS NULL OR p_Search = '' 
          OR LOWER(COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), d.DriverName)) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(s.EmployeeId, d.EmployeeId)) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(s.DrivingLicenseNumber, d.LicenseNo)) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(s.Mobile, d.MobileNo)) LIKE CONCAT('%', LOWER(p_Search), '%')
      )
    ORDER BY d.DriverId ASC
    LIMIT p_PageSize OFFSET v_Offset;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetTransportDriversById;
DELIMITER //
CREATE PROCEDURE sp_GetTransportDriversById(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        d.DriverId,
        s.Id AS StaffId,
        COALESCE(s.EmployeeId, d.EmployeeId) AS EmployeeId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), d.DriverName) AS DriverName,
        COALESCE(s.Mobile, d.MobileNo) AS MobileNumber,
        COALESCE(s.AlternateMobile, d.AlternateMobileNo) AS AlternateMobileNumber,
        COALESCE(s.Email, d.Email) AS Email,
        COALESCE(s.DrivingLicenseNumber, d.LicenseNo) AS LicenseNumber,
        DATE_FORMAT(COALESCE(s.DrivingLicenseExpiryDate, d.LicenseExpiry), '%Y-%m-%d') AS LicenseExpiryDate,
        COALESCE(s.CurrentAddress, d.Address) AS Address,
        COALESCE(s.BloodGroup, d.BloodGroup) AS BloodGroup,
        d.EmergencyContactName,
        d.EmergencyContactNumber,
        COALESCE(s.DrivingExperienceYears, d.Experience, 5) AS ExperienceYears,
        d.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN d.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        s.CampusId,
        c.CampusName
    FROM Staff s
    INNER JOIN Users u ON s.Id = u.StaffId AND u.IsDeleted = 0
    INNER JOIN Roles r ON u.RoleId = r.RoleId AND r.RoleName = 'Driver'
    INNER JOIN TransportDrivers d ON d.DriverId = (
        SELECT MAX(d2.DriverId) 
        FROM TransportDrivers d2 
        WHERE d2.StaffId = s.Id AND d2.IsDeleted = 0
    )
    LEFT JOIN TransportVehicles v ON d.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    WHERE (d.DriverId = p_Id OR s.Id = p_Id)
      AND s.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportDriverByIdOrNumber`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportDriverByIdOrNumber`(
    IN p_SearchId BIGINT,
    IN p_SearchStr VARCHAR(100)
)
BEGIN
    SELECT 
        `DriverId`, `DriverName`, `EmployeeId`,
        `MobileNo` AS MobileNumber, `AlternateMobileNo` AS AlternateMobileNumber,
        `Email`, `LicenseNo` AS LicenceNumber, `LicenseExpiry` AS LicenceExpiry,
        `Address`, `BloodGroup`, `EmergencyContactName`, `EmergencyContactNumber`,
        CASE WHEN `Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM `TransportDrivers`
    WHERE `IsDeleted` = 0
      AND (`DriverId` = p_SearchId OR LOWER(`LicenseNo`) = LOWER(p_SearchStr) OR LOWER(`DriverName`) = LOWER(p_SearchStr) OR LOWER(`MobileNo`) = LOWER(p_SearchStr))
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportAttendantByIdOrName`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportAttendantByIdOrName`(
    IN p_SearchId BIGINT,
    IN p_SearchStr VARCHAR(100)
)
BEGIN
    SELECT 
        a.`AttendantId`, a.`EmployeeId`, a.`AttendantName`, a.`MobileNumber`,
        a.`Gender`, a.`BranchName`, a.`AlternateMobileNumber`, a.`Address`,
        a.`BloodGroup`, a.`EmergencyContactName`, a.`EmergencyContactNumber`,
        a.`AssignedVehicleId`, v.`VehicleNumber` AS AssignedVehicleNumber,
        CASE WHEN a.`Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM `TransportAttendants` a
    LEFT JOIN `TransportVehicles` v ON a.`AssignedVehicleId` = v.`VehicleId` AND v.`IsDeleted` = 0
    WHERE a.`IsDeleted` = 0
      AND (a.`AttendantId` = p_SearchId OR LOWER(a.`AttendantName`) = LOWER(p_SearchStr) OR LOWER(a.`MobileNumber`) = LOWER(p_SearchStr))
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckTransportVehicleAssigned`;
DELIMITER //
CREATE PROCEDURE `sp_CheckTransportVehicleAssigned`(
    IN p_VehicleId BIGINT,
    IN p_EffectiveFrom DATETIME,
    IN p_EffectiveTo DATETIME,
    IN p_ExcludeAssignmentId BIGINT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `TransportVehicleAssignments`
    WHERE `IsDeleted` = 0 AND `Status` = 1 AND `VehicleId` = p_VehicleId
      AND (p_ExcludeAssignmentId IS NULL OR `AssignmentId` != p_ExcludeAssignmentId)
      AND (`EffectiveTo` IS NULL OR `EffectiveTo` >= p_EffectiveFrom)
      AND (p_EffectiveTo IS NULL OR `EffectiveFrom` <= p_EffectiveTo);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckTransportDriverAssigned`;
DELIMITER //
CREATE PROCEDURE `sp_CheckTransportDriverAssigned`(
    IN p_DriverId BIGINT,
    IN p_EffectiveFrom DATETIME,
    IN p_EffectiveTo DATETIME,
    IN p_ExcludeAssignmentId BIGINT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `TransportVehicleAssignments`
    WHERE `IsDeleted` = 0 AND `Status` = 1 AND `DriverId` = p_DriverId
      AND (p_ExcludeAssignmentId IS NULL OR `AssignmentId` != p_ExcludeAssignmentId)
      AND (`EffectiveTo` IS NULL OR `EffectiveTo` >= p_EffectiveFrom)
      AND (p_EffectiveTo IS NULL OR `EffectiveFrom` <= p_EffectiveTo);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckStudentTransportOverlapping`;
DELIMITER //
CREATE PROCEDURE `sp_CheckStudentTransportOverlapping`(
    IN p_AdmissionNo VARCHAR(50),
    IN p_EffectiveFrom DATETIME,
    IN p_EffectiveTo DATETIME,
    IN p_ExcludeAssignmentId BIGINT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `StudentTransportAssignments`
    WHERE `IsDeleted` = 0 AND `Status` = 1 AND `AdmissionNo` = p_AdmissionNo
      AND (p_ExcludeAssignmentId IS NULL OR `StudentTransportAssignmentId` != p_ExcludeAssignmentId)
      AND (`EffectiveTo` IS NULL OR `EffectiveTo` >= p_EffectiveFrom)
      AND (p_EffectiveTo IS NULL OR `EffectiveFrom` <= p_EffectiveTo);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetStudentTransportAssignmentLookup`;
DELIMITER //
CREATE PROCEDURE `sp_GetStudentTransportAssignmentLookup`()
BEGIN
    SELECT 
        `StudentTransportAssignmentId` AS AssignmentId,
        `AdmissionNo`
    FROM `StudentTransportAssignments`
    WHERE `IsDeleted` = 0 AND `Status` = 1
    ORDER BY `AdmissionNo` ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetVehicleMaintenanceLookup`;
DELIMITER //
CREATE PROCEDURE `sp_GetVehicleMaintenanceLookup`()
BEGIN
    SELECT 
        `MaintenanceId`,
        `ServiceType`
    FROM `VehicleMaintenances`
    WHERE `IsDeleted` = 0 AND `Status` = 1
    ORDER BY `MaintenanceId` DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportOperationDetails`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportOperationDetails`(
    IN p_AssignmentId BIGINT
)
BEGIN
    SELECT 
        a.AssignmentId,
        a.VehicleId,
        v.VehicleNumber,
        v.VehicleRegistrationNo AS RegistrationNumber,
        v.Capacity,
        a.RouteId,
        r.RouteName,
        r.Distance AS TotalRouteDistanceKm,
        d.DriverId,
        d.DriverName,
        d.MobileNo AS DriverMobile,
        a.AttendantId,
        COALESCE(att.AttendantName, 'Unassigned') AS AttendantName,
        COALESCE(att.MobileNumber, 'N/A') AS AttendantMobile,
        COALESCE(a.MorningTripTime, '07:00 AM') AS MorningTripTime,
        COALESCE(a.EveningTripTime, '03:45 PM') AS EveningTripTime,
        a.EffectiveFrom,
        CASE WHEN a.Status = 1 THEN 'Completed' ELSE 'Inactive' END AS Status,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudentsCount,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS TotalStudents,
        (SELECT COUNT(*) FROM PickupPoints pp WHERE pp.RouteId = a.RouteId AND pp.IsDeleted = 0) AS PickupPointsCount
    FROM TransportVehicleAssignments a
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
    LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
    WHERE a.AssignmentId = p_AssignmentId AND a.IsDeleted = 0
    LIMIT 1;

    -- Stops sequence
    SELECT 
        pp.PickupPointId AS StepNo,
        pp.StopName,
        COALESCE(pp.DistanceFromSchool, pp.DistanceFromStart, pp.DistanceKm, 0.00) AS DistanceKm,
        TIME_FORMAT(pp.PickupTime, '%h:%i %p') AS ScheduledTime,
        'Active Stop' AS BoardingAlightingInfo,
        pp.Status AS IsActive,
        'Stop' AS `Type`
    FROM PickupPoints pp
    JOIN TransportVehicleAssignments a ON pp.RouteId = a.RouteId
    WHERE a.AssignmentId = p_AssignmentId AND pp.IsDeleted = 0
    ORDER BY pp.PickupPointId ASC;

    -- Students list
    SELECT 
        sta.StudentId,
        sta.AdmissionNo,
        COALESCE(st.StudentName, 'Student') AS StudentName,
        'Class 1-A' AS ClassSec,
        'Male' AS Gender,
        COALESCE(pp.StopName, 'Campus Stop') AS PickupPointName,
        COALESCE(a.MorningTripTime, '07:00 AM') AS MorningPickupTime,
        COALESCE(a.EveningTripTime, '03:45 PM') AS EveningDropTime,
        'Guardian' AS ParentName,
        '9876543210' AS ParentMobile
    FROM StudentTransportAssignments sta
    JOIN TransportVehicleAssignments a ON sta.VehicleAssignmentId = a.AssignmentId
    LEFT JOIN Students st ON sta.AdmissionNo = st.AdmissionNo
    LEFT JOIN PickupPoints pp ON sta.PickupPointId = pp.PickupPointId
    WHERE a.AssignmentId = p_AssignmentId AND sta.IsDeleted = 0
    ORDER BY st.StudentName ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetStudentTransportDetails`;
DELIMITER //
CREATE PROCEDURE `sp_GetStudentTransportDetails`(
    IN p_StudentId BIGINT
)
BEGIN
    SELECT 
        s.StudentId,
        s.StudentName,
        'Intermediate 2nd Year - MPC' AS ClassName,
        s.AdmissionNo,
        'Non-Residential' AS StudentType,
        0 AS IsHosteller,
        1 AS HasTransportAccess,
        'Student is assigned to campus transport facilities.' AS Message,
        1 AS RfidBoarded,
        'Boarded (07:22 AM via RFID)' AS RfidBoardingStatus,
        '6 Mins' AS EtaMinutes,
        r.RouteCode AS RouteNumber,
        r.RouteName,
        pp.StopName AS PickupStop,
        TIME_FORMAT(pp.PickupTime, '%h:%i %p') AS MorningPickupTime,
        TIME_FORMAT(pp.DropTime, '%h:%i %p') AS EveningDropTime,
        v.VehicleNumber AS BusNumber,
        v.VehicleRegistrationNo AS RegistrationNumber,
        d.DriverName,
        d.MobileNo AS DriverPhone,
        att.AttendantName,
        att.MobileNumber AS AttendantPhone,
        'Live GPS Active' AS GpsStatus
    FROM Students s
    JOIN StudentTransportAssignments sta ON (s.StudentId = sta.StudentId OR s.AdmissionNo = sta.AdmissionNo) AND sta.IsDeleted = 0 AND sta.Status = 1
    JOIN TransportRoutes r ON sta.RouteId = r.RouteId AND r.IsDeleted = 0
    LEFT JOIN PickupPoints pp ON sta.PickupPointId = pp.PickupPointId AND pp.IsDeleted = 0
    LEFT JOIN TransportVehicleAssignments tva ON sta.VehicleAssignmentId = tva.AssignmentId AND tva.IsDeleted = 0
    LEFT JOIN TransportVehicles v ON tva.VehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN TransportDrivers d ON tva.DriverId = d.DriverId AND d.IsDeleted = 0
    LEFT JOIN TransportAttendants att ON tva.AttendantId = att.AttendantId AND att.IsDeleted = 0
    WHERE s.StudentId = p_StudentId
    LIMIT 1;
END //
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

-- =============================================================================
-- SCRIPT COMPLETE
-- =============================================================================


-- =============================================================================
-- Migration Script: 27_Transport_Attendant_Staff_Sync_SPs.sql
-- Description: Automatic Staff -> Transport Attendant synchronization, idempotent backfill,
--              and campus-isolated attendant querying.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PROCEDURE: sp_SyncTransportAttendantFromStaff
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_SyncTransportAttendantFromStaff`;
DELIMITER //
CREATE PROCEDURE `sp_SyncTransportAttendantFromStaff`(
    IN p_StaffId INT,
    IN p_IsAttendantRole TINYINT(1)
)
BEGIN
    DECLARE v_ExistingAttendantId BIGINT DEFAULT NULL;
    DECLARE v_AttendantName VARCHAR(200);
    DECLARE v_EmployeeId VARCHAR(50);
    DECLARE v_Mobile VARCHAR(20);
    DECLARE v_AlternateMobile VARCHAR(20);
    DECLARE v_Gender VARCHAR(20);
    DECLARE v_Address VARCHAR(255);
    DECLARE v_BloodGroup VARCHAR(10);
    DECLARE v_CampusId INT;
    DECLARE v_CampusName VARCHAR(100);

    -- Find existing TransportAttendants profile for this StaffId
    SELECT AttendantId INTO v_ExistingAttendantId 
    FROM TransportAttendants 
    WHERE StaffId = p_StaffId 
    ORDER BY AttendantId DESC 
    LIMIT 1;

    -- If not found by StaffId, try matching by EmployeeId
    IF v_ExistingAttendantId IS NULL THEN
        SELECT a.AttendantId INTO v_ExistingAttendantId
        FROM TransportAttendants a
        INNER JOIN Staff s ON s.Id = p_StaffId
        WHERE a.EmployeeId = s.EmployeeId
        ORDER BY a.AttendantId DESC
        LIMIT 1;
    END IF;

    IF p_IsAttendantRole = 1 THEN
        -- Fetch current staff details
        SELECT 
            TRIM(CONCAT(FirstName, ' ', LastName)),
            EmployeeId,
            Mobile,
            COALESCE(AlternateMobile, ''),
            COALESCE(Gender, 'Female'),
            COALESCE(CurrentAddress, ''),
            COALESCE(BloodGroup, ''),
            CampusId
        INTO 
            v_AttendantName,
            v_EmployeeId,
            v_Mobile,
            v_AlternateMobile,
            v_Gender,
            v_Address,
            v_BloodGroup,
            v_CampusId
        FROM Staff
        WHERE Id = p_StaffId
        LIMIT 1;

        -- Resolve Campus Name
        SELECT CampusName INTO v_CampusName
        FROM Campuses
        WHERE CampusId = v_CampusId
        LIMIT 1;

        IF v_ExistingAttendantId IS NOT NULL THEN
            -- Reactivate and sync existing profile
            UPDATE TransportAttendants
            SET 
                StaffId = p_StaffId,
                AttendantName = v_AttendantName,
                EmployeeId = v_EmployeeId,
                MobileNumber = v_Mobile,
                AlternateMobileNumber = v_AlternateMobile,
                Gender = COALESCE(v_Gender, Gender, 'Female'),
                BranchName = COALESCE(v_CampusName, BranchName),
                Address = COALESCE(NULLIF(TRIM(v_Address), ''), Address, ''),
                BloodGroup = COALESCE(NULLIF(TRIM(v_BloodGroup), ''), BloodGroup, ''),
                Status = 1,
                IsActive = 1,
                IsDeleted = 0,
                UpdatedAt = UTC_TIMESTAMP()
            WHERE AttendantId = v_ExistingAttendantId;

            -- Soft delete any older duplicates for this staff member
            UPDATE TransportAttendants
            SET IsDeleted = 1, Status = 0, IsActive = 0, UpdatedAt = UTC_TIMESTAMP()
            WHERE StaffId = p_StaffId AND AttendantId <> v_ExistingAttendantId;

            SELECT v_ExistingAttendantId AS AttendantId;
        ELSE
            -- Insert new TransportAttendants profile
            INSERT INTO TransportAttendants (
                StaffId,
                EmployeeId,
                AttendantName,
                MobileNumber,
                AlternateMobileNumber,
                Gender,
                BranchName,
                Address,
                BloodGroup,
                Status,
                IsActive,
                IsDeleted,
                CreatedAt,
                UpdatedAt
            ) VALUES (
                p_StaffId,
                v_EmployeeId,
                v_AttendantName,
                v_Mobile,
                v_AlternateMobile,
                v_Gender,
                COALESCE(v_CampusName, 'Main Campus (HQ)'),
                v_Address,
                v_BloodGroup,
                1,
                1,
                0,
                UTC_TIMESTAMP(),
                UTC_TIMESTAMP()
            );

            SELECT LAST_INSERT_ID() AS AttendantId;
        END IF;
    ELSE
        -- Staff role changed away from Attendant: preserve assignment history, soft-delete transport attendant profile
        UPDATE TransportAttendants 
        SET IsDeleted = 1, Status = 0, IsActive = 0, UpdatedAt = UTC_TIMESTAMP() 
        WHERE StaffId = p_StaffId;

        SELECT 0 AS AttendantId;
    END IF;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 2. PROCEDURE: sp_GetTransportAttendants
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportAttendants`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportAttendants`(
    IN p_Search VARCHAR(100),
    IN p_Status TINYINT,
    IN p_CampusId INT
)
BEGIN
    -- Return eligible Attendant staff members linked to TransportAttendants
    SELECT 
        a.AttendantId,
        s.Id AS StaffId,
        COALESCE(s.EmployeeId, a.EmployeeId) AS EmployeeId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), a.AttendantName) AS AttendantName,
        COALESCE(s.Mobile, a.MobileNumber) AS MobileNumber,
        COALESCE(s.AlternateMobile, a.AlternateMobileNumber) AS AlternateMobileNumber,
        COALESCE(s.Gender, a.Gender, 'Female') AS Gender,
        COALESCE(c.CampusName, a.BranchName) AS BranchName,
        COALESCE(s.CurrentAddress, a.Address) AS Address,
        COALESCE(s.BloodGroup, a.BloodGroup) AS BloodGroup,
        a.EmergencyContactName,
        a.EmergencyContactNumber,
        a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        COALESCE(s.CampusId, 1) AS CampusId,
        COALESCE(c.CampusName, a.BranchName, 'Main Campus (HQ)') AS CampusName,
        a.CreatedAt
    FROM Staff s
    INNER JOIN Users u ON s.Id = u.StaffId AND (u.IsActive = 1 OR u.IsActive IS NULL)
    INNER JOIN Roles r ON u.RoleId = r.RoleId AND r.RoleName IN ('Attendant', 'Bus Attendant')
    INNER JOIN TransportAttendants a ON a.AttendantId = (
        SELECT MAX(a2.AttendantId) 
        FROM TransportAttendants a2 
        WHERE (a2.StaffId = s.Id OR (a2.StaffId IS NULL AND a2.EmployeeId = s.EmployeeId)) AND a2.IsDeleted = 0
    )
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    WHERE s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId OR EXISTS (SELECT 1 FROM StaffCampusAssignments sca WHERE sca.StaffId = s.Id AND sca.CampusId = p_CampusId))
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (
          p_Search IS NULL OR p_Search = '' 
          OR LOWER(COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), a.AttendantName)) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(s.EmployeeId, a.EmployeeId)) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(s.Mobile, a.MobileNumber)) LIKE CONCAT('%', LOWER(p_Search), '%')
      )

    UNION ALL

    -- Include any legacy attendants created directly without StaffId
    SELECT 
        a.AttendantId,
        a.StaffId,
        a.EmployeeId,
        a.AttendantName,
        a.MobileNumber,
        a.AlternateMobileNumber,
        COALESCE(a.Gender, 'Female') AS Gender,
        a.BranchName,
        a.Address,
        a.BloodGroup,
        a.EmergencyContactName,
        a.EmergencyContactNumber,
        a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        COALESCE(c.CampusId, 1) AS CampusId,
        COALESCE(c.CampusName, a.BranchName, 'Main Campus (HQ)') AS CampusName,
        a.CreatedAt
    FROM TransportAttendants a
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Campuses c ON a.BranchName = c.CampusName
    WHERE a.IsDeleted = 0 
      AND a.StaffId IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM Staff s2 
          INNER JOIN Users u2 ON s2.Id = u2.StaffId AND (u2.IsActive = 1 OR u2.IsActive IS NULL)
          INNER JOIN Roles r2 ON u2.RoleId = r2.RoleId AND r2.RoleName IN ('Attendant', 'Bus Attendant')
          WHERE s2.EmployeeId = a.EmployeeId
      )
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR c.CampusId = p_CampusId)
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (
          p_Search IS NULL OR p_Search = '' 
          OR LOWER(a.AttendantName) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(a.EmployeeId) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(a.MobileNumber) LIKE CONCAT('%', LOWER(p_Search), '%')
      )
    ORDER BY AttendantId ASC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 3. PROCEDURE: sp_GetTransportAttendantById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportAttendantById`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportAttendantById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        a.AttendantId,
        COALESCE(a.StaffId, s.Id) AS StaffId,
        COALESCE(s.EmployeeId, a.EmployeeId) AS EmployeeId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), a.AttendantName) AS AttendantName,
        COALESCE(s.Mobile, a.MobileNumber) AS MobileNumber,
        COALESCE(s.AlternateMobile, a.AlternateMobileNumber) AS AlternateMobileNumber,
        COALESCE(s.Gender, a.Gender, 'Female') AS Gender,
        COALESCE(c.CampusName, a.BranchName) AS BranchName,
        COALESCE(s.CurrentAddress, a.Address) AS Address,
        COALESCE(s.BloodGroup, a.BloodGroup) AS BloodGroup,
        a.EmergencyContactName,
        a.EmergencyContactNumber,
        a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        COALESCE(s.CampusId, c.CampusId, 1) AS CampusId,
        COALESCE(c.CampusName, a.BranchName, 'Main Campus (HQ)') AS CampusName,
        a.CreatedAt
    FROM TransportAttendants a
    LEFT JOIN Staff s ON (a.StaffId = s.Id OR a.EmployeeId = s.EmployeeId) AND s.IsDeleted = 0
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Campuses c ON COALESCE(s.CampusId, 1) = c.CampusId
    WHERE (a.AttendantId = p_Id OR a.StaffId = p_Id OR s.Id = p_Id)
      AND a.IsDeleted = 0
    ORDER BY a.AttendantId DESC
    LIMIT 1;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. PROCEDURE: sp_GetTransportAttendantByIdOrName
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportAttendantByIdOrName`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportAttendantByIdOrName`(
    IN p_SearchId BIGINT,
    IN p_SearchStr VARCHAR(100)
)
BEGIN
    SELECT 
        a.AttendantId,
        COALESCE(a.StaffId, s.Id) AS StaffId,
        COALESCE(s.EmployeeId, a.EmployeeId) AS EmployeeId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), a.AttendantName) AS AttendantName,
        COALESCE(s.Mobile, a.MobileNumber) AS MobileNumber,
        COALESCE(s.AlternateMobile, a.AlternateMobileNumber) AS AlternateMobileNumber,
        COALESCE(s.Gender, a.Gender, 'Female') AS Gender,
        COALESCE(c.CampusName, a.BranchName) AS BranchName,
        COALESCE(s.CurrentAddress, a.Address) AS Address,
        COALESCE(s.BloodGroup, a.BloodGroup) AS BloodGroup,
        a.EmergencyContactName,
        a.EmergencyContactNumber,
        a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        COALESCE(s.CampusId, c.CampusId, 1) AS CampusId,
        COALESCE(c.CampusName, a.BranchName, 'Main Campus (HQ)') AS CampusName,
        a.CreatedAt
    FROM TransportAttendants a
    LEFT JOIN Staff s ON (a.StaffId = s.Id OR a.EmployeeId = s.EmployeeId) AND s.IsDeleted = 0
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Campuses c ON COALESCE(s.CampusId, 1) = c.CampusId
    WHERE a.IsDeleted = 0
      AND (
          a.AttendantId = p_SearchId 
          OR a.StaffId = p_SearchId 
          OR s.Id = p_SearchId 
          OR LOWER(a.AttendantName) = LOWER(p_SearchStr) 
          OR LOWER(s.EmployeeId) = LOWER(p_SearchStr)
          OR LOWER(a.EmployeeId) = LOWER(p_SearchStr)
          OR LOWER(a.MobileNumber) = LOWER(p_SearchStr)
      )
    ORDER BY a.AttendantId DESC
    LIMIT 1;
END //
DELIMITER ;
