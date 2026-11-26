-- =============================================================================
-- Migration: 32_Fix_Transport_Vehicle_Assignment_SPs.sql
-- Description: Standardizes sp_GetTransportVehicleAssignments and
--              sp_GetTransportVehicleAssignmentById to return clean status,
--              staff-based drivers & attendants, and multi-tenancy fields.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PROCEDURE: sp_GetTransportVehicleAssignments
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
        a.CollegeId,
        a.CampusId,
        COALESCE(c.CampusName, 'Main Campus') AS BranchName,
        a.AcademicYearId,
        COALESCE(ay.AcademicYearName, '2026-2027') AS AcademicYear,
        a.BoardId,
        a.RouteId,
        r.RouteName,
        r.RouteCode AS RouteNumber,
        a.VehicleId,
        v.VehicleNumber,
        COALESCE(v.VehicleName, v.VehicleNumber) AS VehicleName,
        v.Capacity AS VehicleCapacity,
        a.DriverId,
        COALESCE(CONCAT(TRIM(s_drv.FirstName), ' ', TRIM(s_drv.LastName)), d.DriverName, 'Unassigned') AS DriverName,
        COALESCE(s_drv.Mobile, d.MobileNo) AS DriverMobile,
        d.LicenseNo AS DriverLicenseNumber,
        a.AttendantId,
        COALESCE(CONCAT(TRIM(s_att.FirstName), ' ', TRIM(s_att.LastName)), att.AttendantName, 'Unassigned') AS AttendantName,
        att.MobileNumber AS AttendantContactNumber,
        a.EffectiveFrom,
        a.EffectiveTo,
        a.Shift,
        a.MorningTripTime,
        a.EveningTripTime,
        a.Remarks,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudents,
        a.CreatedAt
    FROM TransportVehicleAssignments a
    LEFT JOIN Campuses c ON c.CampusId = a.CampusId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = a.AcademicYearId
    LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
    LEFT JOIN Staff s_drv ON (d.StaffId = s_drv.Id OR a.DriverId = s_drv.Id) AND s_drv.IsDeleted = 0
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
    LEFT JOIN Staff s_att ON (att.StaffId = s_att.Id OR a.AttendantId = s_att.Id) AND s_att.IsDeleted = 0
    WHERE a.IsDeleted = 0
      AND (p_RouteId IS NULL OR a.RouteId = p_RouteId)
      AND (p_VehicleId IS NULL OR a.VehicleId = p_VehicleId)
      AND (p_DriverId IS NULL OR a.DriverId = p_DriverId)
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(r.RouteName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(v.VehicleNumber) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(d.DriverName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(att.AttendantName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(CONCAT(TRIM(s_drv.FirstName), ' ', TRIM(s_drv.LastName))) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(CONCAT(TRIM(s_att.FirstName), ' ', TRIM(s_att.LastName))) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY a.EffectiveFrom DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 2. PROCEDURE: sp_GetTransportVehicleAssignmentById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleAssignmentById`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehicleAssignmentById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        a.AssignmentId,
        a.CollegeId,
        a.CampusId,
        COALESCE(c.CampusName, 'Main Campus') AS BranchName,
        a.AcademicYearId,
        COALESCE(ay.AcademicYearName, '2026-2027') AS AcademicYear,
        a.BoardId,
        a.RouteId,
        r.RouteName,
        r.RouteCode AS RouteNumber,
        a.VehicleId,
        v.VehicleNumber,
        COALESCE(v.VehicleName, v.VehicleNumber) AS VehicleName,
        v.Capacity AS VehicleCapacity,
        a.DriverId,
        COALESCE(CONCAT(TRIM(s_drv.FirstName), ' ', TRIM(s_drv.LastName)), d.DriverName, 'Unassigned') AS DriverName,
        COALESCE(s_drv.Mobile, d.MobileNo) AS DriverMobile,
        d.LicenseNo AS DriverLicenseNumber,
        a.AttendantId,
        COALESCE(CONCAT(TRIM(s_att.FirstName), ' ', TRIM(s_att.LastName)), att.AttendantName, 'Unassigned') AS AttendantName,
        att.MobileNumber AS AttendantContactNumber,
        a.EffectiveFrom,
        a.EffectiveTo,
        a.Shift,
        a.MorningTripTime,
        a.EveningTripTime,
        a.Remarks,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudents,
        a.CreatedAt
    FROM TransportVehicleAssignments a
    LEFT JOIN Campuses c ON c.CampusId = a.CampusId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = a.AcademicYearId
    LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
    LEFT JOIN Staff s_drv ON (d.StaffId = s_drv.Id OR a.DriverId = s_drv.Id) AND s_drv.IsDeleted = 0
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
    LEFT JOIN Staff s_att ON (att.StaffId = s_att.Id OR a.AttendantId = s_att.Id) AND s_att.IsDeleted = 0
    WHERE a.AssignmentId = p_Id AND a.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;
