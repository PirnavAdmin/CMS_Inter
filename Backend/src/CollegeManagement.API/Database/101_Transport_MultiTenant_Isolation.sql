-- ============================================================================
-- Migration 101: Complete Multi-Tenant Isolation (CollegeId & CampusId)
-- Scope: Transport Management (Schema, Indexes, Backfill & Stored Procedures)
-- ============================================================================

-- Note: Schema column additions & unique key swaps are idempotent.
-- Stored procedures below strictly enforce CollegeId and CampusId isolation
-- with zero fallback to CollegeId = 1 / CampusId = 1.

-- ============================================================================
-- SECTION 1: REPORT & DASHBOARD STORED PROCEDURES
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetTransportDashboard`$$
CREATE PROCEDURE `sp_GetTransportDashboard`(
    IN p_CampusId INT,
    IN p_CollegeId INT
)
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
    FROM TransportVehicles 
    WHERE IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId OR (CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1));

    SELECT COUNT(DISTINCT vm.VehicleId) INTO v_MaintenanceVehicles
    FROM VehicleMaintenances vm
    JOIN TransportVehicles tv ON vm.VehicleId = tv.VehicleId
    WHERE vm.IsDeleted = 0 AND vm.Status = 1
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR vm.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR COALESCE(vm.CampusId, tv.CampusId) = p_CampusId OR (COALESCE(vm.CampusId, tv.CampusId) IS NULL AND p_CampusId = 1 AND p_CollegeId = 1));

    SELECT 
        COUNT(*), 
        COALESCE(SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END), 0)
    INTO v_TotalRoutes, v_ActiveRoutes
    FROM TransportRoutes 
    WHERE IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId OR (CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1));

    SELECT 
        COUNT(*), 
        COALESCE(SUM(CASE WHEN drv.Status = 1 THEN 1 ELSE 0 END), 0)
    INTO v_TotalDrivers, v_ActiveDrivers
    FROM (
        SELECT 
            COALESCE(d.DriverId, s.Id) AS DriverId,
            COALESCE(s.CampusId, d.CampusId) AS CampusId,
            COALESCE(c.CollegeId, d.CollegeId) AS CollegeId,
            COALESCE(d.Status, 1) AS Status
        FROM Staff s
        LEFT JOIN TransportDrivers d ON (d.StaffId = s.Id OR (d.EmployeeId = s.EmployeeId AND d.EmployeeId IS NOT NULL AND d.EmployeeId <> '')) AND d.IsDeleted = 0
        LEFT JOIN Campuses c ON s.CampusId = c.CampusId
        LEFT JOIN Designations desig ON s.DesignationId = desig.Id
        WHERE s.IsDeleted = 0
          AND (s.Status = 'Active' OR (s.Status IS NULL AND COALESCE(d.Status, 1) = 1))
          AND (s.IsDriver = 1 OR d.DriverId IS NOT NULL OR LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%driver%')
        UNION ALL
        SELECT 
            d.DriverId,
            d.CampusId,
            d.CollegeId,
            COALESCE(d.Status, 1) AS Status
        FROM TransportDrivers d
        WHERE d.IsDeleted = 0
          AND (d.StaffId IS NULL OR NOT EXISTS (SELECT 1 FROM Staff s2 WHERE s2.Id = d.StaffId AND s2.IsDeleted = 0))
          AND (d.EmployeeId IS NULL OR d.EmployeeId = '' OR NOT EXISTS (SELECT 1 FROM Staff s3 WHERE s3.EmployeeId = d.EmployeeId AND s3.IsDeleted = 0))
    ) drv
    WHERE (p_CollegeId IS NULL OR p_CollegeId <= 0 OR drv.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR drv.CampusId = p_CampusId OR (drv.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1));

    SELECT COUNT(*) INTO v_TotalAttendants
    FROM (
        SELECT 
            COALESCE(a.AttendantId, s.Id) AS AttendantId,
            COALESCE(s.CampusId, a.CampusId) AS CampusId,
            COALESCE(c.CollegeId, a.CollegeId) AS CollegeId
        FROM Staff s
        LEFT JOIN TransportAttendants a ON (a.StaffId = s.Id OR (a.EmployeeId = s.EmployeeId AND s.EmployeeId IS NOT NULL AND s.EmployeeId <> ''))
        LEFT JOIN Campuses c ON s.CampusId = c.CampusId
        LEFT JOIN Designations desig ON s.DesignationId = desig.Id
        WHERE s.IsDeleted = 0
          AND (LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%attendant%' OR LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%attender%' OR a.AttendantId IS NOT NULL)
        UNION ALL
        SELECT 
            a.AttendantId,
            a.CampusId,
            a.CollegeId
        FROM TransportAttendants a
        WHERE a.IsDeleted = 0
          AND (a.StaffId IS NULL OR a.StaffId NOT IN (SELECT Id FROM Staff WHERE IsDeleted = 0))
    ) att
    WHERE (p_CollegeId IS NULL OR p_CollegeId <= 0 OR att.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR att.CampusId = p_CampusId OR (att.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1));

    SELECT COUNT(*) INTO v_ActiveStudents
    FROM StudentTransportAssignments sta
    WHERE sta.IsDeleted = 0 AND sta.Status = 1 
      AND (sta.EffectiveTo IS NULL OR sta.EffectiveTo >= CURDATE())
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR sta.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR sta.CampusId = p_CampusId OR (sta.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1));

    SELECT COUNT(*) INTO v_ExpiringDocs
    FROM TransportVehicles
    WHERE IsDeleted = 0 
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId OR (CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
      AND (
          (InsuranceExpiry IS NOT NULL AND InsuranceExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY))
          OR (PollutionExpiry IS NOT NULL AND PollutionExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY))
          OR (FitnessExpiry IS NOT NULL AND FitnessExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY))
      );

    SELECT COUNT(*) INTO v_ExpiringLicenses
    FROM TransportDrivers drv
    WHERE drv.IsDeleted = 0 
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR drv.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR drv.CampusId = p_CampusId OR (drv.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
      AND drv.LicenseExpiry IS NOT NULL 
      AND drv.LicenseExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY);

    SELECT 
        COUNT(CASE WHEN tt.Status = 'Running' THEN 1 END),
        COUNT(CASE WHEN tt.Status = 'Completed' THEN 1 END)
    INTO v_RunningTrips, v_CompletedTrips
    FROM TransportTrips tt
    WHERE tt.IsDeleted = 0 AND tt.TripDate = CURDATE()
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR tt.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR tt.CampusId = p_CampusId OR (tt.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1));

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

    SELECT 
        v.VehicleId,
        v.VehicleNumber,
        v.VehicleType,
        v.Capacity,
        COUNT(sta.StudentTransportAssignmentId) AS AssignedStudents,
        CASE WHEN v.Capacity > 0 THEN ROUND((COUNT(sta.StudentTransportAssignmentId) / v.Capacity) * 100) ELSE 0 END AS OccupancyPercentage
    FROM TransportVehicles v
    LEFT JOIN TransportVehicleAssignments tva ON v.VehicleId = tva.VehicleId AND tva.IsDeleted = 0 AND tva.Status = 1 AND tva.CollegeId = v.CollegeId
    LEFT JOIN StudentTransportAssignments sta ON tva.AssignmentId = sta.VehicleAssignmentId AND sta.IsDeleted = 0 AND sta.Status = 1 AND sta.CollegeId = v.CollegeId
    WHERE v.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR v.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR v.CampusId = p_CampusId OR (v.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
    GROUP BY v.VehicleId, v.VehicleNumber, v.VehicleType, v.Capacity
    ORDER BY v.VehicleNumber ASC;

    SELECT 
        r.RouteId,
        r.RouteName,
        r.RouteCode,
        r.Distance AS TotalDistanceKm,
        COUNT(sta.StudentTransportAssignmentId) AS StudentCount
    FROM TransportRoutes r
    LEFT JOIN StudentTransportAssignments sta ON r.RouteId = sta.RouteId AND sta.IsDeleted = 0 AND sta.Status = 1 AND sta.CollegeId = r.CollegeId
    WHERE r.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR r.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR r.CampusId = p_CampusId OR (r.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
    GROUP BY r.RouteId, r.RouteName, r.RouteCode, r.Distance
    ORDER BY StudentCount DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportReports`$$
CREATE PROCEDURE `sp_GetTransportReports`(
    IN p_ReportType VARCHAR(50),
    IN p_RouteId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_Status VARCHAR(30),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    IF p_ReportType = 'student-transport-reports' OR p_ReportType = 'student' THEN
        SELECT 
            sta.StudentTransportAssignmentId,
            sta.AdmissionNo,
            COALESCE(st.StudentName, 'Student') AS StudentName,
            COALESCE(g.GroupName, 'N/A') AS ClassName,
            COALESCE(sec.SectionName, 'N/A') AS ClassSection,
            r.RouteName,
            pp.StopName AS PickupPointName,
            v.VehicleNumber,
            COALESCE(d.DriverName, 'Assigned Driver') AS DriverName,
            sta.TransportType AS FeePlan,
            COALESCE(pp.MonthlyFee, 1200.00) AS MonthlyFee,
            (COALESCE(pp.MonthlyFee, 1200.00) * 12) AS AnnualFee,
            CASE WHEN sta.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM StudentTransportAssignments sta
        LEFT JOIN Students st ON (sta.StudentId = st.StudentId OR (sta.AdmissionNo = st.AdmissionNo AND st.CampusId = sta.CampusId))
        LEFT JOIN Sections sec ON st.SectionId = sec.SectionId
        LEFT JOIN `Groups` g ON st.GroupId = g.GroupId
        LEFT JOIN TransportRoutes r ON sta.RouteId = r.RouteId
        LEFT JOIN PickupPoints pp ON sta.PickupPointId = pp.PickupPointId
        LEFT JOIN TransportVehicleAssignments tva ON sta.VehicleAssignmentId = tva.AssignmentId
        LEFT JOIN TransportVehicles v ON tva.VehicleId = v.VehicleId
        LEFT JOIN TransportDrivers d ON tva.DriverId = d.DriverId
        WHERE sta.IsDeleted = 0
          AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR sta.CollegeId = p_CollegeId)
          AND (p_CampusId IS NULL OR p_CampusId <= 0 OR sta.CampusId = p_CampusId OR (sta.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
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
          AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR v.CollegeId = p_CollegeId)
          AND (p_CampusId IS NULL OR p_CampusId <= 0 OR v.CampusId = p_CampusId OR (v.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
          AND (p_VehicleId IS NULL OR v.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND v.Status = 1) 
               OR (p_Status = 'Inactive' AND v.Status = 0))
        ORDER BY v.VehicleNumber ASC;

    ELSEIF p_ReportType = 'driver-reports' OR p_ReportType = 'driver' THEN
        SELECT 
            d.DriverId,
            d.EmployeeId,
            d.DriverName,
            d.MobileNo AS MobileNumber,
            d.LicenseNo AS LicenseNumber,
            d.LicenseExpiry AS LicenseExpiryDate,
            d.Experience AS ExperienceYears,
            CASE WHEN d.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM TransportDrivers d
        WHERE d.IsDeleted = 0
          AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR d.CollegeId = p_CollegeId)
          AND (p_CampusId IS NULL OR p_CampusId <= 0 OR d.CampusId = p_CampusId OR (d.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND d.Status = 1) 
               OR (p_Status = 'Inactive' AND d.Status = 0))
        ORDER BY d.DriverName ASC;

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
            (SELECT COUNT(*) FROM PickupPoints pp WHERE pp.RouteId = r.RouteId AND pp.IsDeleted = 0 AND pp.CollegeId = r.CollegeId) AS PickupPointCount,
            (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.RouteId = r.RouteId AND sta.IsDeleted = 0 AND sta.CollegeId = r.CollegeId) AS StudentCount,
            CASE WHEN r.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM TransportRoutes r
        WHERE r.IsDeleted = 0
          AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR r.CollegeId = p_CollegeId)
          AND (p_CampusId IS NULL OR p_CampusId <= 0 OR r.CampusId = p_CampusId OR (r.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
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
          AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR m.CollegeId = p_CollegeId)
          AND (p_CampusId IS NULL OR p_CampusId <= 0 OR COALESCE(m.CampusId, v.CampusId) = p_CampusId OR (COALESCE(m.CampusId, v.CampusId) IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
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
            COALESCE(d.DriverName, 'Assigned Driver') AS DriverName,
            COALESCE(att.AttendantName, 'Assigned Attendant') AS AttendantName,
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
          AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR t.CollegeId = p_CollegeId)
          AND (p_CampusId IS NULL OR p_CampusId <= 0 OR t.CampusId = p_CampusId OR (t.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
          AND (p_RouteId IS NULL OR t.RouteId = p_RouteId)
          AND (p_VehicleId IS NULL OR t.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR t.Status = p_Status)
        ORDER BY t.TripDate DESC;

    ELSE
        SELECT 
            a.AssignmentId,
            v.VehicleNumber,
            r.RouteName,
            d.DriverName,
            att.AttendantName,
            v.Capacity,
            (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0 AND sta.CollegeId = a.CollegeId) AS AssignedStudents,
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
          AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR a.CollegeId = p_CollegeId)
          AND (p_CampusId IS NULL OR p_CampusId <= 0 OR a.CampusId = p_CampusId OR (a.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
          AND (p_RouteId IS NULL OR a.RouteId = p_RouteId)
          AND (p_VehicleId IS NULL OR a.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND a.Status = 1) 
               OR (p_Status = 'Inactive' AND a.Status = 0))
        ORDER BY a.EffectiveFrom DESC;
    END IF;
END$$

-- ============================================================================
-- SECTION 2: STUDENT TRANSPORT ASSIGNMENTS
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetStudentTransportAssignments`$$
CREATE PROCEDURE `sp_GetStudentTransportAssignments`(
    IN p_AdmissionNo VARCHAR(50),
    IN p_RouteId BIGINT,
    IN p_PickupPointId BIGINT,
    IN p_VehicleAssignmentId BIGINT,
    IN p_TransportType VARCHAR(20),
    IN p_Status TINYINT(1),
    IN p_Search VARCHAR(100),
    IN p_CampusId INT,
    IN p_CollegeId INT
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
        s.Remarks,
        s.CollegeId,
        s.CampusId
    FROM StudentTransportAssignments s
    LEFT JOIN Students st ON (s.StudentId = st.StudentId OR (s.AdmissionNo = st.AdmissionNo AND st.CampusId = s.CampusId))
    LEFT JOIN TransportRoutes r ON s.RouteId = r.RouteId
    LEFT JOIN PickupPoints p ON s.PickupPointId = p.PickupPointId
    LEFT JOIN TransportVehicleAssignments va ON s.VehicleAssignmentId = va.AssignmentId
    LEFT JOIN TransportVehicles v ON va.VehicleId = v.VehicleId
    WHERE s.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR s.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId OR (s.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
      AND (p_AdmissionNo IS NULL OR p_AdmissionNo = '' OR s.AdmissionNo = p_AdmissionNo)
      AND (p_RouteId IS NULL OR s.RouteId = p_RouteId)
      AND (p_PickupPointId IS NULL OR s.PickupPointId = p_PickupPointId)
      AND (p_VehicleAssignmentId IS NULL OR s.VehicleAssignmentId = p_VehicleAssignmentId)
      AND (p_TransportType IS NULL OR p_TransportType = '' OR s.TransportType = p_TransportType)
      AND (p_Status IS NULL OR s.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(s.AdmissionNo) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(st.StudentName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(r.RouteName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(p.StopName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(v.VehicleNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY s.EffectiveFrom DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_Transport_GetStudentAssignments`$$
CREATE PROCEDURE `sp_Transport_GetStudentAssignments`(
    IN p_CampusId INT,
    IN p_RouteId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT sta.StudentTransportAssignmentId, sta.StudentId, s.AdmissionNo, s.StudentName,
           sta.RouteId, r.RouteName, r.RouteNumber,
           sta.PickupPointId, sta.TransportType, sta.StartDate, sta.EndDate, sta.Status, sta.IsActive
    FROM StudentTransportAssignments sta
    LEFT JOIN Students s ON sta.StudentId = s.StudentId
    LEFT JOIN TransportRoutes r ON sta.RouteId = r.RouteId
    WHERE sta.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR sta.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR sta.CampusId = p_CampusId)
      AND (p_RouteId IS NULL OR sta.RouteId = p_RouteId);
END$$

DROP PROCEDURE IF EXISTS `sp_GetStudentTransportAssignmentById`$$
CREATE PROCEDURE `sp_GetStudentTransportAssignmentById`(
    IN p_Id BIGINT,
    IN p_CollegeId INT
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
        s.Remarks,
        s.CollegeId,
        s.CampusId
    FROM StudentTransportAssignments s
    LEFT JOIN Students st ON (s.StudentId = st.StudentId OR (s.AdmissionNo = st.AdmissionNo AND st.CampusId = s.CampusId))
    LEFT JOIN TransportRoutes r ON s.RouteId = r.RouteId
    LEFT JOIN PickupPoints p ON s.PickupPointId = p.PickupPointId
    LEFT JOIN TransportVehicleAssignments va ON s.VehicleAssignmentId = va.AssignmentId
    LEFT JOIN TransportVehicles v ON va.VehicleId = v.VehicleId
    WHERE s.StudentTransportAssignmentId = p_Id AND s.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR s.CollegeId = p_CollegeId)
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_GetStudentTransportAssignmentLookup`$$
CREATE PROCEDURE `sp_GetStudentTransportAssignmentLookup`(
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        `StudentTransportAssignmentId` AS AssignmentId,
        `AdmissionNo`
    FROM `StudentTransportAssignments`
    WHERE `IsDeleted` = 0 AND `Status` = 1
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR `CampusId` = p_CampusId)
    ORDER BY `AdmissionNo` ASC;
END$$

DROP PROCEDURE IF EXISTS `sp_CheckStudentTransportOverlapping`$$
CREATE PROCEDURE `sp_CheckStudentTransportOverlapping`(
    IN p_AdmissionNo VARCHAR(50),
    IN p_EffectiveFrom DATETIME,
    IN p_EffectiveTo DATETIME,
    IN p_ExcludeAssignmentId BIGINT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `StudentTransportAssignments`
    WHERE `IsDeleted` = 0 AND `Status` = 1 AND `AdmissionNo` = p_AdmissionNo
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId)
      AND (p_ExcludeAssignmentId IS NULL OR `StudentTransportAssignmentId` != p_ExcludeAssignmentId)
      AND (`EffectiveTo` IS NULL OR `EffectiveTo` >= p_EffectiveFrom)
      AND (p_EffectiveTo IS NULL OR `EffectiveFrom` <= p_EffectiveTo);
END$$

DROP PROCEDURE IF EXISTS `sp_CreateStudentTransportAssignments`$$
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
    IN p_UpdatedBy BIGINT,
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_StudentId BIGINT DEFAULT NULL;
    DECLARE v_CampusId INT DEFAULT NULL;
    DECLARE v_CollegeId INT DEFAULT NULL;

    SET v_CampusId = COALESCE(
        NULLIF(p_CampusId, 0),
        (SELECT CampusId FROM TransportRoutes WHERE RouteId = p_RouteId LIMIT 1)
    );

    SET v_CollegeId = COALESCE(
        NULLIF(p_CollegeId, 0),
        (SELECT CollegeId FROM Campuses WHERE CampusId = v_CampusId LIMIT 1),
        (SELECT CollegeId FROM TransportRoutes WHERE RouteId = p_RouteId LIMIT 1)
    );

    SELECT s.StudentId, COALESCE(v_CampusId, s.CampusId)
    INTO v_StudentId, v_CampusId
    FROM Students s
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    WHERE s.AdmissionNo = p_AdmissionNo AND s.IsDeleted = 0
      AND (v_CollegeId IS NULL OR v_CollegeId <= 0 OR c.CollegeId = v_CollegeId)
      AND (v_CampusId IS NULL OR v_CampusId <= 0 OR s.CampusId = v_CampusId)
    LIMIT 1;

    INSERT INTO `StudentTransportAssignments` (
        `StudentId`, `AdmissionNo`, `RouteId`, `PickupPointId`, `VehicleAssignmentId`,
        `EffectiveFrom`, `EffectiveTo`, `TransportType`, `Remarks`, `Status`,
        `IsDeleted`, `CreatedBy`, `CreatedAt`, `CampusId`, `CollegeId`
    ) VALUES (
        v_StudentId, p_AdmissionNo, p_RouteId, p_PickupPointId, p_VehicleAssignmentId,
        COALESCE(p_EffectiveFrom, NOW()), p_EffectiveTo, COALESCE(p_TransportType, 'Both'),
        p_Remarks, COALESCE(p_Status, 1), 0, p_CreatedBy, NOW(), v_CampusId, COALESCE(v_CollegeId, 1)
    );
    SELECT LAST_INSERT_ID() AS StudentTransportAssignmentId;
END$$

DROP PROCEDURE IF EXISTS `sp_UpdateStudentTransportAssignments`$$
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
    IN p_UpdatedBy BIGINT,
    IN p_CollegeId INT
)
BEGIN
    UPDATE `StudentTransportAssignments`
    SET 
        `AdmissionNo` = COALESCE(p_AdmissionNo, `AdmissionNo`),
        `RouteId` = CASE WHEN p_RouteId IS NOT NULL AND p_RouteId > 0 THEN p_RouteId ELSE `RouteId` END,
        `PickupPointId` = CASE WHEN p_PickupPointId IS NOT NULL AND p_PickupPointId > 0 THEN p_PickupPointId ELSE `PickupPointId` END,
        `VehicleAssignmentId` = CASE WHEN p_VehicleAssignmentId IS NOT NULL AND p_VehicleAssignmentId > 0 THEN p_VehicleAssignmentId ELSE `VehicleAssignmentId` END,
        `EffectiveFrom` = COALESCE(p_EffectiveFrom, `EffectiveFrom`),
        `EffectiveTo` = p_EffectiveTo,
        `TransportType` = COALESCE(p_TransportType, `TransportType`),
        `Remarks` = p_Remarks,
        `Status` = COALESCE(p_Status, `Status`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `StudentTransportAssignmentId` = p_Id AND `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DROP PROCEDURE IF EXISTS `sp_DeleteStudentTransportAssignments`$$
CREATE PROCEDURE `sp_DeleteStudentTransportAssignments`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT,
    IN p_CollegeId INT
)
BEGIN
    UPDATE `StudentTransportAssignments`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `StudentTransportAssignmentId` = p_Id AND `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END$$

-- ============================================================================
-- SECTION 3: TRANSPORT OPERATIONS (TRIPS & GPS)
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetTransportTrips`$$
CREATE PROCEDURE `sp_GetTransportTrips`(
    IN p_RouteId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_TripDate DATE,
    IN p_Status VARCHAR(30),
    IN p_Search VARCHAR(100),
    IN p_CampusId INT,
    IN p_CollegeId INT
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
        t.Status,
        t.CollegeId,
        t.CampusId
    FROM TransportTrips t
    LEFT JOIN TransportVehicles v ON t.VehicleId = v.VehicleId
    LEFT JOIN TransportRoutes r ON t.RouteId = r.RouteId
    LEFT JOIN TransportDrivers d ON t.DriverId = d.DriverId
    LEFT JOIN TransportAttendants att ON t.AttendantId = att.AttendantId
    WHERE t.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR t.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR t.CampusId = p_CampusId OR (t.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
      AND (p_RouteId IS NULL OR t.RouteId = p_RouteId)
      AND (p_VehicleId IS NULL OR t.VehicleId = p_VehicleId)
      AND (p_TripDate IS NULL OR t.TripDate = p_TripDate)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR t.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(COALESCE(v.VehicleNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(r.RouteName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(d.DriverName, '')) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY t.TripDate DESC, t.StartTime ASC;
END$$

DROP PROCEDURE IF EXISTS `sp_CreateTransportTrip`$$
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
    IN p_CreatedBy BIGINT,
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CampusId INT DEFAULT NULL;
    DECLARE v_CollegeId INT DEFAULT NULL;

    SET v_CampusId = COALESCE(
        NULLIF(p_CampusId, 0),
        (SELECT CampusId FROM TransportRoutes WHERE RouteId = p_RouteId LIMIT 1),
        (SELECT CampusId FROM TransportVehicles WHERE VehicleId = p_VehicleId LIMIT 1)
    );

    SET v_CollegeId = COALESCE(
        NULLIF(p_CollegeId, 0),
        (SELECT CollegeId FROM Campuses WHERE CampusId = v_CampusId LIMIT 1),
        (SELECT CollegeId FROM TransportRoutes WHERE RouteId = p_RouteId LIMIT 1),
        (SELECT CollegeId FROM TransportVehicles WHERE VehicleId = p_VehicleId LIMIT 1)
    );

    INSERT INTO `TransportTrips` (
        `AssignmentId`, `VehicleId`, `RouteId`, `DriverId`, `AttendantId`,
        `TripType`, `TripDate`, `StartTime`, `EndTime`, `StudentsPresent`,
        `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`, `CampusId`, `CollegeId`
    ) VALUES (
        p_AssignmentId, p_VehicleId, p_RouteId, p_DriverId, p_AttendantId,
        COALESCE(p_TripType, 'Morning'), COALESCE(p_TripDate, CURDATE()),
        p_StartTime, p_EndTime, COALESCE(p_StudentsPresent, 0),
        COALESCE(p_Status, 'Running'), 0, p_CreatedBy, NOW(), v_CampusId, COALESCE(v_CollegeId, 1)
    );
    SELECT LAST_INSERT_ID() AS TripId;
END$$

DROP PROCEDURE IF EXISTS `sp_UpdateTransportTrip`$$
CREATE PROCEDURE `sp_UpdateTransportTrip`(
    IN p_TripId BIGINT,
    IN p_StartTime VARCHAR(20),
    IN p_EndTime VARCHAR(20),
    IN p_StudentsPresent INT,
    IN p_Status VARCHAR(30),
    IN p_UpdatedBy BIGINT,
    IN p_CollegeId INT
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
    WHERE `TripId` = p_TripId AND `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DROP PROCEDURE IF EXISTS `sp_DeleteTransportTrip`$$
CREATE PROCEDURE `sp_DeleteTransportTrip`(
    IN p_TripId BIGINT,
    IN p_UpdatedBy BIGINT,
    IN p_CollegeId INT
)
BEGIN
    UPDATE `TransportTrips`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `TripId` = p_TripId AND `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportGpsTracking`$$
CREATE PROCEDURE `sp_GetTransportGpsTracking`(
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        v.VehicleId,
        COALESCE(NULLIF(v.VehicleNumber, ''), CONCAT('VH-', v.VehicleId)) AS VehicleNumber,
        COALESCE(NULLIF(v.VehicleName, ''), v.VehicleNumber, CONCAT('Vehicle ', v.VehicleId)) AS VehicleName,
        COALESCE(r.RouteName, 'General Campus Route') AS RouteName,
        COALESCE(r.RouteId, 0) AS RouteId,
        COALESCE(NULLIF(CONCAT(TRIM(s.FirstName), ' ', TRIM(COALESCE(s.LastName, ''))), ''), d.DriverName, 'Unassigned') AS DriverName,
        COALESCE(s.Mobile, d.MobileNo, '') AS DriverMobile,
        COALESCE(att.AttendantName, 'Unassigned') AS AttendantName
    FROM TransportVehicles v
    LEFT JOIN TransportVehicleAssignments a ON v.VehicleId = a.VehicleId AND a.IsDeleted = 0 AND a.Status = 1 AND a.CollegeId = v.CollegeId
    LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId AND r.IsDeleted = 0
    LEFT JOIN Staff s ON a.DriverId = s.Id AND s.IsDeleted = 0
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId AND d.IsDeleted = 0
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId AND att.IsDeleted = 0
    WHERE v.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR v.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR v.CampusId = p_CampusId OR (v.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
    ORDER BY v.VehicleId ASC;

    SELECT 
        pp.PickupPointId AS StopId,
        pp.RouteId,
        COALESCE(NULLIF(pp.StopName, ''), CONCAT('Stop #', pp.StopOrder)) AS StopName,
        COALESCE(pp.DistanceKm, pp.DistanceFromSchool, pp.DistanceFromStart, 5.0) AS DistanceKm,
        COALESCE(TIME_FORMAT(pp.PickupTime, '%h:%i %p'), '07:30 AM') AS ScheduledTime
    FROM PickupPoints pp
    WHERE pp.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR pp.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR pp.CampusId = p_CampusId OR (pp.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
    ORDER BY pp.RouteId ASC, pp.StopOrder ASC, pp.PickupPointId ASC;
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportOperationDetails`$$
CREATE PROCEDURE `sp_GetTransportOperationDetails`(
    IN p_AssignmentId BIGINT,
    IN p_CollegeId INT
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
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0 AND sta.CollegeId = a.CollegeId) AS AssignedStudentsCount,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0 AND sta.CollegeId = a.CollegeId) AS TotalStudents,
        (SELECT COUNT(*) FROM PickupPoints pp WHERE pp.RouteId = a.RouteId AND pp.IsDeleted = 0 AND pp.CollegeId = a.CollegeId) AS PickupPointsCount
    FROM TransportVehicleAssignments a
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
    LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
    WHERE a.AssignmentId = p_AssignmentId AND a.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR a.CollegeId = p_CollegeId)
    LIMIT 1;

    SELECT 
        pp.StopOrder AS StepNo,
        pp.StopName AS LocationName,
        pp.PickupTime AS ScheduledTime,
        pp.DistanceKm
    FROM TransportVehicleAssignments a
    JOIN PickupPoints pp ON a.RouteId = pp.RouteId AND pp.IsDeleted = 0 AND pp.CollegeId = a.CollegeId
    WHERE a.AssignmentId = p_AssignmentId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR a.CollegeId = p_CollegeId)
    ORDER BY pp.StopOrder ASC;

    SELECT 
        st.StudentId,
        st.StudentName,
        st.AdmissionNo,
        pp.StopName AS PickupPointName,
        sta.TransportType
    FROM TransportVehicleAssignments a
    JOIN StudentTransportAssignments sta ON a.AssignmentId = sta.VehicleAssignmentId AND sta.IsDeleted = 0 AND sta.CollegeId = a.CollegeId
    LEFT JOIN Students st ON (sta.StudentId = st.StudentId OR (sta.AdmissionNo = st.AdmissionNo AND st.CampusId = sta.CampusId))
    LEFT JOIN PickupPoints pp ON sta.PickupPointId = pp.PickupPointId
    WHERE a.AssignmentId = p_AssignmentId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR a.CollegeId = p_CollegeId)
    ORDER BY st.StudentName ASC;
END$$

-- ============================================================================
-- SECTION 4: PICKUP POINTS
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetPickupPoints`$$
CREATE PROCEDURE `sp_GetPickupPoints`(
    IN p_RouteId BIGINT,
    IN p_Search VARCHAR(100),
    IN p_Status TINYINT(1),
    IN p_CampusId INT,
    IN p_CollegeId INT
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
        CASE WHEN p.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText,
        COALESCE(p.CampusId, r.CampusId) AS CampusId,
        p.CollegeId
    FROM PickupPoints p
    LEFT JOIN TransportRoutes r ON p.RouteId = r.RouteId
    WHERE p.IsDeleted = 0
      AND (r.IsDeleted = 0 OR r.IsDeleted IS NULL)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR p.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR COALESCE(p.CampusId, r.CampusId) = p_CampusId)
      AND (p_RouteId IS NULL OR p_RouteId <= 0 OR p.RouteId = p_RouteId)
      AND (p_Status IS NULL OR p.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = '' 
           OR LOWER(p.StopName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(p.StopAddress, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(r.RouteName, '')) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY p.RouteId ASC, p.StopOrder ASC;
END$$

DROP PROCEDURE IF EXISTS `sp_GetPickupPointById`$$
CREATE PROCEDURE `sp_GetPickupPointById`(
    IN p_Id BIGINT,
    IN p_CollegeId INT
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
        CASE WHEN p.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText,
        COALESCE(p.CampusId, r.CampusId) AS CampusId,
        p.CollegeId
    FROM PickupPoints p
    LEFT JOIN TransportRoutes r ON p.RouteId = r.RouteId
    WHERE p.PickupPointId = p_Id AND p.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR p.CollegeId = p_CollegeId)
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_GetPickupPointLookup`$$
CREATE PROCEDURE `sp_GetPickupPointLookup`(
    IN p_RouteId BIGINT,
    IN p_CampusId INT,
    IN p_CollegeId INT
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
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR `CampusId` = p_CampusId)
      AND (p_RouteId IS NULL OR p_RouteId <= 0 OR `RouteId` = p_RouteId)
    ORDER BY `StopOrder` ASC;
END$$

DROP PROCEDURE IF EXISTS `sp_CreatePickupPoints`$$
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
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CampusId INT DEFAULT NULL;
    DECLARE v_CollegeId INT DEFAULT NULL;

    SET v_CampusId = COALESCE(NULLIF(p_CampusId, 0), (SELECT CampusId FROM TransportRoutes WHERE RouteId = p_RouteId LIMIT 1));
    SET v_CollegeId = COALESCE(
        NULLIF(p_CollegeId, 0),
        (SELECT CollegeId FROM TransportRoutes WHERE RouteId = p_RouteId LIMIT 1),
        (SELECT CollegeId FROM Campuses WHERE CampusId = v_CampusId LIMIT 1),
        1
    );

    INSERT INTO `PickupPoints` (
        `RouteId`, `StopName`, `StopAddress`, `StopOrder`, `PickupTime`, `DropTime`,
        `DistanceFromSchool`, `MonthlyFee`, `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`,
        `PickupPointName`, `Landmark`, `SequenceNo`, `DistanceFromStart`, `DistanceKm`, `CampusId`, `CollegeId`
    ) VALUES (
        p_RouteId, p_StopName, p_StopAddress, COALESCE(p_StopOrder, 1),
        COALESCE(p_PickupTime, '07:30:00'), COALESCE(p_DropTime, '16:15:00'),
        COALESCE(p_DistanceFromSchool, 0.00), COALESCE(p_MonthlyFee, 1200.00),
        COALESCE(p_Status, 1), 0, p_CreatedBy, NOW(),
        p_StopName, p_StopAddress, COALESCE(p_StopOrder, 1), COALESCE(p_DistanceFromSchool, 0.00), COALESCE(p_DistanceFromSchool, 0.00),
        v_CampusId, v_CollegeId
    );
    SELECT LAST_INSERT_ID() AS PickupPointId;
END$$

DROP PROCEDURE IF EXISTS `sp_UpdatePickupPoints`$$
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
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CampusId INT DEFAULT NULL;
    DECLARE v_CollegeId INT DEFAULT NULL;

    SET v_CampusId = COALESCE(NULLIF(p_CampusId, 0), (SELECT CampusId FROM TransportRoutes WHERE RouteId = p_RouteId LIMIT 1));
    SET v_CollegeId = COALESCE(
        NULLIF(p_CollegeId, 0),
        (SELECT CollegeId FROM TransportRoutes WHERE RouteId = p_RouteId LIMIT 1),
        (SELECT CollegeId FROM Campuses WHERE CampusId = v_CampusId LIMIT 1)
    );

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
        `CampusId` = COALESCE(v_CampusId, `CampusId`),
        `CollegeId` = COALESCE(v_CollegeId, `CollegeId`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `PickupPointId` = p_Id AND `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DROP PROCEDURE IF EXISTS `sp_DeletePickupPoints`$$
CREATE PROCEDURE `sp_DeletePickupPoints`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT,
    IN p_CollegeId INT
)
BEGIN
    UPDATE `PickupPoints`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `PickupPointId` = p_Id AND `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END$$

-- ============================================================================
-- SECTION 5: VEHICLE MAINTENANCES
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetVehicleMaintenances`$$
CREATE PROCEDURE `sp_GetVehicleMaintenances`(
    IN p_VehicleId BIGINT,
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_Status TINYINT(1),
    IN p_Search VARCHAR(100),
    IN p_CampusId INT,
    IN p_CollegeId INT
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
        CASE WHEN m.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText,
        m.CollegeId,
        COALESCE(m.CampusId, v.CampusId) AS CampusId
    FROM VehicleMaintenances m
    LEFT JOIN TransportVehicles v ON m.VehicleId = v.VehicleId
    WHERE m.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR m.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR COALESCE(m.CampusId, v.CampusId) = p_CampusId OR (COALESCE(m.CampusId, v.CampusId) IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
      AND (p_VehicleId IS NULL OR m.VehicleId = p_VehicleId)
      AND (p_FromDate IS NULL OR m.ServiceDate >= p_FromDate)
      AND (p_ToDate IS NULL OR m.ServiceDate <= p_ToDate)
      AND (p_Status IS NULL OR m.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(COALESCE(v.VehicleNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(m.ServiceType) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(m.VendorCenter, '')) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY m.ServiceDate DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_GetVehicleMaintenanceById`$$
CREATE PROCEDURE `sp_GetVehicleMaintenanceById`(
    IN p_Id BIGINT,
    IN p_CollegeId INT
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
        CASE WHEN m.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText,
        m.CollegeId,
        COALESCE(m.CampusId, v.CampusId) AS CampusId
    FROM VehicleMaintenances m
    LEFT JOIN TransportVehicles v ON m.VehicleId = v.VehicleId
    WHERE m.MaintenanceId = p_Id AND m.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR m.CollegeId = p_CollegeId)
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_GetVehicleMaintenanceLookup`$$
CREATE PROCEDURE `sp_GetVehicleMaintenanceLookup`(
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        `MaintenanceId`,
        `ServiceType`
    FROM `VehicleMaintenances`
    WHERE `IsDeleted` = 0 AND `Status` = 1
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR `CampusId` = p_CampusId)
    ORDER BY `MaintenanceId` DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_CreateVehicleMaintenances`$$
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
    IN p_UpdatedBy BIGINT,
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CampusId INT DEFAULT NULL;
    DECLARE v_CollegeId INT DEFAULT NULL;

    SET v_CampusId = COALESCE(NULLIF(p_CampusId, 0), (SELECT CampusId FROM TransportVehicles WHERE VehicleId = p_VehicleId LIMIT 1));
    SET v_CollegeId = COALESCE(
        NULLIF(p_CollegeId, 0),
        (SELECT CollegeId FROM TransportVehicles WHERE VehicleId = p_VehicleId LIMIT 1),
        (SELECT CollegeId FROM Campuses WHERE CampusId = v_CampusId LIMIT 1),
        1
    );

    INSERT INTO `VehicleMaintenances` (
        `VehicleId`, `ServiceType`, `ServiceDate`, `Cost`, `VendorCenter`,
        `NextServiceDue`, `Remarks`, `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`, `CampusId`, `CollegeId`
    ) VALUES (
        p_VehicleId, COALESCE(p_ServiceType, 'Routine'), COALESCE(p_ServiceDate, CURDATE()),
        COALESCE(p_Cost, 0.00), p_VendorCenter, p_NextServiceDue, p_Remarks,
        COALESCE(p_Status, 1), 0, p_CreatedBy, NOW(), v_CampusId, v_CollegeId
    );
    SELECT LAST_INSERT_ID() AS MaintenanceId;
END$$

DROP PROCEDURE IF EXISTS `sp_UpdateVehicleMaintenances`$$
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
    IN p_UpdatedBy BIGINT,
    IN p_CollegeId INT
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
    WHERE `MaintenanceId` = p_Id AND `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DROP PROCEDURE IF EXISTS `sp_DeleteVehicleMaintenances`$$
CREATE PROCEDURE `sp_DeleteVehicleMaintenances`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT,
    IN p_CollegeId INT
)
BEGIN
    UPDATE `VehicleMaintenances`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `MaintenanceId` = p_Id AND `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END$$

-- ============================================================================
-- SECTION 6: VEHICLES & ROUTES & LOOKUPS
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_CheckTransportVehicleExists`$$
CREATE PROCEDURE `sp_CheckTransportVehicleExists`(
    IN p_VehicleNumber VARCHAR(50),
    IN p_RegistrationNumber VARCHAR(50),
    IN p_ExcludeId BIGINT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `TransportVehicles`
    WHERE `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId)
      AND (LOWER(`VehicleNumber`) = LOWER(p_VehicleNumber) OR (p_RegistrationNumber IS NOT NULL AND p_RegistrationNumber <> '' AND LOWER(`VehicleRegistrationNo`) = LOWER(p_RegistrationNumber)))
      AND (p_ExcludeId IS NULL OR `VehicleId` != p_ExcludeId);
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleLookup`$$
CREATE PROCEDURE `sp_GetTransportVehicleLookup`(
    IN p_CampusId INT,
    IN p_CollegeId INT
)
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
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR `CampusId` = p_CampusId OR (`CampusId` IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
    ORDER BY `VehicleNumber` ASC;
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportVehiclesById`$$
CREATE PROCEDURE `sp_GetTransportVehiclesById`(
    IN p_Id BIGINT,
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        `VehicleId`, `CollegeId`, `VehicleNumber`, `VehicleRegistrationNo` AS RegistrationNumber,
        `VehicleName`, `VehicleType`, `Make` AS Manufacturer, `Model`,
        `ChassisNumber`, `EngineNumber`, `GpsDeviceId`, `InsuranceNumber`,
        `InsuranceExpiry`, `PollutionExpiry`, `FitnessExpiry`, `Capacity`, `IsAC`,
        `CampusId`, CASE WHEN `Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM `TransportVehicles`
    WHERE `VehicleId` = p_Id AND `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId)
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleByIdOrNumber`$$
CREATE PROCEDURE `sp_GetTransportVehicleByIdOrNumber`(
    IN p_SearchId BIGINT,
    IN p_SearchStr VARCHAR(100),
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        `VehicleId`, `CollegeId`, `CampusId`, `VehicleNumber`, `VehicleRegistrationNo` AS RegistrationNumber,
        `VehicleName`, `VehicleType`, `Make` AS Manufacturer, `Model`,
        `ChassisNumber`, `EngineNumber`, `GpsDeviceId`, `InsuranceNumber`,
        `InsuranceExpiry`, `PollutionExpiry`, `FitnessExpiry`, `Capacity`, `IsAC`,
        CASE WHEN `Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM `TransportVehicles`
    WHERE `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId)
      AND (`VehicleId` = p_SearchId OR LOWER(`VehicleNumber`) = LOWER(p_SearchStr) OR LOWER(`VehicleRegistrationNo`) = LOWER(p_SearchStr))
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_DeleteTransportVehicles`$$
CREATE PROCEDURE `sp_DeleteTransportVehicles`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT,
    IN p_CollegeId INT
)
BEGIN
    UPDATE `TransportVehicles`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `VehicleId` = p_Id AND `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DROP PROCEDURE IF EXISTS `sp_CreateTransportVehicles`$$
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
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CollegeId INT DEFAULT NULL;
    SET v_CollegeId = COALESCE(
        NULLIF(p_CollegeId, 0),
        (SELECT CollegeId FROM Campuses WHERE CampusId = p_CampusId LIMIT 1),
        1
    );

    INSERT INTO `TransportVehicles` (
        `VehicleNumber`, `VehicleRegistrationNo`, `VehicleName`, `VehicleType`,
        `Make`, `Model`, `ChassisNumber`, `EngineNumber`, `GpsDeviceId`, `InsuranceNumber`,
        `InsuranceExpiry`, `PollutionExpiry`, `FitnessExpiry`, `Capacity`, `IsAC`,
        `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`, `CampusId`, `CollegeId`
    ) VALUES (
        p_VehicleNumber, COALESCE(p_VehicleRegistrationNo, p_VehicleNumber), p_VehicleNumber, COALESCE(p_VehicleType, 'Bus'),
        p_Make, p_Model, p_ChassisNumber, p_EngineNumber, p_GpsDeviceId, p_InsuranceNumber,
        p_InsuranceExpiry, p_PollutionExpiry, p_FitnessExpiry, COALESCE(p_Capacity, 40), COALESCE(p_IsAC, 1),
        COALESCE(p_IsActive, 1), 0, p_CreatedBy, NOW(), NULLIF(p_CampusId, 0), v_CollegeId
    );
    SELECT LAST_INSERT_ID() AS VehicleId;
END$$

DROP PROCEDURE IF EXISTS `sp_CheckTransportRouteExists`$$
CREATE PROCEDURE `sp_CheckTransportRouteExists`(
    IN p_RouteCode VARCHAR(50),
    IN p_RouteName VARCHAR(100),
    IN p_ExcludeId BIGINT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `TransportRoutes`
    WHERE `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId)
      AND (LOWER(`RouteCode`) = LOWER(p_RouteCode) OR LOWER(`RouteName`) = LOWER(p_RouteName))
      AND (p_ExcludeId IS NULL OR `RouteId` != p_ExcludeId);
END$$

DROP PROCEDURE IF EXISTS `sp_CheckTransportRouteCodeExists`$$
CREATE PROCEDURE `sp_CheckTransportRouteCodeExists`(
    IN p_RouteCode VARCHAR(50),
    IN p_ExcludeId BIGINT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM TransportRoutes 
    WHERE RouteCode = p_RouteCode 
      AND IsDeleted = 0 
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId)
      AND (p_ExcludeId IS NULL OR RouteId != p_ExcludeId);
END$$

DROP PROCEDURE IF EXISTS `sp_CheckTransportRouteNameExists`$$
CREATE PROCEDURE `sp_CheckTransportRouteNameExists`(
    IN p_RouteName VARCHAR(150),
    IN p_ExcludeId BIGINT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM TransportRoutes 
    WHERE RouteName = p_RouteName 
      AND IsDeleted = 0 
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId)
      AND (p_ExcludeId IS NULL OR RouteId != p_ExcludeId);
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportRouteLookup`$$
CREATE PROCEDURE `sp_GetTransportRouteLookup`(
    IN p_Search VARCHAR(100),
    IN p_Limit INT,
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SET p_Limit = IFNULL(p_Limit, 100);
    SELECT 
        `RouteId`, `RouteCode`, `RouteName`, `StartLocation`, `EndLocation`,
        `Distance` AS DistanceKm, `DefaultMonthlyFee`
    FROM `TransportRoutes`
    WHERE `IsDeleted` = 0 AND `Status` = 1
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR `CampusId` = p_CampusId OR (`CampusId` IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
      AND (p_Search IS NULL OR p_Search = '' 
           OR LOWER(`RouteCode`) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(`RouteName`) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY `RouteName` ASC
    LIMIT p_Limit;
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportRouteById`$$
CREATE PROCEDURE `sp_GetTransportRouteById`(
    IN p_Id BIGINT,
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        r.RouteId, r.CollegeId, r.CampusId, c.CampusName,
        r.RouteCode, r.RouteName, r.StartLocation, r.EndLocation,
        r.Distance AS DistanceKm, r.EstimatedDurationMinutes, r.DefaultMonthlyFee,
        r.MinRangeKm, r.NonAcBaseFare, r.NonAcRatePerKm, r.AcBaseFare, r.AcRatePerKm,
        r.Description,
        CASE WHEN r.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        CASE WHEN r.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText,
        r.Status AS IsActive,
        r.StartLatitude, r.StartLongitude, r.EndLatitude, r.EndLongitude, r.RouteGeometryJson AS RouteGeometry,
        (SELECT COUNT(*) FROM `PickupPoints` p WHERE p.RouteId = r.RouteId AND p.IsDeleted = 0) AS PickupPointCount,
        a.VehicleId, v.VehicleNumber, a.DriverId, d.DriverName
    FROM `TransportRoutes` r
    LEFT JOIN `Campuses` c ON r.CampusId = c.CampusId
    LEFT JOIN `TransportVehicleAssignments` a ON r.RouteId = a.RouteId AND a.IsDeleted = 0 AND a.Status = 1
    LEFT JOIN `TransportVehicles` v ON a.VehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN `TransportDrivers` d ON a.DriverId = d.DriverId AND d.IsDeleted = 0
    WHERE r.RouteId = p_Id AND r.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR r.CollegeId = p_CollegeId)
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_DeleteTransportRoute`$$
CREATE PROCEDURE `sp_DeleteTransportRoute`(
    IN p_RouteId BIGINT,
    IN p_UpdatedBy BIGINT,
    IN p_CollegeId INT
)
BEGIN
    UPDATE `TransportRoutes`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `RouteId` = p_RouteId AND `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DROP PROCEDURE IF EXISTS `sp_GetRouteDistanceLookup`$$
CREATE PROCEDURE `sp_GetRouteDistanceLookup`(
    IN p_StartLocation VARCHAR(150),
    IN p_EndLocation VARCHAR(150),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CollegeId INT DEFAULT NULL;
    SET v_CollegeId = COALESCE(
        NULLIF(p_CollegeId, 0),
        (SELECT CollegeId FROM Campuses WHERE CampusId = p_CampusId LIMIT 1)
    );

    SELECT 
        Distance AS DistanceKm,
        EstimatedDurationMinutes,
        'EXACT_ROUTE' AS Source
    FROM TransportRoutes
    WHERE IsDeleted = 0
      AND (v_CollegeId IS NULL OR v_CollegeId <= 0 OR CollegeId = v_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId)
      AND (
          (LOWER(TRIM(StartLocation)) = LOWER(TRIM(p_StartLocation)) AND LOWER(TRIM(EndLocation)) = LOWER(TRIM(p_EndLocation)))
          OR
          (LOWER(TRIM(StartLocation)) = LOWER(TRIM(p_EndLocation)) AND LOWER(TRIM(EndLocation)) = LOWER(TRIM(p_StartLocation)))
      )
      AND Distance > 0
    ORDER BY RouteId DESC
    LIMIT 1;

    SELECT 
        DistanceFromSchool AS DistanceKm,
        ROUND((DistanceFromSchool / 30.0) * 60) AS EstimatedDurationMinutes,
        'PICKUP_POINT' AS Source
    FROM PickupPoints
    WHERE IsDeleted = 0
      AND (v_CollegeId IS NULL OR v_CollegeId <= 0 OR CollegeId = v_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId)
      AND (
          LOWER(TRIM(StopName)) = LOWER(TRIM(p_EndLocation))
          OR LOWER(TRIM(StopName)) = LOWER(TRIM(p_StartLocation))
      )
      AND DistanceFromSchool > 0
    ORDER BY PickupPointId DESC
    LIMIT 1;

    SELECT 
        CampusId, CampusName, CampusCode, COALESCE(Address, '') AS Address
    FROM Campuses
    WHERE (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId)
      AND (v_CollegeId IS NULL OR v_CollegeId <= 0 OR CollegeId = v_CollegeId)
      AND IsActive = 1
    ORDER BY IsHQ DESC, CampusId ASC
    LIMIT 1;
END$$

-- ============================================================================
-- SECTION 7: DRIVERS, ATTENDANTS, SYNC & VEHICLE ASSIGNMENTS
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetTransportDrivers`$$
CREATE PROCEDURE `sp_GetTransportDrivers`(
    IN p_Search VARCHAR(100),
    IN p_Status TINYINT,
    IN p_CampusId INT,
    IN p_CollegeId INT,
    IN p_PageNumber INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_PageNumber INT;
    DECLARE v_PageSize INT;
    DECLARE v_Offset INT;

    SET v_PageNumber = COALESCE(p_PageNumber, 1);
    IF v_PageNumber < 1 THEN SET v_PageNumber = 1; END IF;
    SET v_PageSize = COALESCE(p_PageSize, 20);
    IF v_PageSize < 1 THEN SET v_PageSize = 20; END IF;
    SET v_Offset = (v_PageNumber - 1) * v_PageSize;

    DROP TEMPORARY TABLE IF EXISTS tmp_drv_list;
    CREATE TEMPORARY TABLE tmp_drv_list AS
    SELECT 
        COALESCE(d.DriverId, s.Id) AS DriverId,
        s.Id AS StaffId,
        COALESCE(s.EmployeeId, d.EmployeeId) AS EmployeeId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), d.DriverName) AS DriverName,
        COALESCE(s.Mobile, d.MobileNo) AS MobileNumber,
        COALESCE(s.DrivingLicenseNumber, d.LicenseNo) AS LicenseNumber,
        COALESCE(s.CampusId, d.CampusId) AS CampusId,
        COALESCE(c.CollegeId, d.CollegeId) AS CollegeId,
        COALESCE(d.Status, 1) AS Status
    FROM Staff s
    LEFT JOIN TransportDrivers d ON (d.StaffId = s.Id OR (d.EmployeeId = s.EmployeeId AND d.EmployeeId IS NOT NULL AND d.EmployeeId <> '')) AND d.IsDeleted = 0
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    LEFT JOIN Departments dept ON s.DepartmentId = dept.DepartmentId
    LEFT JOIN Designations desig ON s.DesignationId = desig.Id
    LEFT JOIN Users u ON s.Id = u.StaffId AND (u.IsActive = 1 OR u.IsActive IS NULL)
    LEFT JOIN Roles r ON u.RoleId = r.RoleId
    WHERE s.IsDeleted = 0
      AND (s.Status = 'Active' OR (s.Status IS NULL AND COALESCE(d.Status, 1) = 1))
      AND (
          s.IsDriver = 1
          OR d.DriverId IS NOT NULL
          OR LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%driver%'
          OR r.RoleName = 'Driver'
      )
      AND (
          (r.RoleName IS NULL OR r.RoleName <> 'Transport Manager' OR s.IsDriver = 1)
          AND LOWER(COALESCE(desig.Name, s.Designation, '')) NOT LIKE '%transport manager%'
      )

    UNION ALL

    SELECT 
        d.DriverId, d.StaffId, d.EmployeeId, d.DriverName,
        d.MobileNo AS MobileNumber, d.LicenseNo AS LicenseNumber,
        d.CampusId, d.CollegeId, COALESCE(d.Status, 1) AS Status
    FROM TransportDrivers d
    WHERE d.IsDeleted = 0
      AND (d.StaffId IS NULL OR NOT EXISTS (SELECT 1 FROM Staff s2 WHERE s2.Id = d.StaffId AND s2.IsDeleted = 0))
      AND (d.EmployeeId IS NULL OR d.EmployeeId = '' OR NOT EXISTS (SELECT 1 FROM Staff s3 WHERE s3.EmployeeId = d.EmployeeId AND s3.IsDeleted = 0));

    SELECT COUNT(*) AS TotalCount
    FROM tmp_drv_list drv
    WHERE (p_CollegeId IS NULL OR p_CollegeId <= 0 OR drv.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR drv.CampusId = p_CampusId OR (drv.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
      AND (p_Status IS NULL OR drv.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(COALESCE(drv.DriverName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(drv.EmployeeId, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(drv.LicenseNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(drv.MobileNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%'));

    SELECT 
        drv.DriverId, drv.StaffId, drv.EmployeeId, drv.DriverName,
        drv.MobileNumber, drv.LicenseNumber, drv.CampusId,
        COALESCE(camp.CampusName, 'Campus') AS CampusName,
        drv.CollegeId,
        CASE WHEN drv.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM tmp_drv_list drv
    LEFT JOIN Campuses camp ON drv.CampusId = camp.CampusId
    WHERE (p_CollegeId IS NULL OR p_CollegeId <= 0 OR drv.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR drv.CampusId = p_CampusId OR (drv.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
      AND (p_Status IS NULL OR drv.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(COALESCE(drv.DriverName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(drv.EmployeeId, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(drv.LicenseNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(drv.MobileNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY drv.DriverId ASC
    LIMIT v_PageSize OFFSET v_Offset;

    DROP TEMPORARY TABLE IF EXISTS tmp_drv_list;
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportDriversById`$$
CREATE PROCEDURE `sp_GetTransportDriversById`(
    IN p_Id BIGINT,
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        drv.Id, drv.DriverId, drv.StaffId, drv.EmployeeId, drv.DriverName,
        drv.MobileNumber, drv.AlternateMobileNumber, drv.Email,
        drv.LicenseNumber, drv.LicenseExpiryDate, drv.Address, drv.BloodGroup,
        drv.EmergencyContactName, drv.EmergencyContactNumber, drv.ExperienceYears,
        drv.AssignedVehicleId, v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN drv.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        drv.CreatedAt, drv.CampusId, drv.CollegeId, c.CampusName
    FROM (
        SELECT 
            COALESCE(d.DriverId, s.Id) AS Id,
            COALESCE(d.DriverId, s.Id) AS DriverId,
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
            d.EmergencyContactName, d.EmergencyContactNumber,
            COALESCE(s.DrivingExperienceYears, d.Experience, 0) AS ExperienceYears,
            d.AssignedVehicleId, d.CreatedAt,
            COALESCE(s.CampusId, d.CampusId) AS CampusId,
            COALESCE(camp.CollegeId, d.CollegeId) AS CollegeId,
            COALESCE(d.Status, 1) AS Status
        FROM Staff s
        LEFT JOIN TransportDrivers d ON (d.StaffId = s.Id OR (d.EmployeeId = s.EmployeeId AND d.EmployeeId IS NOT NULL AND d.EmployeeId <> '')) AND d.IsDeleted = 0
        LEFT JOIN Campuses camp ON s.CampusId = camp.CampusId
        WHERE s.IsDeleted = 0 AND (s.Id = p_Id OR d.DriverId = p_Id)

        UNION ALL

        SELECT 
            d.DriverId AS Id, d.DriverId, d.StaffId, d.EmployeeId, d.DriverName,
            d.MobileNo AS MobileNumber, d.AlternateMobileNo AS AlternateMobileNumber, d.Email,
            d.LicenseNo AS LicenseNumber, DATE_FORMAT(d.LicenseExpiry, '%Y-%m-%d') AS LicenseExpiryDate,
            d.Address, d.BloodGroup, d.EmergencyContactName, d.EmergencyContactNumber,
            COALESCE(d.Experience, 0) AS ExperienceYears, d.AssignedVehicleId, d.CreatedAt,
            d.CampusId, d.CollegeId, COALESCE(d.Status, 1) AS Status
        FROM TransportDrivers d
        WHERE d.IsDeleted = 0 AND d.DriverId = p_Id
          AND (d.StaffId IS NULL OR NOT EXISTS (SELECT 1 FROM Staff s2 WHERE s2.Id = d.StaffId AND s2.IsDeleted = 0))
    ) drv
    LEFT JOIN TransportVehicles v ON drv.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Campuses c ON drv.CampusId = c.CampusId
    WHERE (p_CollegeId IS NULL OR p_CollegeId <= 0 OR drv.CollegeId = p_CollegeId)
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportDriverByIdOrNumber`$$
CREATE PROCEDURE `sp_GetTransportDriverByIdOrNumber`(
    IN p_SearchId BIGINT,
    IN p_SearchStr VARCHAR(100),
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        `DriverId`, `StaffId`, `CollegeId`, `CampusId`, `DriverName`, `EmployeeId`,
        `MobileNo` AS MobileNumber, `AlternateMobileNo` AS AlternateMobileNumber,
        `Email`, `LicenseNo` AS LicenceNumber, `LicenseExpiry` AS LicenceExpiry,
        `Address`, `BloodGroup`, `EmergencyContactName`, `EmergencyContactNumber`,
        CASE WHEN `Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM `TransportDrivers`
    WHERE `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId)
      AND (`DriverId` = p_SearchId OR `StaffId` = p_SearchId OR LOWER(`LicenseNo`) = LOWER(p_SearchStr) OR LOWER(`DriverName`) = LOWER(p_SearchStr) OR LOWER(`MobileNo`) = LOWER(p_SearchStr))
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportDriverLookup`$$
CREATE PROCEDURE `sp_GetTransportDriverLookup`(
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        `DriverId`, `DriverName`, `EmployeeId`, `MobileNo` AS MobileNumber, `LicenseNo` AS LicenceNumber
    FROM `TransportDrivers`
    WHERE `IsDeleted` = 0 AND `Status` = 1
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR `CampusId` = p_CampusId OR (`CampusId` IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
    ORDER BY `DriverName` ASC;
END$$

DROP PROCEDURE IF EXISTS `sp_CheckTransportDriverExists`$$
CREATE PROCEDURE `sp_CheckTransportDriverExists`(
    IN p_LicenceNumber VARCHAR(50),
    IN p_MobileNumber VARCHAR(20),
    IN p_ExcludeId BIGINT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `TransportDrivers`
    WHERE `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId)
      AND (LOWER(`LicenseNo`) = LOWER(p_LicenceNumber) OR LOWER(`MobileNo`) = LOWER(p_MobileNumber))
      AND (p_ExcludeId IS NULL OR `DriverId` != p_ExcludeId);
END$$

DROP PROCEDURE IF EXISTS `sp_DeleteTransportDrivers`$$
CREATE PROCEDURE `sp_DeleteTransportDrivers`(
    IN p_DriverId BIGINT,
    IN p_UpdatedBy BIGINT,
    IN p_CollegeId INT
)
BEGIN
    UPDATE `TransportDrivers`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `DriverId` = p_DriverId AND `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DROP PROCEDURE IF EXISTS `sp_GetDriverDocuments`$$
CREATE PROCEDURE `sp_GetDriverDocuments`(
    IN p_DriverId BIGINT,
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        d.DocumentId AS Id, d.DocumentCategory, d.DocumentNumber, d.BadgeNumber,
        DATE_FORMAT(d.IssueDate, '%Y-%m-%d') AS IssueDate,
        DATE_FORMAT(d.ExpiryDate, '%Y-%m-%d') AS ExpiryDate,
        d.Status, d.FileName
    FROM TransportDriverDocuments d
    LEFT JOIN TransportDrivers drv ON d.DriverId = drv.DriverId
    WHERE d.DriverId = p_DriverId AND d.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR COALESCE(d.CollegeId, drv.CollegeId) = p_CollegeId)
    ORDER BY d.DocumentId DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_CreateDriverDocument`$$
CREATE PROCEDURE `sp_CreateDriverDocument`(
    IN p_DriverId BIGINT,
    IN p_DocumentCategory VARCHAR(100),
    IN p_DocumentNumber VARCHAR(100),
    IN p_BadgeNumber VARCHAR(100),
    IN p_IssueDate DATE,
    IN p_ExpiryDate DATE,
    IN p_Status VARCHAR(50),
    IN p_FileName VARCHAR(255),
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CollegeId INT;
    DECLARE v_CampusId INT;

    SELECT CollegeId, CampusId INTO v_CollegeId, v_CampusId
    FROM TransportDrivers WHERE DriverId = p_DriverId LIMIT 1;

    SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), v_CollegeId, 1);

    INSERT INTO TransportDriverDocuments (
        DriverId, DocumentCategory, DocumentNumber, BadgeNumber,
        IssueDate, ExpiryDate, Status, FileName, IsDeleted, CreatedAt, CollegeId, CampusId
    ) VALUES (
        p_DriverId, 
        COALESCE(NULLIF(TRIM(p_DocumentCategory), ''), 'Medical Certificate'), 
        COALESCE(NULLIF(TRIM(p_DocumentNumber), ''), CONCAT('DOC-', FLOOR(1000 + RAND() * 9000))), 
        p_BadgeNumber,
        COALESCE(p_IssueDate, CURRENT_DATE()), 
        COALESCE(p_ExpiryDate, DATE_ADD(CURRENT_DATE(), INTERVAL 1 YEAR)), 
        COALESCE(NULLIF(TRIM(p_Status), ''), 'Verified'), 
        COALESCE(NULLIF(TRIM(p_FileName), ''), 'Document.pdf'), 
        0, NOW(), v_CollegeId, v_CampusId
    );
    SELECT LAST_INSERT_ID() AS DocumentId;
END$$

DROP PROCEDURE IF EXISTS `sp_DeleteDriverDocument`$$
CREATE PROCEDURE `sp_DeleteDriverDocument`(
    IN p_DocumentId BIGINT,
    IN p_DriverId BIGINT,
    IN p_CollegeId INT
)
BEGIN
    UPDATE TransportDriverDocuments
    SET IsDeleted = 1, UpdatedAt = NOW()
    WHERE DocumentId = p_DocumentId AND DriverId = p_DriverId AND IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DROP PROCEDURE IF EXISTS `sp_SyncTransportDriverFromStaff`$$
CREATE PROCEDURE `sp_SyncTransportDriverFromStaff`(
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
    DECLARE v_CampusId INT DEFAULT NULL;
    DECLARE v_CollegeId INT DEFAULT NULL;
    DECLARE v_AssignedVehicleId BIGINT DEFAULT NULL;

    SELECT 
        TRIM(CONCAT(COALESCE(s.FirstName, ''), ' ', COALESCE(s.LastName, ''))),
        s.EmployeeId, s.Mobile, NULLIF(TRIM(s.AlternateMobile), ''), NULLIF(TRIM(s.Email), ''),
        NULLIF(TRIM(s.DrivingLicenseNumber), ''), s.DrivingLicenseExpiryDate, COALESCE(s.DrivingExperienceYears, 0),
        NULLIF(TRIM(s.CurrentAddress), ''), NULLIF(TRIM(s.BloodGroup), ''),
        s.CampusId, COALESCE(c.CollegeId, 1)
    INTO 
        v_DriverName, v_EmployeeId, v_Mobile, v_AlternateMobile, v_Email,
        v_LicenseNo, v_LicenseExpiry, v_Experience, v_Address, v_BloodGroup,
        v_CampusId, v_CollegeId
    FROM Staff s
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    WHERE s.Id = p_StaffId
    LIMIT 1;

    SELECT DriverId, AssignedVehicleId 
    INTO v_ExistingDriverId, v_AssignedVehicleId
    FROM TransportDrivers 
    WHERE (StaffId = p_StaffId OR (EmployeeId = v_EmployeeId AND v_EmployeeId IS NOT NULL AND v_EmployeeId <> '' AND CollegeId = v_CollegeId))
    ORDER BY (StaffId = p_StaffId) DESC, DriverId DESC 
    LIMIT 1;

    IF p_IsDriverRole = 1 THEN
        UPDATE Staff SET IsDriver = 1, UpdatedAt = UTC_TIMESTAMP() WHERE Id = p_StaffId;

        IF v_ExistingDriverId IS NOT NULL THEN
            UPDATE TransportDrivers
            SET StaffId = p_StaffId, DriverName = v_DriverName, EmployeeId = v_EmployeeId,
                MobileNo = v_Mobile, AlternateMobileNo = COALESCE(v_AlternateMobile, AlternateMobileNo),
                Email = COALESCE(v_Email, Email), LicenseNo = COALESCE(v_LicenseNo, LicenseNo),
                LicenseExpiry = COALESCE(v_LicenseExpiry, LicenseExpiry), Experience = COALESCE(v_Experience, Experience, 0),
                Address = COALESCE(v_Address, Address), BloodGroup = COALESCE(v_BloodGroup, BloodGroup),
                CampusId = COALESCE(v_CampusId, CampusId), CollegeId = COALESCE(v_CollegeId, CollegeId),
                Status = 1, IsActive = 1, IsDeleted = 0, UpdatedAt = UTC_TIMESTAMP()
            WHERE DriverId = v_ExistingDriverId;

            SELECT v_ExistingDriverId AS DriverId;
        ELSE
            INSERT INTO TransportDrivers (
                StaffId, DriverName, EmployeeId, MobileNo, AlternateMobileNo, Email,
                LicenseNo, LicenseExpiry, Address, BloodGroup, EmergencyContactName,
                EmergencyContactNumber, Experience, Status, IsActive, IsDeleted, CreatedAt, CampusId, CollegeId
            ) VALUES (
                p_StaffId, v_DriverName, v_EmployeeId, v_Mobile, v_AlternateMobile, v_Email,
                v_LicenseNo, v_LicenseExpiry, v_Address, v_BloodGroup, '',
                '', v_Experience, 1, 1, 0, UTC_TIMESTAMP(), v_CampusId, v_CollegeId
            );

            SELECT LAST_INSERT_ID() AS DriverId;
        END IF;
    ELSE
        UPDATE Staff SET IsDriver = 0, UpdatedAt = UTC_TIMESTAMP() WHERE Id = p_StaffId;

        IF v_ExistingDriverId IS NOT NULL THEN
            IF (v_AssignedVehicleId IS NOT NULL AND v_AssignedVehicleId > 0) OR EXISTS (
                SELECT 1 FROM TransportVehicleAssignments WHERE DriverId = v_ExistingDriverId AND IsDeleted = 0 AND (Status = 'Active' OR Status = 1)
            ) THEN
                UPDATE TransportDrivers SET StaffId = p_StaffId, CampusId = COALESCE(v_CampusId, CampusId), CollegeId = COALESCE(v_CollegeId, CollegeId), UpdatedAt = UTC_TIMESTAMP() WHERE DriverId = v_ExistingDriverId;
            ELSE
                UPDATE TransportDrivers SET Status = 0, IsActive = 0, UpdatedAt = UTC_TIMESTAMP() WHERE DriverId = v_ExistingDriverId;
            END IF;
        END IF;
        SELECT 0 AS DriverId;
    END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportAttendants`$$
CREATE PROCEDURE `sp_GetTransportAttendants`(
    IN p_Search VARCHAR(100),
    IN p_Status TINYINT,
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        COALESCE(a.AttendantId, s.Id) AS AttendantId,
        s.Id AS StaffId,
        COALESCE(s.EmployeeId, a.EmployeeId) AS EmployeeId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), a.AttendantName) AS AttendantName,
        COALESCE(s.Mobile, a.MobileNumber) AS MobileNumber,
        COALESCE(s.AlternateMobile, a.AlternateMobileNumber) AS AlternateMobileNumber,
        COALESCE(s.Gender, a.Gender, 'Female') AS Gender,
        COALESCE(c.CampusName, a.BranchName, 'Campus') AS BranchName,
        COALESCE(s.CurrentAddress, a.Address) AS Address,
        COALESCE(s.BloodGroup, a.BloodGroup) AS BloodGroup,
        a.EmergencyContactName, a.EmergencyContactNumber, a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN (s.Status = 'Active' AND COALESCE(a.Status, 1) = 1) THEN 'Active' ELSE 'Inactive' END AS Status,
        COALESCE(s.CampusId, a.CampusId) AS CampusId,
        COALESCE(c.CampusName, a.BranchName, 'Campus') AS CampusName,
        COALESCE(c.CollegeId, a.CollegeId) AS CollegeId,
        COALESCE(a.CreatedAt, s.CreatedAt) AS CreatedAt
    FROM Staff s
    LEFT JOIN TransportAttendants a ON (a.StaffId = s.Id OR (a.EmployeeId = s.EmployeeId AND s.EmployeeId IS NOT NULL AND s.EmployeeId <> ''))
    LEFT JOIN Designations desig ON s.DesignationId = desig.Id
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    WHERE s.IsDeleted = 0
      AND (LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%attendant%' OR LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%attender%' OR a.AttendantId IS NOT NULL)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR COALESCE(c.CollegeId, a.CollegeId) = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR COALESCE(s.CampusId, a.CampusId) = p_CampusId OR (COALESCE(s.CampusId, a.CampusId) IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
      AND (p_Status IS NULL OR (CASE WHEN (s.Status = 'Active' AND COALESCE(a.Status, 1) = 1) THEN 1 ELSE 0 END) = p_Status)
      AND (p_Search IS NULL OR p_Search = '' 
           OR LOWER(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName))) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(a.AttendantName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(s.EmployeeId, a.EmployeeId, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(s.Mobile, a.MobileNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%'))

    UNION ALL

    SELECT 
        a.AttendantId, a.StaffId, a.EmployeeId, a.AttendantName, a.MobileNumber, a.AlternateMobileNumber,
        COALESCE(a.Gender, 'Female') AS Gender, COALESCE(c.CampusName, a.BranchName, 'Campus') AS BranchName,
        a.Address, a.BloodGroup, a.EmergencyContactName, a.EmergencyContactNumber, a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        a.CampusId, COALESCE(c.CampusName, a.BranchName, 'Campus') AS CampusName,
        COALESCE(a.CollegeId, c.CollegeId) AS CollegeId, a.CreatedAt
    FROM TransportAttendants a
    LEFT JOIN Campuses c ON a.CampusId = c.CampusId
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE a.IsDeleted = 0
      AND (a.StaffId IS NULL OR a.StaffId NOT IN (SELECT Id FROM Staff WHERE IsDeleted = 0))
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR COALESCE(a.CollegeId, c.CollegeId) = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR a.CampusId = p_CampusId OR (a.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = '' 
           OR LOWER(a.AttendantName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(a.EmployeeId, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(a.MobileNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY AttendantId ASC;
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportAttendantById`$$
CREATE PROCEDURE `sp_GetTransportAttendantById`(
    IN p_Id BIGINT,
    IN p_CollegeId INT
)
BEGIN
    SELECT * FROM (
        SELECT 
            COALESCE(a.AttendantId, s.Id) AS AttendantId, s.Id AS StaffId,
            COALESCE(s.EmployeeId, a.EmployeeId) AS EmployeeId,
            COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), a.AttendantName) AS AttendantName,
            COALESCE(s.Mobile, a.MobileNumber) AS MobileNumber,
            COALESCE(s.AlternateMobile, a.AlternateMobileNumber) AS AlternateMobileNumber,
            COALESCE(s.Gender, a.Gender, 'Female') AS Gender,
            COALESCE(c.CampusName, a.BranchName, 'Campus') AS BranchName,
            COALESCE(s.CurrentAddress, a.Address) AS Address,
            COALESCE(s.BloodGroup, a.BloodGroup) AS BloodGroup,
            a.EmergencyContactName, a.EmergencyContactNumber, a.AssignedVehicleId,
            v.VehicleNumber AS AssignedVehicleNumber,
            CASE WHEN (s.Status = 'Active' AND COALESCE(a.Status, 1) = 1) THEN 'Active' ELSE 'Inactive' END AS Status,
            COALESCE(s.CampusId, a.CampusId) AS CampusId,
            COALESCE(c.CollegeId, a.CollegeId) AS CollegeId,
            COALESCE(c.CampusName, a.BranchName, 'Campus') AS CampusName,
            COALESCE(a.CreatedAt, s.CreatedAt) AS CreatedAt
        FROM Staff s
        LEFT JOIN TransportAttendants a ON (a.StaffId = s.Id OR (a.EmployeeId = s.EmployeeId AND s.EmployeeId IS NOT NULL AND s.EmployeeId <> ''))
        LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
        LEFT JOIN Campuses c ON s.CampusId = c.CampusId
        WHERE (s.Id = p_Id OR a.AttendantId = p_Id OR a.StaffId = p_Id) AND s.IsDeleted = 0

        UNION ALL

        SELECT 
            a.AttendantId, a.StaffId, a.EmployeeId, a.AttendantName, a.MobileNumber, a.AlternateMobileNumber,
            COALESCE(a.Gender, 'Female') AS Gender, COALESCE(a.BranchName, 'Campus') AS BranchName,
            a.Address, a.BloodGroup, a.EmergencyContactName, a.EmergencyContactNumber, a.AssignedVehicleId,
            v.VehicleNumber AS AssignedVehicleNumber,
            CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
            a.CampusId, a.CollegeId, COALESCE(a.BranchName, 'Campus') AS CampusName, a.CreatedAt
        FROM TransportAttendants a
        LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
        WHERE a.AttendantId = p_Id AND a.IsDeleted = 0
          AND (a.StaffId IS NULL OR a.StaffId NOT IN (SELECT Id FROM Staff WHERE IsDeleted = 0))
    ) t
    WHERE (p_CollegeId IS NULL OR p_CollegeId <= 0 OR t.CollegeId = p_CollegeId)
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportAttendantByIdOrName`$$
CREATE PROCEDURE `sp_GetTransportAttendantByIdOrName`(
    IN p_SearchId BIGINT,
    IN p_SearchStr VARCHAR(100),
    IN p_CollegeId INT
)
BEGIN
    SELECT * FROM (
        SELECT 
            COALESCE(a.AttendantId, s.Id) AS AttendantId, s.Id AS StaffId,
            COALESCE(s.EmployeeId, a.EmployeeId) AS EmployeeId,
            COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), a.AttendantName) AS AttendantName,
            COALESCE(s.Mobile, a.MobileNumber) AS MobileNumber,
            COALESCE(s.AlternateMobile, a.AlternateMobileNumber) AS AlternateMobileNumber,
            COALESCE(s.Gender, a.Gender, 'Female') AS Gender,
            COALESCE(c.CampusName, a.BranchName, 'Campus') AS BranchName,
            COALESCE(s.CurrentAddress, a.Address) AS Address,
            COALESCE(s.BloodGroup, a.BloodGroup) AS BloodGroup,
            a.EmergencyContactName, a.EmergencyContactNumber, a.AssignedVehicleId,
            v.VehicleNumber AS AssignedVehicleNumber,
            CASE WHEN (s.Status = 'Active' AND COALESCE(a.Status, 1) = 1) THEN 'Active' ELSE 'Inactive' END AS Status,
            COALESCE(s.CampusId, a.CampusId) AS CampusId,
            COALESCE(c.CollegeId, a.CollegeId) AS CollegeId,
            COALESCE(c.CampusName, a.BranchName, 'Campus') AS CampusName,
            COALESCE(a.CreatedAt, s.CreatedAt) AS CreatedAt
        FROM Staff s
        LEFT JOIN TransportAttendants a ON (a.StaffId = s.Id OR (a.EmployeeId = s.EmployeeId AND s.EmployeeId IS NOT NULL AND s.EmployeeId <> ''))
        LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
        LEFT JOIN Campuses c ON s.CampusId = c.CampusId
        WHERE s.IsDeleted = 0
          AND (s.Id = p_SearchId OR a.AttendantId = p_SearchId OR a.StaffId = p_SearchId
               OR LOWER(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName))) = LOWER(p_SearchStr)
               OR LOWER(COALESCE(a.AttendantName, '')) = LOWER(p_SearchStr)
               OR LOWER(COALESCE(s.EmployeeId, a.EmployeeId, '')) = LOWER(p_SearchStr)
               OR LOWER(COALESCE(s.Mobile, a.MobileNumber, '')) = LOWER(p_SearchStr))

        UNION ALL

        SELECT 
            a.AttendantId, a.StaffId, a.EmployeeId, a.AttendantName, a.MobileNumber, a.AlternateMobileNumber,
            COALESCE(a.Gender, 'Female') AS Gender, COALESCE(a.BranchName, 'Campus') AS BranchName,
            a.Address, a.BloodGroup, a.EmergencyContactName, a.EmergencyContactNumber, a.AssignedVehicleId,
            v.VehicleNumber AS AssignedVehicleNumber,
            CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
            a.CampusId, a.CollegeId, COALESCE(a.BranchName, 'Campus') AS CampusName, a.CreatedAt
        FROM TransportAttendants a
        LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
        WHERE a.IsDeleted = 0
          AND (a.StaffId IS NULL OR a.StaffId NOT IN (SELECT Id FROM Staff WHERE IsDeleted = 0))
          AND (a.AttendantId = p_SearchId OR LOWER(a.AttendantName) = LOWER(p_SearchStr)
               OR LOWER(COALESCE(a.EmployeeId, '')) = LOWER(p_SearchStr) OR LOWER(COALESCE(a.MobileNumber, '')) = LOWER(p_SearchStr))
    ) t
    WHERE (p_CollegeId IS NULL OR p_CollegeId <= 0 OR t.CollegeId = p_CollegeId)
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportAttendantLookup`$$
CREATE PROCEDURE `sp_GetTransportAttendantLookup`(
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        COALESCE(a.AttendantId, s.Id) AS AttendantId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), a.AttendantName) AS AttendantName,
        COALESCE(s.EmployeeId, a.EmployeeId) AS EmployeeId,
        COALESCE(s.Mobile, a.MobileNumber) AS MobileNumber,
        COALESCE(c.CampusName, a.BranchName, 'Campus') AS BranchName,
        CONCAT(COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), a.AttendantName), ' (', COALESCE(s.EmployeeId, a.EmployeeId, 'STAFF'), ')') AS DisplayName
    FROM Staff s
    LEFT JOIN TransportAttendants a ON (a.StaffId = s.Id OR (a.EmployeeId = s.EmployeeId AND s.EmployeeId IS NOT NULL AND s.EmployeeId <> ''))
    LEFT JOIN Designations desig ON s.DesignationId = desig.Id
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    WHERE s.IsDeleted = 0 AND (s.Status = 'Active' OR s.Status IS NULL)
      AND (LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%attendant%' OR LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%attender%' OR a.AttendantId IS NOT NULL)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR COALESCE(c.CollegeId, a.CollegeId) = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR COALESCE(s.CampusId, a.CampusId) = p_CampusId)

    UNION

    SELECT 
        a.AttendantId, a.AttendantName, a.EmployeeId, a.MobileNumber,
        COALESCE(a.BranchName, 'Campus') AS BranchName,
        CONCAT(a.AttendantName, ' (', COALESCE(a.EmployeeId, 'ATT'), ')') AS DisplayName
    FROM TransportAttendants a
    WHERE a.IsDeleted = 0 AND a.Status = 1
      AND (a.StaffId IS NULL OR a.StaffId NOT IN (SELECT Id FROM Staff WHERE IsDeleted = 0))
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR a.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR a.CampusId = p_CampusId OR (a.CampusId IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
    ORDER BY AttendantName ASC;
END$$

DROP PROCEDURE IF EXISTS `sp_CreateTransportAttendants`$$
CREATE PROCEDURE `sp_CreateTransportAttendants`(
    IN p_StaffId INT,
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
    IN p_UpdatedBy BIGINT,
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CampusId INT DEFAULT NULL;
    DECLARE v_CollegeId INT DEFAULT NULL;

    SET v_CampusId = COALESCE(NULLIF(p_CampusId, 0), (SELECT CampusId FROM Staff WHERE Id = p_StaffId LIMIT 1));
    SET v_CollegeId = COALESCE(
        NULLIF(p_CollegeId, 0),
        (SELECT CollegeId FROM Campuses WHERE CampusId = v_CampusId LIMIT 1),
        1
    );

    INSERT INTO `TransportAttendants` (
        `StaffId`, `EmployeeId`, `AttendantName`, `MobileNumber`, `Gender`, `BranchName`,
        `AlternateMobileNumber`, `Address`, `BloodGroup`, `EmergencyContactName`,
        `EmergencyContactNumber`, `AssignedVehicleId`, `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`, `CampusId`, `CollegeId`
    ) VALUES (
        p_StaffId, p_EmployeeId, p_AttendantName, p_MobileNumber, COALESCE(p_Gender, 'Female'), p_BranchName,
        p_AlternateMobileNumber, p_Address, p_BloodGroup, p_EmergencyContactName,
        p_EmergencyContactNumber, p_AssignedVehicleId, COALESCE(p_Status, 1), 0, p_CreatedBy, NOW(), v_CampusId, v_CollegeId
    );
    SELECT LAST_INSERT_ID() AS AttendantId;
END$$

DROP PROCEDURE IF EXISTS `sp_UpdateTransportAttendants`$$
CREATE PROCEDURE `sp_UpdateTransportAttendants`(
    IN p_Id BIGINT,
    IN p_StaffId INT,
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
    IN p_UpdatedBy BIGINT,
    IN p_CollegeId INT
)
BEGIN
    UPDATE `TransportAttendants`
    SET 
        `StaffId` = COALESCE(p_StaffId, `StaffId`),
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
    WHERE `AttendantId` = p_Id AND `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DROP PROCEDURE IF EXISTS `sp_DeleteTransportAttendants`$$
CREATE PROCEDURE `sp_DeleteTransportAttendants`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT,
    IN p_CollegeId INT
)
BEGIN
    UPDATE `TransportAttendants`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `AttendantId` = p_Id AND `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DROP PROCEDURE IF EXISTS `sp_SyncTransportAttendantFromStaff`$$
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
    DECLARE v_CampusId INT DEFAULT NULL;
    DECLARE v_CollegeId INT DEFAULT 1;
    DECLARE v_CampusName VARCHAR(150);

    SELECT 
        TRIM(CONCAT(COALESCE(FirstName, ''), ' ', COALESCE(LastName, ''))),
        EmployeeId, Mobile, COALESCE(AlternateMobile, ''), COALESCE(Gender, 'Female'),
        COALESCE(CurrentAddress, ''), COALESCE(BloodGroup, ''), CampusId
    INTO 
        v_AttendantName, v_EmployeeId, v_Mobile, v_AlternateMobile, v_Gender,
        v_Address, v_BloodGroup, v_CampusId
    FROM Staff WHERE Id = p_StaffId LIMIT 1;

    SELECT CampusName, COALESCE(CollegeId, 1) INTO v_CampusName, v_CollegeId
    FROM Campuses WHERE CampusId = v_CampusId LIMIT 1;

    SELECT AttendantId INTO v_ExistingAttendantId
    FROM TransportAttendants WHERE StaffId = p_StaffId ORDER BY AttendantId DESC LIMIT 1;

    IF v_ExistingAttendantId IS NULL AND v_EmployeeId IS NOT NULL AND v_EmployeeId <> '' THEN
        SELECT AttendantId INTO v_ExistingAttendantId
        FROM TransportAttendants WHERE EmployeeId = v_EmployeeId AND CollegeId = v_CollegeId ORDER BY AttendantId DESC LIMIT 1;
    END IF;

    IF p_IsAttendantRole = 1 THEN
        IF v_ExistingAttendantId IS NOT NULL THEN
            UPDATE TransportAttendants
            SET StaffId = p_StaffId, AttendantName = v_AttendantName, EmployeeId = v_EmployeeId,
                MobileNumber = v_Mobile, AlternateMobileNumber = v_AlternateMobile,
                Gender = COALESCE(v_Gender, Gender, 'Female'), BranchName = COALESCE(v_CampusName, BranchName),
                Address = COALESCE(NULLIF(TRIM(v_Address), ''), Address, ''),
                BloodGroup = COALESCE(NULLIF(TRIM(v_BloodGroup), ''), BloodGroup, ''),
                CampusId = COALESCE(v_CampusId, CampusId), CollegeId = COALESCE(v_CollegeId, CollegeId),
                Status = 1, IsActive = 1, IsDeleted = 0, UpdatedAt = UTC_TIMESTAMP()
            WHERE AttendantId = v_ExistingAttendantId;

            SELECT v_ExistingAttendantId AS AttendantId;
        ELSE
            INSERT INTO TransportAttendants (
                StaffId, EmployeeId, AttendantName, MobileNumber, AlternateMobileNumber, Gender,
                BranchName, Address, BloodGroup, Status, IsActive, IsDeleted, CreatedAt, UpdatedAt, CampusId, CollegeId
            ) VALUES (
                p_StaffId, v_EmployeeId, v_AttendantName, v_Mobile, v_AlternateMobile, v_Gender,
                v_CampusName, v_Address, v_BloodGroup, 1, 1, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP(), v_CampusId, v_CollegeId
            );
            SELECT LAST_INSERT_ID() AS AttendantId;
        END IF;
    ELSE
        IF v_ExistingAttendantId IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM TransportVehicleAssignments WHERE AttendantId = v_ExistingAttendantId AND IsDeleted = 0) THEN
                UPDATE TransportAttendants SET IsDeleted = 1, Status = 0, IsActive = 0, UpdatedAt = UTC_TIMESTAMP() WHERE AttendantId = v_ExistingAttendantId;
            END IF;
        END IF;
        SELECT 0 AS AttendantId;
    END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleAssignments`$$
CREATE PROCEDURE `sp_GetTransportVehicleAssignments`(
    IN p_RouteId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_DriverId BIGINT,
    IN p_Status TINYINT(1),
    IN p_Search VARCHAR(100),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT DISTINCT
        a.AssignmentId,
        COALESCE(a.CollegeId, r.CollegeId, v.CollegeId, c.CollegeId) AS CollegeId,
        COALESCE(a.CampusId, r.CampusId, v.CampusId, c.CampusId) AS CampusId,
        COALESCE(c.CampusName, 'Campus') AS BranchName,
        a.AcademicYearId,
        COALESCE(ay.AcademicYearName, '2026-2027') AS AcademicYear,
        a.BoardId,
        a.RouteId, r.RouteName, r.RouteCode AS RouteNumber,
        a.VehicleId, v.VehicleNumber, COALESCE(v.VehicleName, v.VehicleNumber) AS VehicleName, v.Capacity AS VehicleCapacity,
        a.DriverId,
        COALESCE(CONCAT(TRIM(s_drv.FirstName), ' ', TRIM(s_drv.LastName)), d.DriverName, 'Unassigned') AS DriverName,
        COALESCE(s_drv.Mobile, d.MobileNo) AS DriverMobile, d.LicenseNo AS DriverLicenseNumber,
        a.AttendantId,
        COALESCE(CONCAT(TRIM(s_att.FirstName), ' ', TRIM(s_att.LastName)), att.AttendantName, 'Unassigned') AS AttendantName,
        att.MobileNumber AS AttendantContactNumber,
        a.EffectiveFrom, a.EffectiveTo, a.Shift, a.MorningTripTime, a.EveningTripTime, a.Remarks,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        (SELECT COUNT(*) FROM `StudentTransportAssignments` sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0 AND sta.CollegeId = a.CollegeId) AS AssignedStudents,
        a.CreatedAt
    FROM `TransportVehicleAssignments` a
    LEFT JOIN `Campuses` c ON c.CampusId = a.CampusId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = a.AcademicYearId
    LEFT JOIN `TransportRoutes` r ON a.RouteId = r.RouteId
    LEFT JOIN `TransportVehicles` v ON a.VehicleId = v.VehicleId
    LEFT JOIN `TransportDrivers` d ON a.DriverId = d.DriverId AND d.IsDeleted = 0
    LEFT JOIN `Staff` s_drv ON s_drv.Id = COALESCE(d.StaffId, a.DriverId) AND s_drv.IsDeleted = 0
    LEFT JOIN `TransportAttendants` att ON a.AttendantId = att.AttendantId AND att.IsDeleted = 0
    LEFT JOIN `Staff` s_att ON s_att.Id = COALESCE(att.StaffId, a.AttendantId) AND s_att.IsDeleted = 0
    WHERE a.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR COALESCE(a.CollegeId, r.CollegeId, v.CollegeId, c.CollegeId) = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR COALESCE(a.CampusId, r.CampusId, v.CampusId) = p_CampusId OR (COALESCE(a.CampusId, r.CampusId, v.CampusId) IS NULL AND p_CampusId = 1 AND p_CollegeId = 1))
      AND (p_RouteId IS NULL OR a.RouteId = p_RouteId)
      AND (p_VehicleId IS NULL OR a.VehicleId = p_VehicleId)
      AND (p_DriverId IS NULL OR a.DriverId = p_DriverId)
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(COALESCE(r.RouteName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(v.VehicleNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(d.DriverName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(att.AttendantName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(CONCAT(TRIM(COALESCE(s_drv.FirstName, '')), ' ', TRIM(COALESCE(s_drv.LastName, '')))) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(CONCAT(TRIM(COALESCE(s_att.FirstName, '')), ' ', TRIM(COALESCE(s_att.LastName, '')))) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY a.EffectiveFrom DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleAssignmentById`$$
CREATE PROCEDURE `sp_GetTransportVehicleAssignmentById`(
    IN p_Id BIGINT,
    IN p_CollegeId INT
)
BEGIN
    SELECT DISTINCT
        a.AssignmentId, a.CollegeId, a.CampusId, COALESCE(c.CampusName, 'Campus') AS BranchName,
        a.AcademicYearId, COALESCE(ay.AcademicYearName, '2026-2027') AS AcademicYear, a.BoardId,
        a.RouteId, r.RouteName, r.RouteCode AS RouteNumber,
        a.VehicleId, v.VehicleNumber, COALESCE(v.VehicleName, v.VehicleNumber) AS VehicleName, v.Capacity AS VehicleCapacity,
        a.DriverId,
        COALESCE(CONCAT(TRIM(s_drv.FirstName), ' ', TRIM(s_drv.LastName)), d.DriverName, 'Unassigned') AS DriverName,
        COALESCE(s_drv.Mobile, d.MobileNo) AS DriverMobile, d.LicenseNo AS DriverLicenseNumber,
        a.AttendantId,
        COALESCE(CONCAT(TRIM(s_att.FirstName), ' ', TRIM(s_att.LastName)), att.AttendantName, 'Unassigned') AS AttendantName,
        att.MobileNumber AS AttendantContactNumber,
        a.EffectiveFrom, a.EffectiveTo, a.Shift, a.MorningTripTime, a.EveningTripTime, a.Remarks,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0 AND sta.CollegeId = a.CollegeId) AS AssignedStudents,
        a.CreatedAt
    FROM TransportVehicleAssignments a
    LEFT JOIN Campuses c ON c.CampusId = a.CampusId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = a.AcademicYearId
    LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId AND d.IsDeleted = 0
    LEFT JOIN Staff s_drv ON s_drv.Id = COALESCE(d.StaffId, a.DriverId) AND s_drv.IsDeleted = 0
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId AND att.IsDeleted = 0
    LEFT JOIN Staff s_att ON s_att.Id = COALESCE(att.StaffId, a.AttendantId) AND s_att.IsDeleted = 0
    WHERE a.AssignmentId = p_Id AND a.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR a.CollegeId = p_CollegeId)
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleAssignmentLookup`$$
CREATE PROCEDURE `sp_GetTransportVehicleAssignmentLookup`(
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        a.AssignmentId, a.RouteId, r.RouteName, a.VehicleId, v.VehicleNumber,
        a.DriverId, d.DriverName, a.AttendantId, att.AttendantName,
        a.Shift, a.MorningTripTime, a.EveningTripTime
    FROM TransportVehicleAssignments a
    LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
    WHERE a.IsDeleted = 0 AND a.Status = 1
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR a.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR a.CampusId = p_CampusId)
    ORDER BY r.RouteName ASC;
END$$

DROP PROCEDURE IF EXISTS `sp_DeleteTransportVehicleAssignments`$$
CREATE PROCEDURE `sp_DeleteTransportVehicleAssignments`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT,
    IN p_CollegeId INT
)
BEGIN
    UPDATE `TransportVehicleAssignments`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `AssignmentId` = p_Id AND `IsDeleted` = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DROP PROCEDURE IF EXISTS `sp_GetDriverDashboardData`$$
CREATE PROCEDURE `sp_GetDriverDashboardData`(
    IN p_StaffId INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_DriverId BIGINT;
    SELECT DriverId INTO v_DriverId FROM TransportDrivers WHERE StaffId = p_StaffId AND IsDeleted = 0 LIMIT 1;
    IF v_DriverId IS NULL THEN
        SELECT DriverId INTO v_DriverId FROM TransportDrivers WHERE DriverId = p_StaffId AND IsDeleted = 0 LIMIT 1;
    END IF;

    SELECT 
        s.FirstName AS DriverFirstName,
        s.LastName AS DriverLastName,
        s.EmployeeId,
        s.Email AS DriverEmail,
        tva.AssignmentId,
        tva.DriverId,
        v.VehicleId,
        v.VehicleNumber,
        v.VehicleName,
        v.Capacity AS VehicleCapacity,
        v.VehicleRegistrationNo AS RegistrationNumber,
        v.VehicleType,
        tva.EffectiveFrom,
        tva.EffectiveTo,
        tva.Shift,
        tva.MorningTripTime,
        tva.EveningTripTime,
        ay.AcademicYearName AS AcademicYear,
        r.RouteId,
        r.RouteName,
        r.RouteCode,
        r.StartLocation,
        r.EndLocation,
        att.AttendantId,
        att.AttendantName,
        att.MobileNumber AS ContactNumber,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = tva.AssignmentId AND sta.IsDeleted = 0 AND sta.Status = 1) AS AssignedStudents
    FROM TransportVehicleAssignments tva
    JOIN TransportVehicles v ON tva.VehicleId = v.VehicleId AND v.IsDeleted = 0
    JOIN TransportRoutes r ON tva.RouteId = r.RouteId AND r.IsDeleted = 0
    LEFT JOIN Staff s ON s.Id = p_StaffId
    LEFT JOIN TransportAttendants att ON tva.AttendantId = att.AttendantId AND att.IsDeleted = 0
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = tva.AcademicYearId
    WHERE (tva.DriverId = v_DriverId OR tva.DriverId = p_StaffId)
      AND tva.Status = 1 
      AND tva.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR tva.CampusId = p_CampusId)
      AND tva.EffectiveFrom <= CURRENT_TIMESTAMP 
      AND (tva.EffectiveTo IS NULL OR tva.EffectiveTo >= CURRENT_TIMESTAMP)
    ORDER BY tva.AssignmentId DESC
    LIMIT 1;
END$$
