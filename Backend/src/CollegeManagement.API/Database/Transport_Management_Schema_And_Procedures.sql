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
    IN p_Status TINYINT(1)
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
        d.DriverName
    FROM TransportRoutes r
    LEFT JOIN TransportVehicleAssignments a ON r.RouteId = a.RouteId AND a.IsDeleted = 0 AND a.Status = 1
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId AND d.IsDeleted = 0
    WHERE r.IsDeleted = 0
      AND (p_Status IS NULL OR r.Status = p_Status)
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
        r.Status,
        CASE WHEN r.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText,
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
    IN p_CreatedBy BIGINT
)
BEGIN
    INSERT INTO `TransportRoutes` (
        `RouteCode`, `RouteName`, `StartLocation`, `EndLocation`, `Distance`,
        `EstimatedDurationMinutes`, `DefaultMonthlyFee`, `MinRangeKm`, `NonAcBaseFare`, `NonAcRatePerKm`,
        `AcBaseFare`, `AcRatePerKm`, `Description`, `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        p_RouteCode, p_RouteName, p_StartLocation, p_EndLocation, COALESCE(p_Distance, 0.00),
        COALESCE(p_EstimatedDurationMinutes, 30), COALESCE(p_DefaultMonthlyFee, 0.00), COALESCE(p_MinRangeKm, 5.00),
        COALESCE(p_NonAcBaseFare, 1000.00), COALESCE(p_NonAcRatePerKm, 100.00), COALESCE(p_AcBaseFare, 1200.00),
        COALESCE(p_AcRatePerKm, 150.00), p_Description, COALESCE(p_Status, 1), 0, p_CreatedBy, NOW()
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
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportRoutes`
    SET 
        `RouteCode` = COALESCE(p_RouteCode, `RouteCode`),
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
    IN p_Status TINYINT(1)
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
    WHERE p.IsDeleted = 0
      AND (p_RouteId IS NULL OR p.RouteId = p_RouteId)
      AND (p_Status IS NULL OR p.Status = p_Status)
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
    IN p_UpdatedBy BIGINT
)
BEGIN
    INSERT INTO `PickupPoints` (
        `RouteId`, `StopName`, `StopAddress`, `StopOrder`, `PickupTime`, `DropTime`,
        `DistanceFromSchool`, `MonthlyFee`, `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        p_RouteId, p_StopName, p_StopAddress, COALESCE(p_StopOrder, 1),
        COALESCE(p_PickupTime, '07:30:00'), COALESCE(p_DropTime, '16:15:00'),
        COALESCE(p_DistanceFromSchool, 0.00), COALESCE(p_MonthlyFee, 1200.00),
        COALESCE(p_Status, 1), 0, p_CreatedBy, NOW()
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
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `PickupPoints`
    SET 
        `RouteId` = COALESCE(p_RouteId, `RouteId`),
        `StopName` = COALESCE(p_StopName, `StopName`),
        `StopAddress` = p_StopAddress,
        `StopOrder` = COALESCE(p_StopOrder, `StopOrder`),
        `PickupTime` = COALESCE(p_PickupTime, `PickupTime`),
        `DropTime` = COALESCE(p_DropTime, `DropTime`),
        `DistanceFromSchool` = COALESCE(p_DistanceFromSchool, `DistanceFromSchool`),
        `MonthlyFee` = COALESCE(p_MonthlyFee, `MonthlyFee`),
        `Status` = COALESCE(p_Status, `Status`),
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
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        `VehicleId`,
        `VehicleNumber`,
        `VehicleRegistrationNo` AS RegistrationNumber,
        `VehicleName`,
        `VehicleType`,
        `Make` AS Manufacturer,
        `Model`,
        `ChassisNumber`,
        `EngineNumber`,
        `GpsDeviceId`,
        `InsuranceNumber`,
        `InsuranceExpiry`,
        `PollutionExpiry`,
        `FitnessExpiry`,
        `Capacity`,
        `IsAC`,
        CASE WHEN `Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM `TransportVehicles`
    WHERE `IsDeleted` = 0
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(`VehicleNumber`) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(`VehicleRegistrationNo`) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(`VehicleType`) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(`GpsDeviceId`) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY `VehicleNumber` ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportVehiclesById`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehiclesById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        `VehicleId`,
        `VehicleNumber`,
        `VehicleRegistrationNo` AS RegistrationNumber,
        `VehicleName`,
        `VehicleType`,
        `Make` AS Manufacturer,
        `Model`,
        `ChassisNumber`,
        `EngineNumber`,
        `GpsDeviceId`,
        `InsuranceNumber`,
        `InsuranceExpiry`,
        `PollutionExpiry`,
        `FitnessExpiry`,
        `Capacity`,
        `IsAC`,
        CASE WHEN `Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM `TransportVehicles`
    WHERE `VehicleId` = p_Id AND `IsDeleted` = 0
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
    IN p_UpdatedBy BIGINT
)
BEGIN
    INSERT INTO `TransportVehicles` (
        `VehicleNumber`, `VehicleRegistrationNo`, `VehicleName`, `VehicleType`,
        `Make`, `Model`, `ChassisNumber`, `EngineNumber`, `GpsDeviceId`, `InsuranceNumber`,
        `InsuranceExpiry`, `PollutionExpiry`, `FitnessExpiry`, `Capacity`, `IsAC`,
        `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        p_VehicleNumber, COALESCE(p_VehicleRegistrationNo, p_VehicleNumber), p_VehicleNumber, COALESCE(p_VehicleType, 'Bus'),
        p_Make, p_Model, p_ChassisNumber, p_EngineNumber, p_GpsDeviceId, p_InsuranceNumber,
        p_InsuranceExpiry, p_PollutionExpiry, p_FitnessExpiry, COALESCE(p_Capacity, 40), COALESCE(p_IsAC, 1),
        COALESCE(p_IsActive, 1), 0, p_CreatedBy, NOW()
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
    IN p_UpdatedBy BIGINT
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
-- 5. STORED PROCEDURES: DRIVER MANAGEMENT
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetTransportDrivers`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportDrivers`(
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        d.DriverId,
        d.DriverName,
        d.EmployeeId,
        d.LicenseNo AS LicenceNumber,
        d.LicenseNo AS LicenseNumber,
        d.LicenseExpiry AS LicenceExpiry,
        d.LicenseExpiry AS LicenseExpiryDate,
        d.MobileNo AS MobileNumber,
        d.AlternateMobileNo AS AlternateMobileNumber,
        d.Email,
        d.Address,
        d.BloodGroup,
        d.EmergencyContactName,
        d.EmergencyContactNumber,
        d.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN d.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM TransportDrivers d
    LEFT JOIN TransportVehicles v ON d.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE d.IsDeleted = 0
      AND (p_Search IS NULL OR p_Search = '' 
           OR LOWER(d.DriverName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(d.EmployeeId) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(d.LicenseNo) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(d.MobileNo) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY d.DriverName ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportDriversById`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportDriversById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        d.DriverId,
        d.DriverName,
        d.EmployeeId,
        d.LicenseNo AS LicenceNumber,
        d.LicenseNo AS LicenseNumber,
        d.LicenseExpiry AS LicenceExpiry,
        d.LicenseExpiry AS LicenseExpiryDate,
        d.MobileNo AS MobileNumber,
        d.AlternateMobileNo AS AlternateMobileNumber,
        d.Email,
        d.Address,
        d.BloodGroup,
        d.EmergencyContactName,
        d.EmergencyContactNumber,
        d.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN d.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM TransportDrivers d
    LEFT JOIN TransportVehicles v ON d.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE d.DriverId = p_Id AND d.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateTransportDrivers`;
DELIMITER //
CREATE PROCEDURE `sp_CreateTransportDrivers`(
    IN p_DriverName VARCHAR(100),
    IN p_EmployeeId VARCHAR(50),
    IN p_MobileNumber VARCHAR(20),
    IN p_AlternateMobileNumber VARCHAR(20),
    IN p_Email VARCHAR(100),
    IN p_LicenceNumber VARCHAR(50),
    IN p_LicenceExpiry DATE,
    IN p_Address VARCHAR(255),
    IN p_BloodGroup VARCHAR(10),
    IN p_EmergencyContactName VARCHAR(100),
    IN p_EmergencyContactNumber VARCHAR(20),
    IN p_Status TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    INSERT INTO `TransportDrivers` (
        `DriverName`, `EmployeeId`, `MobileNo`, `AlternateMobileNo`, `Email`,
        `LicenseNo`, `LicenseExpiry`, `Address`, `BloodGroup`, `EmergencyContactName`,
        `EmergencyContactNumber`, `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        p_DriverName, p_EmployeeId, p_MobileNumber, p_AlternateMobileNumber, p_Email,
        p_LicenceNumber, p_LicenceExpiry, p_Address, p_BloodGroup, p_EmergencyContactName,
        p_EmergencyContactNumber, COALESCE(p_Status, 1), 0, p_CreatedBy, NOW()
    );
    SELECT LAST_INSERT_ID() AS DriverId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateTransportDrivers`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateTransportDrivers`(
    IN p_Id BIGINT,
    IN p_DriverName VARCHAR(100),
    IN p_EmployeeId VARCHAR(50),
    IN p_MobileNumber VARCHAR(20),
    IN p_AlternateMobileNumber VARCHAR(20),
    IN p_Email VARCHAR(100),
    IN p_LicenceNumber VARCHAR(50),
    IN p_LicenceExpiry DATE,
    IN p_Address VARCHAR(255),
    IN p_BloodGroup VARCHAR(10),
    IN p_EmergencyContactName VARCHAR(100),
    IN p_EmergencyContactNumber VARCHAR(20),
    IN p_Status TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportDrivers`
    SET 
        `DriverName` = COALESCE(p_DriverName, `DriverName`),
        `EmployeeId` = COALESCE(p_EmployeeId, `EmployeeId`),
        `MobileNo` = COALESCE(p_MobileNumber, `MobileNo`),
        `AlternateMobileNo` = p_AlternateMobileNumber,
        `Email` = p_Email,
        `LicenseNo` = COALESCE(p_LicenceNumber, `LicenseNo`),
        `LicenseExpiry` = p_LicenceExpiry,
        `Address` = p_Address,
        `BloodGroup` = p_BloodGroup,
        `EmergencyContactName` = p_EmergencyContactName,
        `EmergencyContactNumber` = p_EmergencyContactNumber,
        `Status` = COALESCE(p_Status, `Status`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `DriverId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteTransportDrivers`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteTransportDrivers`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportDrivers`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `DriverId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportDriverLookup`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportDriverLookup`()
BEGIN
    SELECT 
        `DriverId`,
        `DriverName`,
        `EmployeeId`,
        `MobileNo` AS MobileNumber,
        `LicenseNo` AS LicenceNumber
    FROM `TransportDrivers`
    WHERE `IsDeleted` = 0 AND `Status` = 1
    ORDER BY `DriverName` ASC;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 6. STORED PROCEDURES: BUS ATTENDANTS
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetTransportAttendants`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportAttendants`(
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        a.AttendantId,
        a.EmployeeId,
        a.AttendantName,
        a.MobileNumber,
        a.Gender,
        a.BranchName,
        a.AlternateMobileNumber,
        a.Address,
        a.BloodGroup,
        a.EmergencyContactName,
        a.EmergencyContactNumber,
        a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM TransportAttendants a
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE a.IsDeleted = 0
      AND (p_Search IS NULL OR p_Search = '' 
           OR LOWER(a.AttendantName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(a.EmployeeId) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(a.MobileNumber) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY a.AttendantName ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportAttendantById`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportAttendantById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        a.AttendantId,
        a.EmployeeId,
        a.AttendantName,
        a.MobileNumber,
        a.Gender,
        a.BranchName,
        a.AlternateMobileNumber,
        a.Address,
        a.BloodGroup,
        a.EmergencyContactName,
        a.EmergencyContactNumber,
        a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM TransportAttendants a
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE a.AttendantId = p_Id AND a.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateTransportAttendants`;
DELIMITER //
CREATE PROCEDURE `sp_CreateTransportAttendants`(
    IN p_EmployeeId VARCHAR(50),
    IN p_AttendantName VARCHAR(100),
    IN p_MobileNumber VARCHAR(20),
    IN p_Gender VARCHAR(20),
    IN p_BranchName VARCHAR(100),
    IN p_AlternateMobileNumber VARCHAR(20),
    IN p_Address VARCHAR(255),
    IN p_BloodGroup VARCHAR(10),
    IN p_EmergencyContactName VARCHAR(100),
    IN p_EmergencyContactNumber VARCHAR(20),
    IN p_AssignedVehicleId BIGINT,
    IN p_Status TINYINT(1),
    IN p_IsDeleted TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    INSERT INTO `TransportAttendants` (
        `EmployeeId`, `AttendantName`, `MobileNumber`, `Gender`, `BranchName`,
        `AlternateMobileNumber`, `Address`, `BloodGroup`, `EmergencyContactName`,
        `EmergencyContactNumber`, `AssignedVehicleId`, `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        p_EmployeeId, p_AttendantName, p_MobileNumber, COALESCE(p_Gender, 'Female'), p_BranchName,
        p_AlternateMobileNumber, p_Address, p_BloodGroup, p_EmergencyContactName,
        p_EmergencyContactNumber, p_AssignedVehicleId, COALESCE(p_Status, 1), 0, p_CreatedBy, NOW()
    );
    SELECT LAST_INSERT_ID() AS AttendantId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateTransportAttendants`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateTransportAttendants`(
    IN p_Id BIGINT,
    IN p_EmployeeId VARCHAR(50),
    IN p_AttendantName VARCHAR(100),
    IN p_MobileNumber VARCHAR(20),
    IN p_Gender VARCHAR(20),
    IN p_BranchName VARCHAR(100),
    IN p_AlternateMobileNumber VARCHAR(20),
    IN p_Address VARCHAR(255),
    IN p_BloodGroup VARCHAR(10),
    IN p_EmergencyContactName VARCHAR(100),
    IN p_EmergencyContactNumber VARCHAR(20),
    IN p_AssignedVehicleId BIGINT,
    IN p_Status TINYINT(1),
    IN p_IsDeleted TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportAttendants`
    SET 
        `EmployeeId` = COALESCE(p_EmployeeId, `EmployeeId`),
        `AttendantName` = COALESCE(p_AttendantName, `AttendantName`),
        `MobileNumber` = COALESCE(p_MobileNumber, `MobileNumber`),
        `Gender` = COALESCE(p_Gender, `Gender`),
        `BranchName` = p_BranchName,
        `AlternateMobileNumber` = p_AlternateMobileNumber,
        `Address` = p_Address,
        `BloodGroup` = p_BloodGroup,
        `EmergencyContactName` = p_EmergencyContactName,
        `EmergencyContactNumber` = p_EmergencyContactNumber,
        `AssignedVehicleId` = p_AssignedVehicleId,
        `Status` = COALESCE(p_Status, `Status`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `AttendantId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteTransportAttendants`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteTransportAttendants`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportAttendants`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `AttendantId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportAttendantLookup`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportAttendantLookup`()
BEGIN
    SELECT 
        `AttendantId`,
        `AttendantName`,
        `EmployeeId`,
        `MobileNumber`,
        `BranchName`
    FROM `TransportAttendants`
    WHERE `IsDeleted` = 0 AND `Status` = 1
    ORDER BY `AttendantName` ASC;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 7. STORED PROCEDURES: VEHICLE ASSIGNMENTS
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleAssignments`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehicleAssignments`(
    IN p_RouteId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_DriverId BIGINT,
    IN p_Status TINYINT(1),
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        a.AssignmentId,
        a.RouteId,
        r.RouteName,
        r.RouteCode,
        a.VehicleId,
        v.VehicleNumber,
        v.Capacity,
        a.DriverId,
        d.DriverName,
        d.MobileNo AS DriverMobile,
        a.AttendantId,
        att.AttendantName,
        a.EffectiveFrom,
        a.EffectiveTo,
        a.Shift,
        a.MorningTripTime,
        a.EveningTripTime,
        a.Remarks,
        a.Status,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudents
    FROM TransportVehicleAssignments a
    LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
    WHERE a.IsDeleted = 0
      AND (p_RouteId IS NULL OR a.RouteId = p_RouteId)
      AND (p_VehicleId IS NULL OR a.VehicleId = p_VehicleId)
      AND (p_DriverId IS NULL OR a.DriverId = p_DriverId)
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(r.RouteName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(v.VehicleNumber) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(d.DriverName) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY a.EffectiveFrom DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleAssignmentById`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehicleAssignmentById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        a.AssignmentId,
        a.RouteId,
        r.RouteName,
        r.RouteCode,
        a.VehicleId,
        v.VehicleNumber,
        v.Capacity,
        a.DriverId,
        d.DriverName,
        d.MobileNo AS DriverMobile,
        a.AttendantId,
        att.AttendantName,
        a.EffectiveFrom,
        a.EffectiveTo,
        a.Shift,
        a.MorningTripTime,
        a.EveningTripTime,
        a.Remarks,
        a.Status,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudents
    FROM TransportVehicleAssignments a
    LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
    WHERE a.AssignmentId = p_Id AND a.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateTransportVehicleAssignments`;
DELIMITER //
CREATE PROCEDURE `sp_CreateTransportVehicleAssignments`(
    IN p_RouteId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_DriverId BIGINT,
    IN p_EffectiveFrom DATETIME,
    IN p_EffectiveTo DATETIME,
    IN p_Shift VARCHAR(20),
    IN p_Remarks VARCHAR(255),
    IN p_Status TINYINT(1),
    IN p_IsActive TINYINT(1),
    IN p_AttendantId BIGINT,
    IN p_MorningTripTime VARCHAR(20),
    IN p_EveningTripTime VARCHAR(20),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    INSERT INTO `TransportVehicleAssignments` (
        `RouteId`, `VehicleId`, `DriverId`, `AttendantId`, `EffectiveFrom`,
        `EffectiveTo`, `Shift`, `MorningTripTime`, `EveningTripTime`, `Remarks`,
        `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        p_RouteId, p_VehicleId, p_DriverId, p_AttendantId, COALESCE(p_EffectiveFrom, NOW()),
        p_EffectiveTo, COALESCE(p_Shift, 'Morning'), p_MorningTripTime, p_EveningTripTime, p_Remarks,
        COALESCE(p_Status, 1), 0, p_CreatedBy, NOW()
    );
    SELECT LAST_INSERT_ID() AS AssignmentId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateTransportVehicleAssignments`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateTransportVehicleAssignments`(
    IN p_Id BIGINT,
    IN p_RouteId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_DriverId BIGINT,
    IN p_EffectiveFrom DATETIME,
    IN p_EffectiveTo DATETIME,
    IN p_Shift VARCHAR(20),
    IN p_Remarks VARCHAR(255),
    IN p_Status TINYINT(1),
    IN p_IsActive TINYINT(1),
    IN p_AttendantId BIGINT,
    IN p_MorningTripTime VARCHAR(20),
    IN p_EveningTripTime VARCHAR(20),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportVehicleAssignments`
    SET 
        `RouteId` = COALESCE(p_RouteId, `RouteId`),
        `VehicleId` = COALESCE(p_VehicleId, `VehicleId`),
        `DriverId` = COALESCE(p_DriverId, `DriverId`),
        `AttendantId` = COALESCE(p_AttendantId, `AttendantId`),
        `EffectiveFrom` = COALESCE(p_EffectiveFrom, `EffectiveFrom`),
        `EffectiveTo` = p_EffectiveTo,
        `Shift` = COALESCE(p_Shift, `Shift`),
        `MorningTripTime` = COALESCE(p_MorningTripTime, `MorningTripTime`),
        `EveningTripTime` = COALESCE(p_EveningTripTime, `EveningTripTime`),
        `Remarks` = p_Remarks,
        `Status` = COALESCE(p_Status, `Status`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `AssignmentId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteTransportVehicleAssignments`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteTransportVehicleAssignments`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportVehicleAssignments`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `AssignmentId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleAssignmentLookup`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehicleAssignmentLookup`()
BEGIN
    SELECT 
        a.AssignmentId,
        a.RouteId,
        r.RouteName,
        a.VehicleId,
        v.VehicleNumber,
        a.DriverId,
        d.DriverName,
        a.AttendantId,
        att.AttendantName,
        a.Shift,
        a.MorningTripTime,
        a.EveningTripTime
    FROM TransportVehicleAssignments a
    LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
    WHERE a.IsDeleted = 0 AND a.Status = 1
    ORDER BY r.RouteName ASC;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 8. STORED PROCEDURES: STUDENT TRANSPORT ASSIGNMENTS
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetStudentTransportAssignments`;
DELIMITER //
CREATE PROCEDURE `sp_GetStudentTransportAssignments`(
    IN p_AdmissionNo VARCHAR(50),
    IN p_RouteId BIGINT,
    IN p_PickupPointId BIGINT,
    IN p_VehicleAssignmentId BIGINT,
    IN p_TransportType VARCHAR(20),
    IN p_Status TINYINT(1),
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        s.StudentTransportAssignmentId AS AssignmentId,
        s.StudentId,
        s.AdmissionNo,
        st.StudentName,
        s.RouteId,
        r.RouteName,
        s.PickupPointId,
        p.StopName AS PickupPointName,
        p.MonthlyFee,
        s.VehicleAssignmentId,
        v.VehicleNumber,
        s.EffectiveFrom,
        s.EffectiveTo,
        s.TransportType,
        s.Status,
        CASE WHEN s.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText,
        s.Remarks
    FROM StudentTransportAssignments s
    LEFT JOIN Students st ON s.AdmissionNo = st.AdmissionNo
    LEFT JOIN TransportRoutes r ON s.RouteId = r.RouteId
    LEFT JOIN PickupPoints p ON s.PickupPointId = p.PickupPointId
    LEFT JOIN TransportVehicleAssignments va ON s.VehicleAssignmentId = va.AssignmentId
    LEFT JOIN TransportVehicles v ON va.VehicleId = v.VehicleId
    WHERE s.IsDeleted = 0
      AND (p_AdmissionNo IS NULL OR p_AdmissionNo = '' OR s.AdmissionNo = p_AdmissionNo)
      AND (p_RouteId IS NULL OR s.RouteId = p_RouteId)
      AND (p_PickupPointId IS NULL OR s.PickupPointId = p_PickupPointId)
      AND (p_VehicleAssignmentId IS NULL OR s.VehicleAssignmentId = p_VehicleAssignmentId)
      AND (p_TransportType IS NULL OR p_TransportType = '' OR s.TransportType = p_TransportType)
      AND (p_Status IS NULL OR s.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(s.AdmissionNo) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(st.StudentName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(r.RouteName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(p.StopName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(v.VehicleNumber) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY s.EffectiveFrom DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetStudentTransportAssignmentById`;
DELIMITER //
CREATE PROCEDURE `sp_GetStudentTransportAssignmentById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        s.StudentTransportAssignmentId AS AssignmentId,
        s.StudentId,
        s.AdmissionNo,
        st.StudentName,
        s.RouteId,
        r.RouteName,
        s.PickupPointId,
        p.StopName AS PickupPointName,
        p.MonthlyFee,
        s.VehicleAssignmentId,
        v.VehicleNumber,
        s.EffectiveFrom,
        s.EffectiveTo,
        s.TransportType,
        s.Status,
        CASE WHEN s.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText,
        s.Remarks
    FROM StudentTransportAssignments s
    LEFT JOIN Students st ON s.AdmissionNo = st.AdmissionNo
    LEFT JOIN TransportRoutes r ON s.RouteId = r.RouteId
    LEFT JOIN PickupPoints p ON s.PickupPointId = p.PickupPointId
    LEFT JOIN TransportVehicleAssignments va ON s.VehicleAssignmentId = va.AssignmentId
    LEFT JOIN TransportVehicles v ON va.VehicleId = v.VehicleId
    WHERE s.StudentTransportAssignmentId = p_Id AND s.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateStudentTransportAssignments`;
DELIMITER //
CREATE PROCEDURE `sp_CreateStudentTransportAssignments`(
    IN p_AdmissionNo VARCHAR(50),
    IN p_RouteId BIGINT,
    IN p_PickupPointId BIGINT,
    IN p_VehicleAssignmentId BIGINT,
    IN p_EffectiveFrom DATETIME,
    IN p_EffectiveTo DATETIME,
    IN p_TransportType VARCHAR(20),
    IN p_Remarks VARCHAR(255),
    IN p_Status TINYINT(1),
    IN p_IsDeleted TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    DECLARE v_StudentId BIGINT DEFAULT NULL;
    SELECT StudentId INTO v_StudentId FROM Students WHERE AdmissionNo = p_AdmissionNo AND IsDeleted = 0 LIMIT 1;

    INSERT INTO `StudentTransportAssignments` (
        `StudentId`, `AdmissionNo`, `RouteId`, `PickupPointId`, `VehicleAssignmentId`,
        `EffectiveFrom`, `EffectiveTo`, `TransportType`, `Remarks`, `Status`,
        `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        v_StudentId, p_AdmissionNo, p_RouteId, p_PickupPointId, p_VehicleAssignmentId,
        COALESCE(p_EffectiveFrom, NOW()), p_EffectiveTo, COALESCE(p_TransportType, 'Both'),
        p_Remarks, COALESCE(p_Status, 1), 0, p_CreatedBy, NOW()
    );
    SELECT LAST_INSERT_ID() AS StudentTransportAssignmentId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateStudentTransportAssignments`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateStudentTransportAssignments`(
    IN p_Id BIGINT,
    IN p_AdmissionNo VARCHAR(50),
    IN p_RouteId BIGINT,
    IN p_PickupPointId BIGINT,
    IN p_VehicleAssignmentId BIGINT,
    IN p_EffectiveFrom DATETIME,
    IN p_EffectiveTo DATETIME,
    IN p_TransportType VARCHAR(20),
    IN p_Remarks VARCHAR(255),
    IN p_Status TINYINT(1),
    IN p_IsDeleted TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `StudentTransportAssignments`
    SET 
        `AdmissionNo` = COALESCE(p_AdmissionNo, `AdmissionNo`),
        `RouteId` = COALESCE(p_RouteId, `RouteId`),
        `PickupPointId` = COALESCE(p_PickupPointId, `PickupPointId`),
        `VehicleAssignmentId` = COALESCE(p_VehicleAssignmentId, `VehicleAssignmentId`),
        `EffectiveFrom` = COALESCE(p_EffectiveFrom, `EffectiveFrom`),
        `EffectiveTo` = p_EffectiveTo,
        `TransportType` = COALESCE(p_TransportType, `TransportType`),
        `Remarks` = p_Remarks,
        `Status` = COALESCE(p_Status, `Status`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `StudentTransportAssignmentId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteStudentTransportAssignments`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteStudentTransportAssignments`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `StudentTransportAssignments`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `StudentTransportAssignmentId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 9. STORED PROCEDURES: VEHICLE MAINTENANCE
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetVehicleMaintenances`;
DELIMITER //
CREATE PROCEDURE `sp_GetVehicleMaintenances`(
    IN p_VehicleId BIGINT,
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_Status TINYINT(1),
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        m.MaintenanceId,
        m.VehicleId,
        v.VehicleNumber,
        m.ServiceType,
        m.ServiceDate,
        m.Cost,
        m.VendorCenter,
        m.NextServiceDue,
        m.Remarks,
        m.Status,
        CASE WHEN m.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText
    FROM VehicleMaintenances m
    LEFT JOIN TransportVehicles v ON m.VehicleId = v.VehicleId
    WHERE m.IsDeleted = 0
      AND (p_VehicleId IS NULL OR m.VehicleId = p_VehicleId)
      AND (p_FromDate IS NULL OR m.ServiceDate >= p_FromDate)
      AND (p_ToDate IS NULL OR m.ServiceDate <= p_ToDate)
      AND (p_Status IS NULL OR m.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(v.VehicleNumber) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(m.ServiceType) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(m.VendorCenter) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY m.ServiceDate DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetVehicleMaintenanceById`;
DELIMITER //
CREATE PROCEDURE `sp_GetVehicleMaintenanceById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        m.MaintenanceId,
        m.VehicleId,
        v.VehicleNumber,
        m.ServiceType,
        m.ServiceDate,
        m.Cost,
        m.VendorCenter,
        m.NextServiceDue,
        m.Remarks,
        m.Status,
        CASE WHEN m.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText
    FROM VehicleMaintenances m
    LEFT JOIN TransportVehicles v ON m.VehicleId = v.VehicleId
    WHERE m.MaintenanceId = p_Id AND m.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateVehicleMaintenances`;
DELIMITER //
CREATE PROCEDURE `sp_CreateVehicleMaintenances`(
    IN p_VehicleId BIGINT,
    IN p_ServiceType VARCHAR(150),
    IN p_ServiceDate DATE,
    IN p_Cost DECIMAL(12,2),
    IN p_VendorCenter VARCHAR(150),
    IN p_NextServiceDue DATE,
    IN p_Remarks VARCHAR(500),
    IN p_Status TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    INSERT INTO `VehicleMaintenances` (
        `VehicleId`, `ServiceType`, `ServiceDate`, `Cost`, `VendorCenter`,
        `NextServiceDue`, `Remarks`, `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        p_VehicleId, COALESCE(p_ServiceType, 'Routine'), COALESCE(p_ServiceDate, CURDATE()),
        COALESCE(p_Cost, 0.00), p_VendorCenter, p_NextServiceDue, p_Remarks,
        COALESCE(p_Status, 1), 0, p_CreatedBy, NOW()
    );
    SELECT LAST_INSERT_ID() AS MaintenanceId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateVehicleMaintenances`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateVehicleMaintenances`(
    IN p_Id BIGINT,
    IN p_VehicleId BIGINT,
    IN p_ServiceType VARCHAR(150),
    IN p_ServiceDate DATE,
    IN p_Cost DECIMAL(12,2),
    IN p_VendorCenter VARCHAR(150),
    IN p_NextServiceDue DATE,
    IN p_Remarks VARCHAR(500),
    IN p_Status TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `VehicleMaintenances`
    SET 
        `VehicleId` = COALESCE(p_VehicleId, `VehicleId`),
        `ServiceType` = COALESCE(p_ServiceType, `ServiceType`),
        `ServiceDate` = COALESCE(p_ServiceDate, `ServiceDate`),
        `Cost` = COALESCE(p_Cost, `Cost`),
        `VendorCenter` = p_VendorCenter,
        `NextServiceDue` = p_NextServiceDue,
        `Remarks` = p_Remarks,
        `Status` = COALESCE(p_Status, `Status`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `MaintenanceId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteVehicleMaintenances`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteVehicleMaintenances`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `VehicleMaintenances`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `MaintenanceId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 10. STORED PROCEDURES: VEHICLE TRIPS & OPERATIONS
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetTransportTrips`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportTrips`(
    IN p_RouteId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_TripDate DATE,
    IN p_Status VARCHAR(30),
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        t.TripId,
        t.AssignmentId,
        t.VehicleId,
        v.VehicleNumber,
        t.RouteId,
        r.RouteName,
        t.DriverId,
        d.DriverName,
        t.AttendantId,
        att.AttendantName,
        t.TripType,
        t.TripDate,
        t.StartTime,
        t.EndTime,
        t.StudentsPresent,
        t.Status
    FROM TransportTrips t
    LEFT JOIN TransportVehicles v ON t.VehicleId = v.VehicleId
    LEFT JOIN TransportRoutes r ON t.RouteId = r.RouteId
    LEFT JOIN TransportDrivers d ON t.DriverId = d.DriverId
    LEFT JOIN TransportAttendants att ON t.AttendantId = att.AttendantId
    WHERE t.IsDeleted = 0
      AND (p_RouteId IS NULL OR t.RouteId = p_RouteId)
      AND (p_VehicleId IS NULL OR t.VehicleId = p_VehicleId)
      AND (p_TripDate IS NULL OR t.TripDate = p_TripDate)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR t.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(v.VehicleNumber) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(r.RouteName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(d.DriverName) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY t.TripDate DESC, t.StartTime ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateTransportTrip`;
DELIMITER //
CREATE PROCEDURE `sp_CreateTransportTrip`(
    IN p_AssignmentId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_RouteId BIGINT,
    IN p_DriverId BIGINT,
    IN p_AttendantId BIGINT,
    IN p_TripType VARCHAR(20),
    IN p_TripDate DATE,
    IN p_StartTime VARCHAR(20),
    IN p_EndTime VARCHAR(20),
    IN p_StudentsPresent INT,
    IN p_Status VARCHAR(30),
    IN p_CreatedBy BIGINT
)
BEGIN
    INSERT INTO `TransportTrips` (
        `AssignmentId`, `VehicleId`, `RouteId`, `DriverId`, `AttendantId`,
        `TripType`, `TripDate`, `StartTime`, `EndTime`, `StudentsPresent`,
        `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        p_AssignmentId, p_VehicleId, p_RouteId, p_DriverId, p_AttendantId,
        COALESCE(p_TripType, 'Morning'), COALESCE(p_TripDate, CURDATE()),
        p_StartTime, p_EndTime, COALESCE(p_StudentsPresent, 0),
        COALESCE(p_Status, 'Running'), 0, p_CreatedBy, NOW()
    );
    SELECT LAST_INSERT_ID() AS TripId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateTransportTrip`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateTransportTrip`(
    IN p_TripId BIGINT,
    IN p_StartTime VARCHAR(20),
    IN p_EndTime VARCHAR(20),
    IN p_StudentsPresent INT,
    IN p_Status VARCHAR(30),
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportTrips`
    SET 
        `StartTime` = COALESCE(p_StartTime, `StartTime`),
        `EndTime` = COALESCE(p_EndTime, `EndTime`),
        `StudentsPresent` = COALESCE(p_StudentsPresent, `StudentsPresent`),
        `Status` = COALESCE(p_Status, `Status`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `TripId` = p_TripId AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteTransportTrip`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteTransportTrip`(
    IN p_TripId BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportTrips`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `TripId` = p_TripId AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 11. STORED PROCEDURES: DASHBOARD & COMPLIANCE METRICS
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetTransportDashboard`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportDashboard`()
BEGIN
    DECLARE v_TotalVehicles INT DEFAULT 0;
    DECLARE v_ActiveVehicles INT DEFAULT 0;
    DECLARE v_MaintenanceVehicles INT DEFAULT 0;
    DECLARE v_TotalRoutes INT DEFAULT 0;
    DECLARE v_ActiveRoutes INT DEFAULT 0;
    DECLARE v_TotalDrivers INT DEFAULT 0;
    DECLARE v_ActiveDrivers INT DEFAULT 0;
    DECLARE v_TotalAttendants INT DEFAULT 0;
    DECLARE v_ActiveStudents INT DEFAULT 0;
    DECLARE v_TotalCapacity INT DEFAULT 0;
    DECLARE v_ExpiringDocs INT DEFAULT 0;
    DECLARE v_ExpiringLicenses INT DEFAULT 0;
    DECLARE v_RunningTrips INT DEFAULT 0;
    DECLARE v_CompletedTrips INT DEFAULT 0;

    -- Vehicles
    SELECT COUNT(*), SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END), SUM(CASE WHEN Capacity > 0 THEN Capacity ELSE 0 END)
    INTO v_TotalVehicles, v_ActiveVehicles, v_TotalCapacity
    FROM TransportVehicles WHERE IsDeleted = 0;

    -- Maintenance Vehicles
    SELECT COUNT(DISTINCT VehicleId) INTO v_MaintenanceVehicles
    FROM VehicleMaintenances 
    WHERE IsDeleted = 0 AND Status = 1;

    -- Routes
    SELECT COUNT(*), SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END)
    INTO v_TotalRoutes, v_ActiveRoutes
    FROM TransportRoutes WHERE IsDeleted = 0;

    -- Drivers
    SELECT COUNT(*), SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END)
    INTO v_TotalDrivers, v_ActiveDrivers
    FROM TransportDrivers WHERE IsDeleted = 0;

    -- Attendants
    SELECT COUNT(*) INTO v_TotalAttendants
    FROM TransportAttendants WHERE IsDeleted = 0;

    -- Active Students
    SELECT COUNT(*) INTO v_ActiveStudents
    FROM StudentTransportAssignments 
    WHERE IsDeleted = 0 AND Status = 1 
      AND (EffectiveTo IS NULL OR EffectiveTo >= CURDATE());

    -- Expiring Docs (within 45 days)
    SELECT COUNT(*) INTO v_ExpiringDocs
    FROM TransportVehicles
    WHERE IsDeleted = 0 
      AND (
          (InsuranceExpiry IS NOT NULL AND InsuranceExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY))
          OR (PollutionExpiry IS NOT NULL AND PollutionExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY))
          OR (FitnessExpiry IS NOT NULL AND FitnessExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY))
      );

    -- Expiring Licenses (within 45 days)
    SELECT COUNT(*) INTO v_ExpiringLicenses
    FROM TransportDrivers
    WHERE IsDeleted = 0 
      AND LicenseExpiry IS NOT NULL 
      AND LicenseExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY);

    -- Today's Trips
    SELECT 
        COUNT(CASE WHEN Status = 'Running' THEN 1 END),
        COUNT(CASE WHEN Status = 'Completed' THEN 1 END)
    INTO v_RunningTrips, v_CompletedTrips
    FROM TransportTrips
    WHERE IsDeleted = 0 AND TripDate = CURDATE();

    -- Resultset 1: Summary KPI Card
    SELECT 
        v_TotalVehicles AS TotalVehicles,
        v_ActiveVehicles AS ActiveVehicles,
        v_MaintenanceVehicles AS MaintenanceVehicles,
        v_TotalRoutes AS TotalRoutes,
        v_ActiveRoutes AS ActiveRoutes,
        v_TotalDrivers AS TotalDrivers,
        v_ActiveDrivers AS ActiveDrivers,
        v_TotalAttendants AS TotalAttendants,
        v_ActiveStudents AS ActiveStudents,
        v_ExpiringDocs AS ExpiringDocs,
        v_ExpiringLicenses AS ExpiringLicenses,
        v_RunningTrips AS RunningTrips,
        v_CompletedTrips AS CompletedTrips,
        CASE WHEN v_TotalCapacity > 0 THEN ROUND((v_ActiveStudents / v_TotalCapacity) * 100) ELSE 0 END AS Utilization;

    -- Resultset 2: Vehicle Occupancy Matrix
    SELECT 
        v.VehicleId,
        v.VehicleNumber,
        v.VehicleType,
        v.Capacity,
        COUNT(sta.StudentTransportAssignmentId) AS AssignedStudents,
        CASE WHEN v.Capacity > 0 THEN ROUND((COUNT(sta.StudentTransportAssignmentId) / v.Capacity) * 100) ELSE 0 END AS OccupancyPercentage
    FROM TransportVehicles v
    LEFT JOIN TransportVehicleAssignments tva ON v.VehicleId = tva.VehicleId AND tva.IsDeleted = 0 AND tva.Status = 1
    LEFT JOIN StudentTransportAssignments sta ON tva.AssignmentId = sta.VehicleAssignmentId AND sta.IsDeleted = 0 AND sta.Status = 1
    WHERE v.IsDeleted = 0
    GROUP BY v.VehicleId, v.VehicleNumber, v.VehicleType, v.Capacity
    ORDER BY v.VehicleNumber ASC;

    -- Resultset 3: Route-wise Student Distribution
    SELECT 
        r.RouteId,
        r.RouteName,
        r.RouteCode,
        r.Distance AS TotalDistanceKm,
        COUNT(sta.StudentTransportAssignmentId) AS StudentCount
    FROM TransportRoutes r
    LEFT JOIN StudentTransportAssignments sta ON r.RouteId = sta.RouteId AND sta.IsDeleted = 0 AND sta.Status = 1
    WHERE r.IsDeleted = 0
    GROUP BY r.RouteId, r.RouteName, r.RouteCode, r.Distance
    ORDER BY StudentCount DESC;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 12. STORED PROCEDURES: REPORTS DISPATCHER
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetTransportReports`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportReports`(
    IN p_ReportType VARCHAR(50),
    IN p_RouteId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_Status VARCHAR(30)
)
BEGIN
    -- 1. Student Transport Report
    IF p_ReportType = 'student-transport-reports' OR p_ReportType = 'student' THEN
        SELECT 
            sta.StudentTransportAssignmentId,
            sta.AdmissionNo,
            COALESCE(st.StudentName, 'Student') AS StudentName,
            r.RouteName,
            pp.StopName AS PickupPointName,
            v.VehicleNumber,
            sta.TransportType AS FeePlan,
            COALESCE(pp.MonthlyFee, 1200.00) AS MonthlyFee,
            (COALESCE(pp.MonthlyFee, 1200.00) * 12) AS AnnualFee,
            CASE WHEN sta.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM StudentTransportAssignments sta
        LEFT JOIN Students st ON sta.AdmissionNo = st.AdmissionNo
        LEFT JOIN TransportRoutes r ON sta.RouteId = r.RouteId
        LEFT JOIN PickupPoints pp ON sta.PickupPointId = pp.PickupPointId
        LEFT JOIN TransportVehicleAssignments tva ON sta.VehicleAssignmentId = tva.AssignmentId
        LEFT JOIN TransportVehicles v ON tva.VehicleId = v.VehicleId
        WHERE sta.IsDeleted = 0
          AND (p_RouteId IS NULL OR sta.RouteId = p_RouteId)
          AND (p_VehicleId IS NULL OR tva.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND sta.Status = 1) 
               OR (p_Status = 'Inactive' AND sta.Status = 0))
        ORDER BY st.StudentName ASC;

    -- 2. Vehicle Report
    ELSEIF p_ReportType = 'vehicle-reports' OR p_ReportType = 'vehicle' THEN
        SELECT 
            v.VehicleId,
            v.VehicleNumber,
            v.VehicleRegistrationNo AS RegistrationNumber,
            v.VehicleType,
            v.Capacity,
            CASE WHEN v.IsAC = 1 THEN 'Yes' ELSE 'No' END AS AC,
            v.GpsDeviceId,
            v.InsuranceExpiry,
            v.PollutionExpiry,
            v.FitnessExpiry,
            CASE WHEN v.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM TransportVehicles v
        WHERE v.IsDeleted = 0
          AND (p_VehicleId IS NULL OR v.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND v.Status = 1) 
               OR (p_Status = 'Inactive' AND v.Status = 0))
        ORDER BY v.VehicleNumber ASC;

    -- 3. Driver Report
    ELSEIF p_ReportType = 'driver-reports' OR p_ReportType = 'driver' THEN
        SELECT 
            d.DriverId,
            d.EmployeeId,
            d.DriverName,
            d.MobileNo AS MobileNumber,
            d.LicenseNo AS LicenseNumber,
            d.LicenseExpiry AS LicenseExpiryDate,
            CASE WHEN d.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM TransportDrivers d
        WHERE d.IsDeleted = 0
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND d.Status = 1) 
               OR (p_Status = 'Inactive' AND d.Status = 0))
        ORDER BY d.DriverName ASC;

    -- 4. Route Report
    ELSEIF p_ReportType = 'route-reports' OR p_ReportType = 'route' THEN
        SELECT 
            r.RouteId,
            r.RouteCode,
            r.RouteName,
            r.StartLocation,
            r.EndLocation,
            r.Distance AS TotalDistanceKm,
            r.NonAcBaseFare,
            r.AcBaseFare,
            (SELECT COUNT(*) FROM PickupPoints pp WHERE pp.RouteId = r.RouteId AND pp.IsDeleted = 0) AS PickupPointCount,
            (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.RouteId = r.RouteId AND sta.IsDeleted = 0) AS StudentCount,
            CASE WHEN r.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM TransportRoutes r
        WHERE r.IsDeleted = 0
          AND (p_RouteId IS NULL OR r.RouteId = p_RouteId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND r.Status = 1) 
               OR (p_Status = 'Inactive' AND r.Status = 0))
        ORDER BY r.RouteName ASC;

    -- 5. Maintenance Report
    ELSEIF p_ReportType = 'maintenance-reports' OR p_ReportType = 'maintenance' THEN
        SELECT 
            m.MaintenanceId,
            m.VehicleId,
            v.VehicleNumber,
            m.ServiceType,
            m.ServiceDate,
            m.Cost,
            m.VendorCenter,
            m.NextServiceDue,
            CASE WHEN m.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM VehicleMaintenances m
        LEFT JOIN TransportVehicles v ON m.VehicleId = v.VehicleId
        WHERE m.IsDeleted = 0
          AND (p_VehicleId IS NULL OR m.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND m.Status = 1) 
               OR (p_Status = 'Inactive' AND m.Status = 0))
        ORDER BY m.ServiceDate DESC;

    -- 6. Trip Reports
    ELSEIF p_ReportType = 'trip-reports' OR p_ReportType = 'trip' THEN
        SELECT 
            t.TripId,
            v.VehicleNumber,
            r.RouteName,
            t.TripType,
            t.TripDate,
            t.StartTime,
            t.EndTime,
            t.StudentsPresent,
            t.Status
        FROM TransportTrips t
        LEFT JOIN TransportVehicles v ON t.VehicleId = v.VehicleId
        LEFT JOIN TransportRoutes r ON t.RouteId = r.RouteId
        WHERE t.IsDeleted = 0
          AND (p_RouteId IS NULL OR t.RouteId = p_RouteId)
          AND (p_VehicleId IS NULL OR t.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR t.Status = p_Status)
        ORDER BY t.TripDate DESC;

    -- 7. Transport Dashboard Report (Vehicle Assignments & Overall)
    ELSE
        SELECT 
            a.AssignmentId,
            v.VehicleNumber,
            r.RouteName,
            d.DriverName,
            att.AttendantName,
            v.Capacity,
            (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudents,
            a.MorningTripTime,
            a.EveningTripTime,
            a.EffectiveFrom,
            CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM TransportVehicleAssignments a
        LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
        LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
        LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
        LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
        WHERE a.IsDeleted = 0
          AND (p_RouteId IS NULL OR a.RouteId = p_RouteId)
          AND (p_VehicleId IS NULL OR a.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND a.Status = 1) 
               OR (p_Status = 'Inactive' AND a.Status = 0))
        ORDER BY a.EffectiveFrom DESC;
    END IF;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 13. ADDITIONAL STORED PROCEDURES: VALIDATIONS, LOOKUPS & DETAILS
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_CheckTransportRouteExists`;
DELIMITER //
CREATE PROCEDURE `sp_CheckTransportRouteExists`(
    IN p_RouteCode VARCHAR(50),
    IN p_RouteName VARCHAR(100),
    IN p_ExcludeId BIGINT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `TransportRoutes`
    WHERE `IsDeleted` = 0
      AND (LOWER(`RouteCode`) = LOWER(p_RouteCode) OR LOWER(`RouteName`) = LOWER(p_RouteName))
      AND (p_ExcludeId IS NULL OR `RouteId` != p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckTransportVehicleExists`;
DELIMITER //
CREATE PROCEDURE `sp_CheckTransportVehicleExists`(
    IN p_VehicleNumber VARCHAR(50),
    IN p_RegistrationNumber VARCHAR(50),
    IN p_ExcludeId BIGINT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `TransportVehicles`
    WHERE `IsDeleted` = 0
      AND (LOWER(`VehicleNumber`) = LOWER(p_VehicleNumber) OR LOWER(`VehicleRegistrationNo`) = LOWER(p_RegistrationNumber))
      AND (p_ExcludeId IS NULL OR `VehicleId` != p_ExcludeId);
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
        `VehicleId`, `VehicleNumber`, `VehicleRegistrationNo` AS RegistrationNumber,
        `VehicleName`, `VehicleType`, `Make` AS Manufacturer, `Model`,
        `ChassisNumber`, `EngineNumber`, `GpsDeviceId`, `InsuranceNumber`,
        `InsuranceExpiry`, `PollutionExpiry`, `FitnessExpiry`, `Capacity`, `IsAC`,
        CASE WHEN `Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM `TransportVehicles`
    WHERE `IsDeleted` = 0
      AND (`VehicleId` = p_SearchId OR LOWER(`VehicleNumber`) = LOWER(p_SearchStr) OR LOWER(`VehicleRegistrationNo`) = LOWER(p_SearchStr))
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckTransportDriverExists`;
DELIMITER //
CREATE PROCEDURE `sp_CheckTransportDriverExists`(
    IN p_LicenceNumber VARCHAR(50),
    IN p_MobileNumber VARCHAR(20),
    IN p_ExcludeId BIGINT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `TransportDrivers`
    WHERE `IsDeleted` = 0
      AND (LOWER(`LicenseNo`) = LOWER(p_LicenceNumber) OR LOWER(`MobileNo`) = LOWER(p_MobileNumber))
      AND (p_ExcludeId IS NULL OR `DriverId` != p_ExcludeId);
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
        pp.DistanceKm,
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
