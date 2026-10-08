-- Fix sp_GetTransportDriversById and sp_GetTransportDriverByIdOrNumber
-- to properly support TransportDrivers.DriverId, StaffId, and Staff.Id

DROP PROCEDURE IF EXISTS `sp_GetTransportDriversById`;
DELIMITER ;;
CREATE PROCEDURE `sp_GetTransportDriversById`(
    IN p_Id BIGINT
)
BEGIN
    IF EXISTS (
        SELECT 1 FROM TransportDrivers d 
        LEFT JOIN Staff s ON d.StaffId = s.Id 
        WHERE d.IsDeleted = 0 AND (d.DriverId = p_Id OR d.StaffId = p_Id OR s.Id = p_Id)
    ) THEN
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
            CASE WHEN COALESCE(s.Status, CASE WHEN d.Status = 1 THEN 'Active' ELSE 'Inactive' END) = 'Active' THEN 'Active' ELSE 'Inactive' END AS Status,
            COALESCE(s.CampusId, 1) AS CampusId,
            COALESCE(c.CampusName, 'Main Campus (HQ)') AS CampusName
        FROM TransportDrivers d
        LEFT JOIN Staff s ON d.StaffId = s.Id AND s.IsDeleted = 0
        LEFT JOIN Campuses c ON s.CampusId = c.CampusId
        LEFT JOIN TransportVehicles v ON d.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
        WHERE d.IsDeleted = 0
          AND (d.DriverId = p_Id OR d.StaffId = p_Id OR s.Id = p_Id)
        LIMIT 1;
    ELSE
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
        WHERE s.Id = p_Id AND s.IsDeleted = 0 AND s.IsDriver = 1
        LIMIT 1;
    END IF;
END;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportDriverByIdOrNumber`;
DELIMITER ;;
CREATE PROCEDURE `sp_GetTransportDriverByIdOrNumber`(
    IN p_SearchId BIGINT,
    IN p_SearchStr VARCHAR(100)
)
BEGIN
    IF EXISTS (
        SELECT 1 FROM TransportDrivers d 
        LEFT JOIN Staff s ON d.StaffId = s.Id 
        WHERE d.IsDeleted = 0 
          AND (d.DriverId = p_SearchId 
               OR d.StaffId = p_SearchId 
               OR s.Id = p_SearchId
               OR LOWER(COALESCE(s.EmployeeId, d.EmployeeId, '')) = LOWER(p_SearchStr)
               OR LOWER(COALESCE(s.DrivingLicenseNumber, d.LicenseNo, '')) = LOWER(p_SearchStr)
               OR LOWER(COALESCE(CONCAT(s.FirstName, ' ', s.LastName), d.DriverName, '')) = LOWER(p_SearchStr)
               OR LOWER(COALESCE(s.Mobile, d.MobileNo, '')) = LOWER(p_SearchStr))
    ) THEN
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
            CASE WHEN COALESCE(s.Status, CASE WHEN d.Status = 1 THEN 'Active' ELSE 'Inactive' END) = 'Active' THEN 'Active' ELSE 'Inactive' END AS Status,
            COALESCE(s.CampusId, 1) AS CampusId,
            COALESCE(c.CampusName, 'Main Campus (HQ)') AS CampusName
        FROM TransportDrivers d
        LEFT JOIN Staff s ON d.StaffId = s.Id AND s.IsDeleted = 0
        LEFT JOIN Campuses c ON s.CampusId = c.CampusId
        LEFT JOIN TransportVehicles v ON d.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
        WHERE d.IsDeleted = 0
          AND (d.DriverId = p_SearchId 
               OR d.StaffId = p_SearchId 
               OR s.Id = p_SearchId
               OR LOWER(COALESCE(s.EmployeeId, d.EmployeeId, '')) = LOWER(p_SearchStr)
               OR LOWER(COALESCE(s.DrivingLicenseNumber, d.LicenseNo, '')) = LOWER(p_SearchStr)
               OR LOWER(COALESCE(CONCAT(s.FirstName, ' ', s.LastName), d.DriverName, '')) = LOWER(p_SearchStr)
               OR LOWER(COALESCE(s.Mobile, d.MobileNo, '')) = LOWER(p_SearchStr))
        LIMIT 1;
    ELSE
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
    END IF;
END;;
DELIMITER ;
