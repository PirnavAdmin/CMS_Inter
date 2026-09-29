
DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleByIdOrNumber`;
DELIMITER ;;
CREATE PROCEDURE `sp_GetTransportVehicleByIdOrNumber`(
    IN p_SearchId BIGINT,
    IN p_SearchStr VARCHAR(100)
)
BEGIN
    SELECT 
        v.`VehicleId`, 
        v.`VehicleNumber`, 
        COALESCE(v.`VehicleRegistrationNo`, v.`RegistrationNumber`) AS RegistrationNumber,
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
        CASE WHEN v.`Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        v.CampusId,
        c.CampusName
    FROM `TransportVehicles` v
    LEFT JOIN Campuses c ON v.CampusId = c.CampusId
    WHERE v.`IsDeleted` = 0
      AND (v.`VehicleId` = p_SearchId OR LOWER(v.`VehicleNumber`) = LOWER(p_SearchStr) OR LOWER(COALESCE(v.`VehicleRegistrationNo`, '')) = LOWER(p_SearchStr) OR LOWER(COALESCE(v.`RegistrationNumber`, '')) = LOWER(p_SearchStr))
    LIMIT 1;
END;;
DELIMITER ;

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
        s.EmployeeId,
        CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)) AS DriverName,
        s.Mobile AS MobileNumber,
        s.AlternateMobile AS AlternateMobileNumber,
        s.Email,
        s.DrivingLicenseNumber AS LicenseNumber,
        DATE_FORMAT(s.DrivingLicenseExpiryDate, '%Y-%m-%d') AS LicenseExpiryDate,
        s.CurrentAddress AS Address,
        s.BloodGroup,
        NULL AS EmergencyContactName,
        NULL AS EmergencyContactNumber,
        COALESCE(s.DrivingExperienceYears, 5) AS ExperienceYears,
        va.VehicleId AS AssignedVehicleId,
        va.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN s.Status = 'Active' THEN 'Active' ELSE 'Inactive' END AS Status,
        s.CampusId,
        c.CampusName
    FROM Staff s
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
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
    WHERE s.IsDeleted = 0 
      AND s.IsDriver = 1 
      AND (s.Id = p_SearchId 
           OR LOWER(COALESCE(s.DrivingLicenseNumber, '')) = LOWER(p_SearchStr) 
           OR LOWER(CONCAT(s.FirstName, ' ', s.LastName)) = LOWER(p_SearchStr) 
           OR LOWER(s.Mobile) = LOWER(p_SearchStr) 
           OR LOWER(s.EmployeeId) = LOWER(p_SearchStr))
    LIMIT 1;
END;;
DELIMITER ;
