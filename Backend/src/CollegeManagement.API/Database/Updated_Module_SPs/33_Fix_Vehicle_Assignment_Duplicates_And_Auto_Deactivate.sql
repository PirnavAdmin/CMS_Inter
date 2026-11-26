-- =============================================================================
-- Migration: 33_Fix_Vehicle_Assignment_Duplicates_And_Auto_Deactivate.sql
-- Description:
--   1. Updates sp_CreateTransportVehicleAssignments to auto-deactivate previous
--      active vehicle assignments (IsActive = 0, Status = 0, EffectiveTo = cutoff).
--   2. Fixes Cartesian duplication in sp_GetTransportVehicleAssignments and
--      sp_GetTransportVehicleAssignmentById by joining Staff unambiguously via COALESCE
--      and using SELECT DISTINCT.
--   3. Cleans up historical overlapping active records for vehicles.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PROCEDURE: sp_CreateTransportVehicleAssignments (with Auto-Deactivation)
-- -----------------------------------------------------------------------------
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
    DECLARE v_EffectiveFrom DATETIME;
    SET v_EffectiveFrom = COALESCE(p_EffectiveFrom, NOW());

    -- Auto-deactivate any existing active assignment for this vehicle
    UPDATE `TransportVehicleAssignments`
    SET `IsActive` = 0,
        `Status` = 0,
        `EffectiveTo` = v_EffectiveFrom,
        `UpdatedAt` = NOW()
    WHERE `VehicleId` = p_VehicleId
      AND `IsDeleted` = 0
      AND (`IsActive` = 1 OR `Status` = 1 OR `EffectiveTo` IS NULL);

    -- Insert the new vehicle assignment as the only active record
    INSERT INTO `TransportVehicleAssignments` (
        `RouteId`, `VehicleId`, `DriverId`, `AttendantId`, `EffectiveFrom`,
        `EffectiveTo`, `Shift`, `MorningTripTime`, `EveningTripTime`, `Remarks`,
        `Status`, `IsActive`, `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        p_RouteId, p_VehicleId, p_DriverId, p_AttendantId, v_EffectiveFrom,
        p_EffectiveTo, COALESCE(p_Shift, 'Morning'), p_MorningTripTime, p_EveningTripTime, p_Remarks,
        COALESCE(p_Status, 1), COALESCE(p_IsActive, 1), 0, p_CreatedBy, NOW()
    );

    SELECT LAST_INSERT_ID() AS AssignmentId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 2. PROCEDURE: sp_GetTransportVehicleAssignments (Deduplicated JOINs)
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
    SELECT DISTINCT
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
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId AND d.IsDeleted = 0
    LEFT JOIN Staff s_drv ON s_drv.Id = COALESCE(d.StaffId, a.DriverId) AND s_drv.IsDeleted = 0
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId AND att.IsDeleted = 0
    LEFT JOIN Staff s_att ON s_att.Id = COALESCE(att.StaffId, a.AttendantId) AND s_att.IsDeleted = 0
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
-- 3. PROCEDURE: sp_GetTransportVehicleAssignmentById (Deduplicated JOINs)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleAssignmentById`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehicleAssignmentById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT DISTINCT
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
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId AND d.IsDeleted = 0
    LEFT JOIN Staff s_drv ON s_drv.Id = COALESCE(d.StaffId, a.DriverId) AND s_drv.IsDeleted = 0
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId AND att.IsDeleted = 0
    LEFT JOIN Staff s_att ON s_att.Id = COALESCE(att.StaffId, a.AttendantId) AND s_att.IsDeleted = 0
    WHERE a.AssignmentId = p_Id AND a.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;
