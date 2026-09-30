
DROP PROCEDURE IF EXISTS `sp_GetTransportDashboard`;
DELIMITER ;;
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

    SELECT 
        COUNT(*), 
        COALESCE(SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END), 0), 
        COALESCE(SUM(CASE WHEN Capacity > 0 THEN Capacity ELSE 0 END), 0)
    INTO v_TotalVehicles, v_ActiveVehicles, v_TotalCapacity
    FROM TransportVehicles WHERE IsDeleted = 0;

    SELECT COUNT(DISTINCT VehicleId) INTO v_MaintenanceVehicles
    FROM VehicleMaintenances 
    WHERE IsDeleted = 0 AND Status = 1;

    SELECT 
        COUNT(*), 
        COALESCE(SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END), 0)
    INTO v_TotalRoutes, v_ActiveRoutes
    FROM TransportRoutes WHERE IsDeleted = 0;

    SELECT 
        COUNT(*), 
        COALESCE(SUM(CASE WHEN Status = 'Active' THEN 1 ELSE 0 END), 0)
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
        COALESCE(COUNT(CASE WHEN Status = 'Running' THEN 1 END), 0),
        COALESCE(COUNT(CASE WHEN Status = 'Completed' THEN 1 END), 0)
    INTO v_RunningTrips, v_CompletedTrips
    FROM TransportTrips 
    WHERE IsDeleted = 0 AND TripDate = CURDATE();

    -- Result Set 1: KPI Summary
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
        v_TotalCapacity AS TotalCapacity,
        v_ExpiringDocs AS ExpiringDocs,
        v_ExpiringLicenses AS ExpiringLicenses,
        v_RunningTrips AS RunningTrips,
        v_CompletedTrips AS CompletedTrips,
        CASE WHEN v_TotalCapacity > 0 THEN ROUND((v_ActiveStudents * 100.0) / v_TotalCapacity, 2) ELSE 0 END AS Utilization;

    -- Result Set 2: Vehicle Occupancy
    SELECT 
        v.VehicleId,
        v.VehicleNumber,
        COALESCE(r.RouteName, 'Unassigned') AS RouteName,
        v.Capacity,
        COUNT(sta.StudentTransportAssignmentId) AS AssignedStudents,
        CASE WHEN v.Capacity > 0 THEN ROUND((COUNT(sta.StudentTransportAssignmentId) * 100.0) / v.Capacity, 2) ELSE 0 END AS OccupancyPercentage
    FROM TransportVehicles v
    LEFT JOIN TransportVehicleAssignments va ON v.VehicleId = va.VehicleId AND va.IsDeleted = 0 AND va.Status = 1
    LEFT JOIN TransportRoutes r ON va.RouteId = r.RouteId AND r.IsDeleted = 0
    LEFT JOIN StudentTransportAssignments sta ON va.AssignmentId = sta.VehicleAssignmentId AND sta.IsDeleted = 0 AND sta.Status = 1
    WHERE v.IsDeleted = 0
    GROUP BY v.VehicleId, v.VehicleNumber, r.RouteName, v.Capacity;

    -- Result Set 3: Route Student Summary
    SELECT 
        r.RouteId,
        r.RouteName,
        COUNT(DISTINCT sta.StudentTransportAssignmentId) AS StudentCount
    FROM TransportRoutes r
    LEFT JOIN StudentTransportAssignments sta ON r.RouteId = sta.RouteId AND sta.IsDeleted = 0 AND sta.Status = 1
    WHERE r.IsDeleted = 0
    GROUP BY r.RouteId, r.RouteName;
END;;
DELIMITER ;
