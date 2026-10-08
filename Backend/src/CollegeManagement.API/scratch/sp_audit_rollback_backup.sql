-- ========================================================
-- ROLLBACK BACKUP SCRIPT FOR 7 TRANSPORT STORED PROCEDURES
-- Captured at: 2026-09-25T09:10:35.255Z
-- ========================================================

-- Procedure: sp_GetTransportRouteById
DROP PROCEDURE IF EXISTS `sp_GetTransportRouteById`;
DELIMITER ;;
CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GetTransportRouteById`(
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
END;;
DELIMITER ;

-- Procedure: sp_GetTransportVehiclesById
DROP PROCEDURE IF EXISTS `sp_GetTransportVehiclesById`;
DELIMITER ;;
CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GetTransportVehiclesById`(
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
END;;
DELIMITER ;

-- Procedure: sp_GetTransportDriversById
DROP PROCEDURE IF EXISTS `sp_GetTransportDriversById`;
DELIMITER ;;
CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GetTransportDriversById`(
    IN p_Id BIGINT
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
        CASE WHEN s.Status = 'Active' THEN 'Active' ELSE 'Inactive' END AS Status
    FROM Staff s
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
END;;
DELIMITER ;

-- Procedure: sp_GetTransportDashboard
DROP PROCEDURE IF EXISTS `sp_GetTransportDashboard`;
DELIMITER ;;
CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GetTransportDashboard`()
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

    
    SELECT COUNT(*), SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END), SUM(CASE WHEN Capacity > 0 THEN Capacity ELSE 0 END)
    INTO v_TotalVehicles, v_ActiveVehicles, v_TotalCapacity
    FROM TransportVehicles WHERE IsDeleted = 0;

    
    SELECT COUNT(DISTINCT VehicleId) INTO v_MaintenanceVehicles
    FROM VehicleMaintenances 
    WHERE IsDeleted = 0 AND Status = 1;

    
    SELECT COUNT(*), SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END)
    INTO v_TotalRoutes, v_ActiveRoutes
    FROM TransportRoutes WHERE IsDeleted = 0;

    
    SELECT COUNT(*), SUM(CASE WHEN Status = 'Active' THEN 1 ELSE 0 END)
    INTO v_TotalDrivers, v_ActiveDrivers
    FROM Staff 
    WHERE IsDeleted = 0 AND IsDriver = 1 AND StaffType = 'Non-Teaching';

    
    SELECT COUNT(*) INTO v_TotalAttendants
    FROM TransportAttendants 
    WHERE IsDeleted = 0 AND Status = 1;

    
    SELECT COUNT(*) INTO v_ActiveStudents
    FROM StudentTransportAssignments 
    WHERE IsDeleted = 0 AND Status = 1 
      AND (EffectiveTo IS NULL OR EffectiveTo >= CURDATE());

    
    SELECT COUNT(*) INTO v_ExpiringDocs
    FROM TransportVehicles
    WHERE IsDeleted = 0 
      AND (
          (InsuranceExpiry IS NOT NULL AND InsuranceExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY))
          OR (PollutionExpiry IS NOT NULL AND PollutionExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY))
          OR (FitnessExpiry IS NOT NULL AND FitnessExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY))
      );

    
    SELECT COUNT(*) INTO v_ExpiringLicenses
    FROM Staff
    WHERE IsDeleted = 0 AND IsDriver = 1 AND StaffType = 'Non-Teaching'
      AND DrivingLicenseExpiryDate IS NOT NULL 
      AND DrivingLicenseExpiryDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY);

    
    SELECT 
        COUNT(CASE WHEN Status = 'Running' THEN 1 END),
        COUNT(CASE WHEN Status = 'Completed' THEN 1 END)
    INTO v_RunningTrips, v_CompletedTrips
    FROM TransportTrips 
    WHERE IsDeleted = 0 AND TripDate = CURDATE();

    
    SELECT 
        JSON_OBJECT(
            'summary', JSON_OBJECT(
                'totalVehicles', v_TotalVehicles,
                'activeVehicles', v_ActiveVehicles,
                'maintenanceVehicles', v_MaintenanceVehicles,
                'totalRoutes', v_TotalRoutes,
                'activeRoutes', v_ActiveRoutes,
                'totalDrivers', v_TotalDrivers,
                'activeDrivers', v_ActiveDrivers,
                'totalAttendants', v_TotalAttendants,
                'assignedStudents', v_ActiveStudents,
                'totalCapacity', v_TotalCapacity,
                'expiringVehicleDocuments', v_ExpiringDocs,
                'expiringLicenses', v_ExpiringLicenses,
                'runningTripsToday', v_RunningTrips,
                'completedTripsToday', v_CompletedTrips
            )
        ) AS DashboardData;
END;;
DELIMITER ;

-- Procedure: sp_GetStudentTransportDetails
DROP PROCEDURE IF EXISTS `sp_GetStudentTransportDetails`;
DELIMITER ;;
CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GetStudentTransportDetails`(
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
END;;
DELIMITER ;

-- Procedure: sp_GetTransportTrips
DROP PROCEDURE IF EXISTS `sp_GetTransportTrips`;
DELIMITER ;;
CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GetTransportTrips`(
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
        CONCAT(TRIM(d.FirstName), ' ', TRIM(d.LastName)) AS DriverName,
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
    LEFT JOIN Staff d ON t.DriverId = d.Id
    LEFT JOIN TransportAttendants att ON t.AttendantId = att.AttendantId AND att.IsDeleted = 0
    WHERE t.IsDeleted = 0
      AND (p_RouteId IS NULL OR t.RouteId = p_RouteId)
      AND (p_VehicleId IS NULL OR t.VehicleId = p_VehicleId)
      AND (p_TripDate IS NULL OR t.TripDate = p_TripDate)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR t.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(v.VehicleNumber) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(r.RouteName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(CONCAT(d.FirstName, ' ', d.LastName)) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY t.TripDate DESC, t.StartTime ASC;
END;;
DELIMITER ;

-- Procedure: sp_GetTransportReports
DROP PROCEDURE IF EXISTS `sp_GetTransportReports`;
DELIMITER ;;
CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GetTransportReports`(
    IN p_ReportType VARCHAR(50),
    IN p_RouteId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_Status VARCHAR(30)
)
BEGIN
    
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

    
    ELSEIF p_ReportType = 'vehicle-reports' OR p_ReportType = 'vehicle' THEN
        SELECT 
            v.VehicleId,
            v.VehicleNumber,
            v.RegistrationNumber,
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

    
    ELSEIF p_ReportType = 'driver-reports' OR p_ReportType = 'driver' THEN
        SELECT 
            s.Id AS DriverId,
            s.EmployeeId,
            CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)) AS DriverName,
            s.Mobile AS MobileNumber,
            s.DrivingLicenseNumber AS LicenseNumber,
            DATE_FORMAT(s.DrivingLicenseExpiryDate, '%Y-%m-%d') AS LicenseExpiryDate,
            CASE WHEN s.Status = 'Active' THEN 'Active' ELSE 'Inactive' END AS Status
        FROM Staff s
        WHERE s.IsDeleted = 0 AND s.IsDriver = 1 AND s.StaffType = 'Non-Teaching'
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND s.Status = 'Active') 
               OR (p_Status = 'Inactive' AND s.Status <> 'Active'))
        ORDER BY s.FirstName ASC;

    
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

    
    ELSE
        SELECT 
            a.AssignmentId,
            v.VehicleNumber,
            r.RouteName,
            CONCAT(TRIM(d.FirstName), ' ', TRIM(d.LastName)) AS DriverName,
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
        LEFT JOIN Staff d ON a.DriverId = d.Id
        LEFT JOIN TransportAttendants att ON (a.AttendantId = att.AttendantId OR a.AttendantId = att.StaffId)
        WHERE a.IsDeleted = 0
          AND (p_RouteId IS NULL OR a.RouteId = p_RouteId)
          AND (p_VehicleId IS NULL OR a.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND a.Status = 1) 
               OR (p_Status = 'Inactive' AND a.Status = 0))
        ORDER BY a.EffectiveFrom DESC;
    END IF;
END;;
DELIMITER ;

-- Procedure: sp_GetTransportVehicleByIdOrNumber
DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleByIdOrNumber`;
DELIMITER ;;
CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GetTransportVehicleByIdOrNumber`(
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
END;;
DELIMITER ;

-- Procedure: sp_GetTransportDriverByIdOrNumber
DROP PROCEDURE IF EXISTS `sp_GetTransportDriverByIdOrNumber`;
DELIMITER ;;
CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GetTransportDriverByIdOrNumber`(
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
        CASE WHEN s.Status = 'Active' THEN 'Active' ELSE 'Inactive' END AS Status
    FROM Staff s
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

