-- 1. Synchronize Driver Employee IDs in Staff table to canonical PCNT format
UPDATE Staff SET EmployeeId = 'PCNT0017' WHERE Id = 1062 AND EmployeeId = 'DRV-1';
UPDATE Staff SET EmployeeId = 'PCNT0096' WHERE Id = 1065 AND EmployeeId = 'DRV-96';
UPDATE Staff SET EmployeeId = 'PCNT0019' WHERE Id = 1063 AND EmployeeId = 'DRV-19';
UPDATE Staff SET EmployeeId = 'PCNT0094' WHERE Id = 1064 AND EmployeeId = 'DRV-94';

-- 2. Synchronize legacy TransportDrivers table
UPDATE TransportDrivers SET EmployeeId = 'PCNT0017' WHERE StaffId = 1062;
UPDATE TransportDrivers SET EmployeeId = 'PCNT0096' WHERE StaffId = 1065;
UPDATE TransportDrivers SET EmployeeId = 'PCNT0019' WHERE StaffId = 1063;
UPDATE TransportDrivers SET EmployeeId = 'PCNT0094' WHERE StaffId = 1064;
UPDATE TransportDrivers SET StaffId = 1053 WHERE DriverId = 1053;
UPDATE TransportDrivers SET StaffId = 1054 WHERE DriverId = 1054;

-- 3. Procedure: sp_GetTransportDrivers
DROP PROCEDURE IF EXISTS `sp_GetTransportDrivers`;
DELIMITER ;;
CREATE PROCEDURE `sp_GetTransportDrivers`(
    IN p_Search VARCHAR(100),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        s.Id AS DriverId,
        s.Id AS StaffId,
        s.EmployeeId AS EmployeeId,
        CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)) AS DriverName,
        s.Mobile AS MobileNumber,
        s.AlternateMobile AS AlternateMobileNumber,
        s.Email AS Email,
        s.DrivingLicenseNumber AS LicenseNumber,
        DATE_FORMAT(s.DrivingLicenseExpiryDate, '%Y-%m-%d') AS LicenseExpiryDate,
        s.CurrentAddress AS Address,
        s.BloodGroup AS BloodGroup,
        COALESCE(d.EmergencyContactName, '') AS EmergencyContactName,
        COALESCE(d.EmergencyContactNumber, '') AS EmergencyContactNumber,
        COALESCE(s.DrivingExperienceYears, d.Experience, 5) AS ExperienceYears,
        COALESCE(va.VehicleId, d.AssignedVehicleId) AS AssignedVehicleId,
        COALESCE(va.VehicleNumber, v.VehicleNumber) AS AssignedVehicleNumber,
        CASE WHEN s.Status = 'Active' THEN 'Active' ELSE 'Inactive' END AS Status,
        s.CampusId,
        c.CampusName
    FROM Staff s
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    LEFT JOIN TransportDrivers d ON (d.StaffId = s.Id OR (d.EmployeeId = s.EmployeeId AND s.EmployeeId IS NOT NULL AND s.EmployeeId <> '')) AND d.IsDeleted = 0
    LEFT JOIN (
        SELECT va1.DriverId, va1.VehicleId, v1.VehicleNumber
        FROM TransportVehicleAssignments va1
        LEFT JOIN TransportVehicles v1 ON va1.VehicleId = v1.VehicleId AND v1.IsDeleted = 0
        WHERE va1.IsDeleted = 0 AND va1.Status = 1
          AND va1.AssignmentId = (
              SELECT MAX(va2.AssignmentId)
              FROM TransportVehicleAssignments va2
              WHERE va2.DriverId = va1.DriverId AND va2.IsDeleted = 0 AND va2.Status = 1
          )
    ) va ON s.Id = va.DriverId
    LEFT JOIN TransportVehicles v ON d.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE s.IsDeleted = 0 
      AND s.IsDriver = 1
      AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
      AND (p_Search IS NULL OR p_Search = '' 
           OR LOWER(CONCAT(s.FirstName, ' ', s.LastName)) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(s.EmployeeId) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(s.DrivingLicenseNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(s.Mobile) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY s.Id ASC;
END;;
DELIMITER ;

-- 4. Procedure: sp_GetTransportDriversById
DROP PROCEDURE IF EXISTS `sp_GetTransportDriversById`;
DELIMITER ;;
CREATE PROCEDURE `sp_GetTransportDriversById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        s.Id AS DriverId,
        s.Id AS StaffId,
        s.EmployeeId AS EmployeeId,
        CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)) AS DriverName,
        s.Mobile AS MobileNumber,
        s.AlternateMobile AS AlternateMobileNumber,
        s.Email AS Email,
        s.DrivingLicenseNumber AS LicenseNumber,
        DATE_FORMAT(s.DrivingLicenseExpiryDate, '%Y-%m-%d') AS LicenseExpiryDate,
        s.CurrentAddress AS Address,
        s.BloodGroup AS BloodGroup,
        COALESCE(d.EmergencyContactName, '') AS EmergencyContactName,
        COALESCE(d.EmergencyContactNumber, '') AS EmergencyContactNumber,
        COALESCE(s.DrivingExperienceYears, d.Experience, 5) AS ExperienceYears,
        COALESCE(va.VehicleId, d.AssignedVehicleId) AS AssignedVehicleId,
        COALESCE(va.VehicleNumber, v.VehicleNumber) AS AssignedVehicleNumber,
        CASE WHEN s.Status = 'Active' THEN 'Active' ELSE 'Inactive' END AS Status,
        s.CampusId,
        c.CampusName
    FROM Staff s
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    LEFT JOIN TransportDrivers d ON (d.StaffId = s.Id OR (d.EmployeeId = s.EmployeeId AND s.EmployeeId IS NOT NULL AND s.EmployeeId <> '')) AND d.IsDeleted = 0
    LEFT JOIN (
        SELECT va1.DriverId, va1.VehicleId, v1.VehicleNumber
        FROM TransportVehicleAssignments va1
        LEFT JOIN TransportVehicles v1 ON va1.VehicleId = v1.VehicleId AND v1.IsDeleted = 0
        WHERE va1.IsDeleted = 0 AND va1.Status = 1
          AND va1.AssignmentId = (
              SELECT MAX(va2.AssignmentId)
              FROM TransportVehicleAssignments va2
              WHERE va2.DriverId = va1.DriverId AND va2.IsDeleted = 0 AND va2.Status = 1
          )
    ) va ON s.Id = va.DriverId
    LEFT JOIN TransportVehicles v ON d.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE s.Id = p_Id AND s.IsDeleted = 0 AND s.IsDriver = 1
    LIMIT 1;
END;;
DELIMITER ;

-- 5. Procedure: sp_GetTransportDriverByIdOrNumber
DROP PROCEDURE IF EXISTS `sp_GetTransportDriverByIdOrNumber`;
DELIMITER ;;
CREATE PROCEDURE `sp_GetTransportDriverByIdOrNumber`(
    IN p_SearchId BIGINT,
    IN p_SearchStr VARCHAR(100)
)
BEGIN
    SELECT 
        s.Id AS DriverId,
        s.Id AS StaffId,
        s.EmployeeId AS EmployeeId,
        CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)) AS DriverName,
        s.Mobile AS MobileNumber,
        s.AlternateMobile AS AlternateMobileNumber,
        s.Email AS Email,
        s.DrivingLicenseNumber AS LicenseNumber,
        DATE_FORMAT(s.DrivingLicenseExpiryDate, '%Y-%m-%d') AS LicenseExpiryDate,
        s.CurrentAddress AS Address,
        s.BloodGroup AS BloodGroup,
        COALESCE(d.EmergencyContactName, '') AS EmergencyContactName,
        COALESCE(d.EmergencyContactNumber, '') AS EmergencyContactNumber,
        COALESCE(s.DrivingExperienceYears, d.Experience, 5) AS ExperienceYears,
        COALESCE(va.VehicleId, d.AssignedVehicleId) AS AssignedVehicleId,
        COALESCE(va.VehicleNumber, v.VehicleNumber) AS AssignedVehicleNumber,
        CASE WHEN s.Status = 'Active' THEN 'Active' ELSE 'Inactive' END AS Status,
        s.CampusId,
        c.CampusName
    FROM Staff s
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    LEFT JOIN TransportDrivers d ON (d.StaffId = s.Id OR (d.EmployeeId = s.EmployeeId AND s.EmployeeId IS NOT NULL AND s.EmployeeId <> '')) AND d.IsDeleted = 0
    LEFT JOIN (
        SELECT va1.DriverId, va1.VehicleId, v1.VehicleNumber
        FROM TransportVehicleAssignments va1
        LEFT JOIN TransportVehicles v1 ON va1.VehicleId = v1.VehicleId AND v1.IsDeleted = 0
        WHERE va1.IsDeleted = 0 AND va1.Status = 1
          AND va1.AssignmentId = (
              SELECT MAX(va2.AssignmentId)
              FROM TransportVehicleAssignments va2
              WHERE va2.DriverId = va1.DriverId AND va2.IsDeleted = 0 AND va2.Status = 1
          )
    ) va ON s.Id = va.DriverId
    LEFT JOIN TransportVehicles v ON d.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE s.IsDeleted = 0 
      AND s.IsDriver = 1
      AND (s.Id = p_SearchId 
           OR LOWER(s.EmployeeId) = LOWER(p_SearchStr) 
           OR LOWER(COALESCE(s.DrivingLicenseNumber, '')) = LOWER(p_SearchStr) 
           OR LOWER(CONCAT(s.FirstName, ' ', s.LastName)) = LOWER(p_SearchStr) 
           OR LOWER(s.Mobile) = LOWER(p_SearchStr))
    LIMIT 1;
END;;
DELIMITER ;

-- 6. Procedure: sp_GetTransportRoutes (join Staff for DriverName)
DROP PROCEDURE IF EXISTS `sp_GetTransportRoutes`;
DELIMITER ;;
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
        CONCAT(TRIM(d.FirstName), ' ', TRIM(d.LastName)) AS DriverName,
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
    LEFT JOIN Staff d ON a.DriverId = d.Id AND d.IsDeleted = 0
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
END;;
DELIMITER ;

-- 7. Procedure: sp_GetTransportRouteById (join Staff for DriverName)
DROP PROCEDURE IF EXISTS `sp_GetTransportRouteById`;
DELIMITER ;;
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
        CONCAT(TRIM(d.FirstName), ' ', TRIM(d.LastName)) AS DriverName,
        r.CampusId,
        c.CampusName
    FROM TransportRoutes r
    LEFT JOIN TransportVehicleAssignments a ON r.RouteId = a.RouteId AND a.IsDeleted = 0 AND a.Status = 1
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Staff d ON a.DriverId = d.Id AND d.IsDeleted = 0
    LEFT JOIN Campuses c ON r.CampusId = c.CampusId
    WHERE r.RouteId = p_Id AND r.IsDeleted = 0
    LIMIT 1;
END;;
DELIMITER ;
