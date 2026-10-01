-- Update Transport Stored Procedures for Campus Integration
-- Safe replacement script matching exact live definitions

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

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicles`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehicles`(
    IN p_Search VARCHAR(100),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        v.`VehicleId`,
        v.`VehicleNumber`,
        v.`VehicleRegistrationNo` AS RegistrationNumber,
        v.`VehicleName`,
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
        v.`CampusId`,
        c.`CampusName`,
        CASE WHEN v.`Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM `TransportVehicles` v
    LEFT JOIN `Campuses` c ON v.`CampusId` = c.`CampusId`
    WHERE v.`IsDeleted` = 0
      AND (p_CampusId IS NULL OR v.`CampusId` = p_CampusId)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(v.`VehicleNumber`) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(v.`VehicleRegistrationNo`) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(v.`VehicleType`) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(v.`GpsDeviceId`) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY v.`VehicleNumber` ASC;
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
        COALESCE(p_IsActive, 1), 0, p_CreatedBy, NOW(), COALESCE(p_CampusId, 1)
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
        `CampusId` = COALESCE(p_CampusId, `CampusId`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `VehicleId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportDrivers`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportDrivers`(
    IN p_Search VARCHAR(100),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        d.DriverId,
        COALESCE(d.StaffId, s.Id) AS StaffId,
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
    FROM TransportDrivers d
    LEFT JOIN Staff s ON d.StaffId = s.Id AND s.IsDeleted = 0
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    LEFT JOIN TransportVehicles v ON d.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE d.IsDeleted = 0
      AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
      AND (p_Search IS NULL OR p_Search = '' 
           OR LOWER(d.DriverName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(s.FirstName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(s.LastName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(s.EmployeeId, d.EmployeeId)) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(s.DrivingLicenseNumber, d.LicenseNo)) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(s.Mobile, d.MobileNo)) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY d.DriverId ASC;
END //
DELIMITER ;
