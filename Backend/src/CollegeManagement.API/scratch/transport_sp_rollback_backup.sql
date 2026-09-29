-- BACKUP OF TRANSPORT STORED PROCEDURES BEFORE CAMPUS INTEGRATION
-- Generated at: 09/25/2026 10:51:47


-- =========================================
-- sp_GetTransportRoutes
-- =========================================
DROP PROCEDURE IF EXISTS \$proc\;
DELIMITER //
sp_GetTransportRoutes NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GetTransportRoutes`(\n    IN p_Search VARCHAR(100),\n    IN p_Status TINYINT(1),\n    IN p_BusType VARCHAR(20)\n)\nBEGIN\n    SELECT \n        r.RouteId,\n        r.RouteCode,\n        r.RouteName,\n        r.StartLocation,\n        r.EndLocation,\n        r.Distance AS DistanceKm,\n        r.EstimatedDurationMinutes,\n        r.DefaultMonthlyFee,\n        r.MinRangeKm,\n        r.NonAcBaseFare,\n        r.NonAcRatePerKm,\n        r.AcBaseFare,\n        r.AcRatePerKm,\n        r.Description,\n        r.Status,\n        CASE WHEN r.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText,\n        (SELECT COUNT(*) FROM PickupPoints p WHERE p.RouteId = r.RouteId AND p.IsDeleted = 0) AS PickupPointCount,\n        a.VehicleId,\n        v.VehicleNumber,\n        a.DriverId,\n        d.DriverName,\n        v.IsAC AS IsAc,\n        CASE \n            WHEN v.IsAC = 1 THEN 'AC' \n            WHEN v.IsAC = 0 THEN 'Non-AC' \n            ELSE NULL \n        END AS BusType\n    FROM TransportRoutes r\n    LEFT JOIN TransportVehicleAssignments a ON r.RouteId = a.RouteId AND a.IsDeleted = 0 AND a.Status = 1\n    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId AND v.IsDeleted = 0\n    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId AND d.IsDeleted = 0\n    WHERE r.IsDeleted = 0\n      AND (p_Status IS NULL OR r.Status = p_Status)\n      AND (\n          p_BusType IS NULL OR p_BusType = ''\n          OR (LOWER(p_BusType) IN ('ac', '1') AND (v.IsAC = 1 OR (v.IsAC IS NULL AND r.AcBaseFare > 0)))\n          OR (LOWER(p_BusType) IN ('non-ac', 'nonac', 'non_ac', '0') AND (v.IsAC = 0 OR (v.IsAC IS NULL AND r.NonAcBaseFare > 0)))\n      )\n      AND (p_Search IS NULL OR p_Search = '' \n           OR LOWER(r.RouteCode) LIKE CONCAT('%', LOWER(p_Search), '%')\n           OR LOWER(r.RouteName) LIKE CONCAT('%', LOWER(p_Search), '%')\n           OR LOWER(r.StartLocation) LIKE CONCAT('%', LOWER(p_Search), '%')\n           OR LOWER(r.EndLocation) LIKE CONCAT('%', LOWER(p_Search), '%'))\n    ORDER BY r.RouteName ASC;\nEND utf8mb4 utf8mb4_uca1400_ai_ci utf8mb4_uca1400_ai_ci[2]
//
DELIMITER ;


-- =========================================
-- sp_CreateTransportRoute
-- =========================================
DROP PROCEDURE IF EXISTS \$proc\;
DELIMITER //
sp_CreateTransportRoute NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_CreateTransportRoute`(\n    IN p_RouteCode VARCHAR(50),\n    IN p_RouteName VARCHAR(150),\n    IN p_StartLocation VARCHAR(150),\n    IN p_EndLocation VARCHAR(150),\n    IN p_Distance DECIMAL(10,2),\n    IN p_EstimatedDurationMinutes INT,\n    IN p_DefaultMonthlyFee DECIMAL(10,2),\n    IN p_MinRangeKm DECIMAL(10,2),\n    IN p_NonAcBaseFare DECIMAL(10,2),\n    IN p_NonAcRatePerKm DECIMAL(10,2),\n    IN p_AcBaseFare DECIMAL(10,2),\n    IN p_AcRatePerKm DECIMAL(10,2),\n    IN p_Description VARCHAR(500),\n    IN p_Status TINYINT(1),\n    IN p_CreatedBy BIGINT\n)\nBEGIN\n    DECLARE v_RouteNum VARCHAR(50);\n    SET v_RouteNum = COALESCE(NULLIF(p_RouteCode, ''), CONCAT('R-', UUID_SHORT()));\n\n    INSERT INTO `TransportRoutes` (\n        `RouteCode`, `RouteNumber`, `RouteName`, `StartLocation`, `EndLocation`, `Distance`,\n        `EstimatedDurationMinutes`, `DefaultMonthlyFee`, `MinRangeKm`, `NonAcBaseFare`, `NonAcRatePerKm`,\n        `AcBaseFare`, `AcRatePerKm`, `Description`, `Status`, `IsActive`, `IsDeleted`, `CreatedBy`, `CreatedAt`\n    ) VALUES (\n        p_RouteCode, v_RouteNum, p_RouteName, p_StartLocation, p_EndLocation, COALESCE(p_Distance, 0.00),\n        COALESCE(p_EstimatedDurationMinutes, 30), COALESCE(p_DefaultMonthlyFee, 0.00), COALESCE(p_MinRangeKm, 5.00),\n        COALESCE(p_NonAcBaseFare, 1000.00), COALESCE(p_NonAcRatePerKm, 100.00), COALESCE(p_AcBaseFare, 1200.00),\n        COALESCE(p_AcRatePerKm, 150.00), p_Description, COALESCE(p_Status, 1), COALESCE(p_Status, 1), 0, p_CreatedBy, NOW()\n    );\n    SELECT LAST_INSERT_ID() AS RouteId;\nEND utf8mb4 utf8mb4_unicode_ci utf8mb4_uca1400_ai_ci[2]
//
DELIMITER ;


-- =========================================
-- sp_UpdateTransportRoute
-- =========================================
DROP PROCEDURE IF EXISTS \$proc\;
DELIMITER //
sp_UpdateTransportRoute NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_UpdateTransportRoute`(\n    IN p_RouteId BIGINT,\n    IN p_RouteCode VARCHAR(50),\n    IN p_RouteName VARCHAR(150),\n    IN p_StartLocation VARCHAR(150),\n    IN p_EndLocation VARCHAR(150),\n    IN p_Distance DECIMAL(10,2),\n    IN p_EstimatedDurationMinutes INT,\n    IN p_DefaultMonthlyFee DECIMAL(10,2),\n    IN p_MinRangeKm DECIMAL(10,2),\n    IN p_NonAcBaseFare DECIMAL(10,2),\n    IN p_NonAcRatePerKm DECIMAL(10,2),\n    IN p_AcBaseFare DECIMAL(10,2),\n    IN p_AcRatePerKm DECIMAL(10,2),\n    IN p_Description VARCHAR(500),\n    IN p_Status TINYINT(1),\n    IN p_UpdatedBy BIGINT\n)\nBEGIN\n    UPDATE `TransportRoutes`\n    SET \n        `RouteCode` = COALESCE(p_RouteCode, `RouteCode`),\n        `RouteNumber` = COALESCE(p_RouteCode, `RouteNumber`),\n        `RouteName` = COALESCE(p_RouteName, `RouteName`),\n        `StartLocation` = p_StartLocation,\n        `EndLocation` = p_EndLocation,\n        `Distance` = COALESCE(p_Distance, `Distance`),\n        `EstimatedDurationMinutes` = COALESCE(p_EstimatedDurationMinutes, `EstimatedDurationMinutes`),\n        `DefaultMonthlyFee` = COALESCE(p_DefaultMonthlyFee, `DefaultMonthlyFee`),\n        `MinRangeKm` = COALESCE(p_MinRangeKm, `MinRangeKm`),\n        `NonAcBaseFare` = COALESCE(p_NonAcBaseFare, `NonAcBaseFare`),\n        `NonAcRatePerKm` = COALESCE(p_NonAcRatePerKm, `NonAcRatePerKm`),\n        `AcBaseFare` = COALESCE(p_AcBaseFare, `AcBaseFare`),\n        `AcRatePerKm` = COALESCE(p_AcRatePerKm, `AcRatePerKm`),\n        `Description` = p_Description,\n        `Status` = COALESCE(p_Status, `Status`),\n        `IsActive` = COALESCE(p_Status, `IsActive`),\n        `UpdatedBy` = p_UpdatedBy,\n        `UpdatedAt` = NOW()\n    WHERE `RouteId` = p_RouteId AND `IsDeleted` = 0;\n    \n    SELECT ROW_COUNT() AS AffectedRows;\nEND utf8mb4 utf8mb4_unicode_ci utf8mb4_uca1400_ai_ci[2]
//
DELIMITER ;


-- =========================================
-- sp_GetTransportVehicles
-- =========================================
DROP PROCEDURE IF EXISTS \$proc\;
DELIMITER //
sp_GetTransportVehicles NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GetTransportVehicles`(\n    IN p_Search VARCHAR(100)\n)\nBEGIN\n    SELECT \n        `VehicleId`,\n        `VehicleNumber`,\n        `VehicleRegistrationNo` AS RegistrationNumber,\n        `VehicleName`,\n        `VehicleType`,\n        `Make` AS Manufacturer,\n        `Model`,\n        `ChassisNumber`,\n        `EngineNumber`,\n        `GpsDeviceId`,\n        `InsuranceNumber`,\n        `InsuranceExpiry`,\n        `PollutionExpiry`,\n        `FitnessExpiry`,\n        `Capacity`,\n        `IsAC`,\n        CASE WHEN `Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status\n    FROM `TransportVehicles`\n    WHERE `IsDeleted` = 0\n      AND (p_Search IS NULL OR p_Search = ''\n           OR LOWER(`VehicleNumber`) LIKE CONCAT('%', LOWER(p_Search), '%')\n           OR LOWER(`VehicleRegistrationNo`) LIKE CONCAT('%', LOWER(p_Search), '%')\n           OR LOWER(`VehicleType`) LIKE CONCAT('%', LOWER(p_Search), '%')\n           OR LOWER(`GpsDeviceId`) LIKE CONCAT('%', LOWER(p_Search), '%'))\n    ORDER BY `VehicleNumber` ASC;\nEND utf8mb4 utf8mb4_uca1400_ai_ci utf8mb4_uca1400_ai_ci[2]
//
DELIMITER ;


-- =========================================
-- sp_CreateTransportVehicles
-- =========================================
DROP PROCEDURE IF EXISTS \$proc\;
DELIMITER //
sp_CreateTransportVehicles NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_CreateTransportVehicles`(\n    IN p_VehicleNumber VARCHAR(50),\n    IN p_VehicleType VARCHAR(50),\n    IN p_Capacity INT,\n    IN p_IsActive TINYINT(1),\n    IN p_VehicleRegistrationNo VARCHAR(50),\n    IN p_MaximumCapacity INT,\n    IN p_Make VARCHAR(100),\n    IN p_Model VARCHAR(100),\n    IN p_YearOfManufacture INT,\n    IN p_ChassisNumber VARCHAR(100),\n    IN p_EngineNumber VARCHAR(100),\n    IN p_InsuranceExpiry DATE,\n    IN p_FitnessExpiry DATE,\n    IN p_PollutionExpiry DATE,\n    IN p_GpsDeviceId VARCHAR(100),\n    IN p_IsAC TINYINT(1),\n    IN p_InsuranceNumber VARCHAR(100),\n    IN p_CreatedBy BIGINT,\n    IN p_UpdatedBy BIGINT\n)\nBEGIN\n    INSERT INTO `TransportVehicles` (\n        `VehicleNumber`, `VehicleRegistrationNo`, `VehicleName`, `VehicleType`,\n        `Make`, `Model`, `ChassisNumber`, `EngineNumber`, `GpsDeviceId`, `InsuranceNumber`,\n        `InsuranceExpiry`, `PollutionExpiry`, `FitnessExpiry`, `Capacity`, `IsAC`,\n        `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`\n    ) VALUES (\n        p_VehicleNumber, COALESCE(p_VehicleRegistrationNo, p_VehicleNumber), p_VehicleNumber, COALESCE(p_VehicleType, 'Bus'),\n        p_Make, p_Model, p_ChassisNumber, p_EngineNumber, p_GpsDeviceId, p_InsuranceNumber,\n        p_InsuranceExpiry, p_PollutionExpiry, p_FitnessExpiry, COALESCE(p_Capacity, 40), COALESCE(p_IsAC, 1),\n        COALESCE(p_IsActive, 1), 0, p_CreatedBy, NOW()\n    );\n    SELECT LAST_INSERT_ID() AS VehicleId;\nEND utf8mb4 utf8mb4_uca1400_ai_ci utf8mb4_uca1400_ai_ci[2]
//
DELIMITER ;


-- =========================================
-- sp_UpdateTransportVehicles
-- =========================================
DROP PROCEDURE IF EXISTS \$proc\;
DELIMITER //
sp_UpdateTransportVehicles NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_UpdateTransportVehicles`(\n    IN p_Id BIGINT,\n    IN p_VehicleNumber VARCHAR(50),\n    IN p_VehicleType VARCHAR(50),\n    IN p_Capacity INT,\n    IN p_IsActive TINYINT(1),\n    IN p_VehicleRegistrationNo VARCHAR(50),\n    IN p_MaximumCapacity INT,\n    IN p_Make VARCHAR(100),\n    IN p_Model VARCHAR(100),\n    IN p_YearOfManufacture INT,\n    IN p_ChassisNumber VARCHAR(100),\n    IN p_EngineNumber VARCHAR(100),\n    IN p_InsuranceExpiry DATE,\n    IN p_FitnessExpiry DATE,\n    IN p_PollutionExpiry DATE,\n    IN p_GpsDeviceId VARCHAR(100),\n    IN p_IsAC TINYINT(1),\n    IN p_InsuranceNumber VARCHAR(100),\n    IN p_CreatedBy BIGINT,\n    IN p_UpdatedBy BIGINT\n)\nBEGIN\n    UPDATE `TransportVehicles`\n    SET \n        `VehicleNumber` = COALESCE(p_VehicleNumber, `VehicleNumber`),\n        `VehicleRegistrationNo` = COALESCE(p_VehicleRegistrationNo, `VehicleRegistrationNo`),\n        `VehicleType` = COALESCE(p_VehicleType, `VehicleType`),\n        `Make` = p_Make,\n        `Model` = p_Model,\n        `ChassisNumber` = p_ChassisNumber,\n        `EngineNumber` = p_EngineNumber,\n        `GpsDeviceId` = p_GpsDeviceId,\n        `InsuranceNumber` = p_InsuranceNumber,\n        `InsuranceExpiry` = p_InsuranceExpiry,\n        `PollutionExpiry` = p_PollutionExpiry,\n        `FitnessExpiry` = p_FitnessExpiry,\n        `Capacity` = COALESCE(p_Capacity, `Capacity`),\n        `IsAC` = COALESCE(p_IsAC, `IsAC`),\n        `Status` = COALESCE(p_IsActive, `Status`),\n        `UpdatedBy` = p_UpdatedBy,\n        `UpdatedAt` = NOW()\n    WHERE `VehicleId` = p_Id AND `IsDeleted` = 0;\n    \n    SELECT ROW_COUNT() AS AffectedRows;\nEND utf8mb4 utf8mb4_uca1400_ai_ci utf8mb4_uca1400_ai_ci[2]
//
DELIMITER ;


-- =========================================
-- sp_GetTransportDrivers
-- =========================================
DROP PROCEDURE IF EXISTS \$proc\;
DELIMITER //
sp_GetTransportDrivers NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GetTransportDrivers`(\n    IN p_Search VARCHAR(100)\n)\nBEGIN\n    SELECT \n        s.Id AS DriverId,\n        s.Id AS StaffId,\n        s.EmployeeId,\n        CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)) AS DriverName,\n        s.Mobile AS MobileNumber,\n        s.AlternateMobile AS AlternateMobileNumber,\n        s.Email,\n        s.DrivingLicenseNumber AS LicenseNumber,\n        DATE_FORMAT(s.DrivingLicenseExpiryDate, '%Y-%m-%d') AS LicenseExpiryDate,\n        s.CurrentAddress AS Address,\n        s.BloodGroup,\n        NULL AS EmergencyContactName,\n        NULL AS EmergencyContactNumber,\n        COALESCE(s.DrivingExperienceYears, 5) AS ExperienceYears,\n        va.VehicleId AS AssignedVehicleId,\n        va.VehicleNumber AS AssignedVehicleNumber,\n        CASE WHEN s.Status = 'Active' THEN 'Active' ELSE 'Inactive' END AS Status\n    FROM Staff s\n    LEFT JOIN (\n        SELECT va1.DriverId, va1.VehicleId, v1.VehicleNumber\n        FROM TransportVehicleAssignments va1\n        LEFT JOIN TransportVehicles v1 ON va1.VehicleId = v1.VehicleId AND v1.IsDeleted = 0\n        WHERE va1.IsDeleted = 0 AND va1.Status = 1\n          AND va1.AssignmentId = (\n              SELECT MAX(va2.AssignmentId)\n              FROM TransportVehicleAssignments va2\n              WHERE va2.DriverId = va1.DriverId AND va2.IsDeleted = 0 AND va2.Status = 1\n          )\n    ) va ON s.Id = va.DriverId\n    WHERE s.IsDeleted = 0 \n      AND s.IsDriver = 1 \n      AND s.StaffType = 'Non-Teaching'\n      AND (p_Search IS NULL OR p_Search = '' \n           OR LOWER(CONCAT(s.FirstName, ' ', s.LastName)) LIKE CONCAT('%', LOWER(p_Search), '%')\n           OR LOWER(s.EmployeeId) LIKE CONCAT('%', LOWER(p_Search), '%')\n           OR LOWER(COALESCE(s.DrivingLicenseNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')\n           OR LOWER(s.Mobile) LIKE CONCAT('%', LOWER(p_Search), '%'))\n    ORDER BY s.Id ASC;\nEND utf8mb4 utf8mb4_unicode_ci utf8mb4_uca1400_ai_ci[2]
//
DELIMITER ;

