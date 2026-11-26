-- =============================================================================
-- MIGRATION: 34_Transport_College_And_Campus_MultiTenancy_Isolation.sql
-- PURPOSE:
--   1. Synchronize CollegeId & CampusId across Transport tables based on Campus ownership.
--   2. Update Transport Stored Procedures to strictly enforce CollegeId & CampusId isolation:
--      - sp_GetTransportRoutes
--      - sp_GetTransportVehicles
--      - sp_GetTransportDrivers
--      - sp_GetTransportAttendants
--      - sp_GetTransportVehicleAssignments
--      - sp_CreateTransportVehicleAssignments
--      - sp_CreateTransportRoute
-- =============================================================================

USE `CollegeManagement`;

-- -----------------------------------------------------------------------------
-- 1. DATA SYNCHRONIZATION: Fix any cross-college mismatches
-- -----------------------------------------------------------------------------

-- 1.1 Correct Routes where Campus belongs to another college (e.g. Pragathi CampusId 21 -> CollegeId 8)
UPDATE `TransportRoutes` tr
JOIN `Campuses` c ON tr.CampusId = c.CampusId
SET tr.CollegeId = c.CollegeId
WHERE tr.CampusId IS NOT NULL AND tr.CollegeId != c.CollegeId;

-- 1.2 Correct Vehicles CollegeId based on their CampusId
UPDATE `TransportVehicles` tv
JOIN `Campuses` c ON tv.CampusId = c.CampusId
SET tv.CollegeId = c.CollegeId
WHERE tv.CampusId IS NOT NULL AND (tv.CollegeId IS NULL OR tv.CollegeId != c.CollegeId);

-- 1.3 Backfill Drivers CampusId and CollegeId from linked Staff
UPDATE `TransportDrivers` d
JOIN `Staffs` s ON d.StaffId = s.Id
JOIN `Campuses` c ON s.CampusId = c.CampusId
SET d.CampusId = COALESCE(d.CampusId, s.CampusId),
    d.CollegeId = COALESCE(c.CollegeId, d.CollegeId)
WHERE d.StaffId IS NOT NULL;

-- 1.4 Backfill Attendants CampusId and CollegeId from linked Staff
UPDATE `TransportAttendants` a
JOIN `Staffs` s ON a.StaffId = s.Id
JOIN `Campuses` c ON s.CampusId = c.CampusId
SET a.CampusId = COALESCE(a.CampusId, s.CampusId),
    a.CollegeId = COALESCE(c.CollegeId, a.CollegeId)
WHERE a.StaffId IS NOT NULL;

-- 1.5 Backfill VehicleAssignments CampusId and CollegeId from linked Route and Vehicle
UPDATE `TransportVehicleAssignments` a
JOIN `TransportRoutes` r ON a.RouteId = r.RouteId
SET a.CampusId = COALESCE(a.CampusId, r.CampusId),
    a.CollegeId = COALESCE(r.CollegeId, a.CollegeId, 1);

UPDATE `TransportVehicleAssignments` a
JOIN `TransportVehicles` v ON a.VehicleId = v.VehicleId
SET a.CampusId = COALESCE(a.CampusId, v.CampusId),
    a.CollegeId = COALESCE(a.CollegeId, v.CollegeId, 1);


-- -----------------------------------------------------------------------------
-- 2. STORED PROCEDURE: sp_GetTransportRoutes (Multi-Tenant College & Campus Scoped)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportRoutes`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportRoutes`(
    IN p_Search VARCHAR(100),
    IN p_Status TINYINT(1),
    IN p_BusType VARCHAR(20),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        r.RouteId,
        r.CollegeId,
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
        r.StartLatitude,
        r.StartLongitude,
        r.EndLatitude,
        r.EndLongitude,
        r.RouteGeometryJson AS RouteGeometry,
        (SELECT COUNT(*) FROM `PickupPoints` p WHERE p.RouteId = r.RouteId AND p.IsDeleted = 0) AS PickupPointCount,
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
    FROM `TransportRoutes` r
    LEFT JOIN `Campuses` c ON r.CampusId = c.CampusId
    LEFT JOIN `TransportVehicleAssignments` a ON r.RouteId = a.RouteId AND a.IsDeleted = 0 AND a.Status = 1
    LEFT JOIN `TransportVehicles` v ON a.VehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN `TransportDrivers` d ON a.DriverId = d.DriverId AND d.IsDeleted = 0
    WHERE r.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR r.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR r.CampusId = p_CampusId)
      AND (p_Status IS NULL OR r.Status = p_Status)
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


-- -----------------------------------------------------------------------------
-- 3. STORED PROCEDURE: sp_GetTransportVehicles (Multi-Tenant College & Campus Scoped)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportVehicles`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehicles`(
    IN p_Search VARCHAR(100),
    IN p_VehicleType VARCHAR(50),
    IN p_Status TINYINT(1),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        v.VehicleId,
        v.CollegeId,
        v.VehicleNumber,
        COALESCE(v.VehicleRegistrationNo, v.VehicleNumber) AS RegistrationNumber,
        COALESCE(v.VehicleName, v.VehicleNumber) AS VehicleName,
        v.VehicleType,
        v.Make AS Manufacturer,
        v.Model,
        v.ChassisNumber,
        v.EngineNumber,
        v.GpsDeviceId,
        v.InsuranceNumber,
        v.InsuranceExpiry,
        v.PollutionExpiry,
        v.FitnessExpiry,
        v.Capacity,
        v.IsAC,
        CASE WHEN v.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        v.CreatedAt,
        v.CampusId,
        c.CampusName
    FROM `TransportVehicles` v
    LEFT JOIN `Campuses` c ON v.CampusId = c.CampusId
    WHERE v.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR v.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR v.CampusId = p_CampusId)
      AND (
          p_Status IS NULL 
          OR (p_Status = 1 AND v.Status = 1)
          OR (p_Status = 0 AND v.Status = 0)
      )
      AND (
          p_VehicleType IS NULL OR p_VehicleType = '' 
          OR LOWER(v.VehicleType) = LOWER(p_VehicleType)
      )
      AND (
          p_Search IS NULL OR p_Search = ''
          OR LOWER(v.VehicleNumber) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(v.VehicleRegistrationNo, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(v.VehicleName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(v.VehicleType, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(v.GpsDeviceId, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
      )
    ORDER BY v.VehicleNumber ASC;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 4. STORED PROCEDURE: sp_GetTransportDrivers (Multi-Tenant College & Campus Scoped)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportDrivers`;
DELIMITER //
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

    -- Result Set 1: TotalCount
    SELECT COUNT(*) AS TotalCount
    FROM (
        SELECT 
            COALESCE(d.DriverId, s.Id) AS DriverId,
            s.Id AS StaffId,
            COALESCE(s.EmployeeId, d.EmployeeId) AS EmployeeId,
            COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), d.DriverName) AS DriverName,
            COALESCE(s.Mobile, d.MobileNo) AS MobileNumber,
            COALESCE(s.DrivingLicenseNumber, d.LicenseNo) AS LicenseNumber,
            COALESCE(s.CampusId, d.CampusId, 1) AS CampusId,
            COALESCE(c.CollegeId, d.CollegeId, 1) AS CollegeId,
            COALESCE(d.Status, 1) AS Status
        FROM `Staffs` s
        LEFT JOIN `TransportDrivers` d ON (d.StaffId = s.Id OR (d.EmployeeId = s.EmployeeId AND d.EmployeeId IS NOT NULL AND d.EmployeeId <> '')) AND d.IsDeleted = 0
        LEFT JOIN `Campuses` c ON s.CampusId = c.CampusId
        LEFT JOIN `Departments` dept ON s.DepartmentId = dept.DepartmentId
        LEFT JOIN `Designations` desig ON s.DesignationId = desig.Id
        LEFT JOIN `Users` u ON s.Id = u.StaffId AND (u.IsActive = 1 OR u.IsActive IS NULL)
        LEFT JOIN `Roles` r ON u.RoleId = r.RoleId
        WHERE s.IsDeleted = 0
          AND (s.Status = 'Active' OR (s.Status IS NULL AND COALESCE(d.Status, 1) = 1))
          AND (
              s.IsDriver = 1
              OR d.DriverId IS NOT NULL
              OR LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%driver%'
              OR (LOWER(COALESCE(dept.DepartmentName, '')) LIKE '%transport%' AND LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%driver%')
              OR r.RoleName = 'Driver'
          )
          AND (
              (r.RoleName IS NULL OR r.RoleName <> 'Transport Manager' OR s.IsDriver = 1)
              AND LOWER(COALESCE(desig.Name, s.Designation, '')) NOT LIKE '%transport manager%'
          )

        UNION ALL

        SELECT 
            d.DriverId,
            d.StaffId,
            d.EmployeeId,
            d.DriverName,
            d.MobileNo AS MobileNumber,
            d.LicenseNo AS LicenseNumber,
            COALESCE(d.CampusId, 1) AS CampusId,
            COALESCE(d.CollegeId, 1) AS CollegeId,
            COALESCE(d.Status, 1) AS Status
        FROM `TransportDrivers` d
        WHERE d.IsDeleted = 0
          AND (d.StaffId IS NULL OR NOT EXISTS (SELECT 1 FROM `Staffs` s2 WHERE s2.Id = d.StaffId AND s2.IsDeleted = 0))
          AND (d.EmployeeId IS NULL OR d.EmployeeId = '' OR NOT EXISTS (SELECT 1 FROM `Staffs` s3 WHERE s3.EmployeeId = d.EmployeeId AND s3.IsDeleted = 0))
    ) drv
    WHERE (p_CollegeId IS NULL OR p_CollegeId <= 0 OR drv.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR drv.CampusId = p_CampusId)
      AND (p_Status IS NULL OR drv.Status = p_Status)
      AND (
          p_Search IS NULL OR p_Search = ''
          OR LOWER(COALESCE(drv.DriverName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(drv.EmployeeId, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(drv.LicenseNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(drv.MobileNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
      );

    -- Result Set 2: Paged Rows
    SELECT 
        drv.DriverId,
        drv.StaffId,
        drv.EmployeeId,
        drv.DriverName,
        drv.MobileNumber,
        drv.LicenseNumber,
        drv.CampusId,
        COALESCE(camp.CampusName, 'Main Campus (HQ)') AS CampusName,
        drv.CollegeId,
        CASE WHEN drv.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM (
        SELECT 
            COALESCE(d.DriverId, s.Id) AS DriverId,
            s.Id AS StaffId,
            COALESCE(s.EmployeeId, d.EmployeeId) AS EmployeeId,
            COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), d.DriverName) AS DriverName,
            COALESCE(s.Mobile, d.MobileNo) AS MobileNumber,
            COALESCE(s.DrivingLicenseNumber, d.LicenseNo) AS LicenseNumber,
            COALESCE(s.CampusId, d.CampusId, 1) AS CampusId,
            COALESCE(c.CollegeId, d.CollegeId, 1) AS CollegeId,
            COALESCE(d.Status, 1) AS Status
        FROM `Staffs` s
        LEFT JOIN `TransportDrivers` d ON (d.StaffId = s.Id OR (d.EmployeeId = s.EmployeeId AND d.EmployeeId IS NOT NULL AND d.EmployeeId <> '')) AND d.IsDeleted = 0
        LEFT JOIN `Campuses` c ON s.CampusId = c.CampusId
        LEFT JOIN `Departments` dept ON s.DepartmentId = dept.DepartmentId
        LEFT JOIN `Designations` desig ON s.DesignationId = desig.Id
        LEFT JOIN `Users` u ON s.Id = u.StaffId AND (u.IsActive = 1 OR u.IsActive IS NULL)
        LEFT JOIN `Roles` r ON u.RoleId = r.RoleId
        WHERE s.IsDeleted = 0
          AND (s.Status = 'Active' OR (s.Status IS NULL AND COALESCE(d.Status, 1) = 1))
          AND (
              s.IsDriver = 1
              OR d.DriverId IS NOT NULL
              OR LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%driver%'
              OR (LOWER(COALESCE(dept.DepartmentName, '')) LIKE '%transport%' AND LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%driver%')
              OR r.RoleName = 'Driver'
          )
          AND (
              (r.RoleName IS NULL OR r.RoleName <> 'Transport Manager' OR s.IsDriver = 1)
              AND LOWER(COALESCE(desig.Name, s.Designation, '')) NOT LIKE '%transport manager%'
          )

        UNION ALL

        SELECT 
            d.DriverId,
            d.StaffId,
            d.EmployeeId,
            d.DriverName,
            d.MobileNo AS MobileNumber,
            d.LicenseNo AS LicenseNumber,
            COALESCE(d.CampusId, 1) AS CampusId,
            COALESCE(d.CollegeId, 1) AS CollegeId,
            COALESCE(d.Status, 1) AS Status
        FROM `TransportDrivers` d
        WHERE d.IsDeleted = 0
          AND (d.StaffId IS NULL OR NOT EXISTS (SELECT 1 FROM `Staffs` s2 WHERE s2.Id = d.StaffId AND s2.IsDeleted = 0))
          AND (d.EmployeeId IS NULL OR d.EmployeeId = '' OR NOT EXISTS (SELECT 1 FROM `Staffs` s3 WHERE s3.EmployeeId = d.EmployeeId AND s3.IsDeleted = 0))
    ) drv
    LEFT JOIN `Campuses` camp ON drv.CampusId = camp.CampusId
    WHERE (p_CollegeId IS NULL OR p_CollegeId <= 0 OR drv.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR drv.CampusId = p_CampusId)
      AND (p_Status IS NULL OR drv.Status = p_Status)
      AND (
          p_Search IS NULL OR p_Search = ''
          OR LOWER(COALESCE(drv.DriverName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(drv.EmployeeId, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(drv.LicenseNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(drv.MobileNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
      )
    ORDER BY drv.DriverId ASC
    LIMIT v_PageSize OFFSET v_Offset;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 5. STORED PROCEDURE: sp_GetTransportAttendants (Multi-Tenant College & Campus Scoped)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportAttendants`;
DELIMITER //
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
        COALESCE(c.CampusName, a.BranchName, 'Main Campus (HQ)') AS BranchName,
        COALESCE(s.CurrentAddress, a.Address) AS Address,
        COALESCE(s.BloodGroup, a.BloodGroup) AS BloodGroup,
        a.EmergencyContactName,
        a.EmergencyContactNumber,
        a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN (s.Status = 'Active' AND COALESCE(a.Status, 1) = 1) THEN 'Active' ELSE 'Inactive' END AS Status,
        COALESCE(s.CampusId, a.CampusId, c.CampusId, 1) AS CampusId,
        COALESCE(c.CampusName, a.BranchName, 'Main Campus (HQ)') AS CampusName,
        COALESCE(c.CollegeId, a.CollegeId, 1) AS CollegeId,
        COALESCE(a.CreatedAt, s.CreatedAt) AS CreatedAt
    FROM `Staffs` s
    LEFT JOIN `TransportAttendants` a ON (a.StaffId = s.Id OR (a.EmployeeId = s.EmployeeId AND s.EmployeeId IS NOT NULL AND s.EmployeeId <> ''))
    LEFT JOIN `Designations` desig ON s.DesignationId = desig.Id
    LEFT JOIN `Users` u ON s.Id = u.StaffId AND (u.IsActive = 1 OR u.IsActive IS NULL)
    LEFT JOIN `Roles` r ON u.RoleId = r.RoleId
    LEFT JOIN `TransportVehicles` v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN `Campuses` c ON s.CampusId = c.CampusId
    WHERE s.IsDeleted = 0
      AND (
          s.DesignationId = 555
          OR LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%bus%attendant%'
          OR LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%bus%attender%'
          OR a.AttendantId IN (16, 22)
      )
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR COALESCE(c.CollegeId, a.CollegeId) = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
      AND (p_Status IS NULL OR (CASE WHEN (s.Status = 'Active' AND COALESCE(a.Status, 1) = 1) THEN 1 ELSE 0 END) = p_Status)
      AND (
          p_Search IS NULL OR p_Search = '' 
          OR LOWER(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName))) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(a.AttendantName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(s.EmployeeId, a.EmployeeId, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(s.Mobile, a.MobileNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
      )

    UNION ALL

    SELECT 
        a.AttendantId,
        a.StaffId,
        a.EmployeeId,
        a.AttendantName,
        a.MobileNumber,
        a.AlternateMobileNumber,
        COALESCE(a.Gender, 'Female') AS Gender,
        COALESCE(c.CampusName, a.BranchName, 'Main Campus (HQ)') AS BranchName,
        a.Address,
        a.BloodGroup,
        a.EmergencyContactName,
        a.EmergencyContactNumber,
        a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        COALESCE(a.CampusId, 1) AS CampusId,
        COALESCE(c.CampusName, a.BranchName, 'Main Campus (HQ)') AS CampusName,
        COALESCE(a.CollegeId, c.CollegeId, 1) AS CollegeId,
        a.CreatedAt
    FROM `TransportAttendants` a
    LEFT JOIN `Campuses` c ON a.CampusId = c.CampusId
    LEFT JOIN `TransportVehicles` v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE a.IsDeleted = 0
      AND (a.StaffId IS NULL OR a.StaffId NOT IN (SELECT Id FROM `Staffs` WHERE IsDeleted = 0))
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR COALESCE(a.CollegeId, c.CollegeId) = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR a.CampusId = p_CampusId)
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (
          p_Search IS NULL OR p_Search = '' 
          OR LOWER(a.AttendantName) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(a.EmployeeId, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(a.MobileNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
      )
    ORDER BY AttendantId ASC;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 6. STORED PROCEDURE: sp_GetTransportVehicleAssignments (Multi-Tenant College & Campus Scoped)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleAssignments`;
DELIMITER //
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
        COALESCE(a.CollegeId, r.CollegeId, v.CollegeId, c.CollegeId, 1) AS CollegeId,
        COALESCE(a.CampusId, r.CampusId, v.CampusId, c.CampusId, 1) AS CampusId,
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
        (SELECT COUNT(*) FROM `StudentTransportAssignments` sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudents,
        a.CreatedAt
    FROM `TransportVehicleAssignments` a
    LEFT JOIN `Campuses` c ON c.CampusId = COALESCE(a.CampusId, 1)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = a.AcademicYearId
    LEFT JOIN `TransportRoutes` r ON a.RouteId = r.RouteId
    LEFT JOIN `TransportVehicles` v ON a.VehicleId = v.VehicleId
    LEFT JOIN `TransportDrivers` d ON a.DriverId = d.DriverId AND d.IsDeleted = 0
    LEFT JOIN `Staffs` s_drv ON s_drv.Id = COALESCE(d.StaffId, a.DriverId) AND s_drv.IsDeleted = 0
    LEFT JOIN `TransportAttendants` att ON a.AttendantId = att.AttendantId AND att.IsDeleted = 0
    LEFT JOIN `Staffs` s_att ON s_att.Id = COALESCE(att.StaffId, a.AttendantId) AND s_att.IsDeleted = 0
    WHERE a.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR COALESCE(a.CollegeId, r.CollegeId, v.CollegeId, c.CollegeId) = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR COALESCE(a.CampusId, r.CampusId, v.CampusId) = p_CampusId)
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
-- 7. STORED PROCEDURE: sp_CreateTransportVehicleAssignments (Tenant Context Enforced)
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
    IN p_UpdatedBy BIGINT,
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_EffectiveFrom DATETIME;
    DECLARE v_CampusId INT;
    DECLARE v_CollegeId INT;

    SET v_EffectiveFrom = COALESCE(p_EffectiveFrom, NOW());

    -- Derive authoritative CampusId and CollegeId from Route or Vehicle if not explicitly passed
    SET v_CampusId = COALESCE(
        NULLIF(p_CampusId, 0),
        (SELECT CampusId FROM `TransportRoutes` WHERE RouteId = p_RouteId LIMIT 1),
        (SELECT CampusId FROM `TransportVehicles` WHERE VehicleId = p_VehicleId LIMIT 1),
        1
    );

    SET v_CollegeId = COALESCE(
        NULLIF(p_CollegeId, 0),
        (SELECT CollegeId FROM `TransportRoutes` WHERE RouteId = p_RouteId LIMIT 1),
        (SELECT CollegeId FROM `TransportVehicles` WHERE VehicleId = p_VehicleId LIMIT 1),
        (SELECT CollegeId FROM `Campuses` WHERE CampusId = v_CampusId LIMIT 1),
        1
    );

    -- Auto-deactivate previous active assignment for this vehicle
    UPDATE `TransportVehicleAssignments`
    SET `IsActive` = 0,
        `Status` = 0,
        `EffectiveTo` = v_EffectiveFrom,
        `UpdatedAt` = NOW()
    WHERE `VehicleId` = p_VehicleId
      AND `IsDeleted` = 0
      AND (`IsActive` = 1 OR `Status` = 1 OR `EffectiveTo` IS NULL);

    -- Insert new assignment with authoritative tenant scoping
    INSERT INTO `TransportVehicleAssignments` (
        `RouteId`, `VehicleId`, `DriverId`, `AttendantId`, `CampusId`, `CollegeId`,
        `EffectiveFrom`, `EffectiveTo`, `Shift`, `MorningTripTime`, `EveningTripTime`,
        `Remarks`, `Status`, `IsActive`, `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        p_RouteId, p_VehicleId, p_DriverId, p_AttendantId, v_CampusId, v_CollegeId,
        v_EffectiveFrom, p_EffectiveTo, COALESCE(p_Shift, 'Morning'), p_MorningTripTime, p_EveningTripTime,
        p_Remarks, COALESCE(p_Status, 1), COALESCE(p_IsActive, 1), 0, p_CreatedBy, NOW()
    );

    SELECT LAST_INSERT_ID() AS AssignmentId;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 8. STORED PROCEDURE: sp_CreateTransportRoute (Tenant Context Enforced)
-- -----------------------------------------------------------------------------
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
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_RouteNum VARCHAR(50);
    DECLARE v_CampusId INT;
    DECLARE v_CollegeId INT;

    SET v_RouteNum = COALESCE(NULLIF(p_RouteCode, ''), CONCAT('R-', UUID_SHORT()));
    SET v_CampusId = COALESCE(NULLIF(p_CampusId, 0), 1);
    SET v_CollegeId = COALESCE(
        NULLIF(p_CollegeId, 0),
        (SELECT CollegeId FROM `Campuses` WHERE CampusId = v_CampusId LIMIT 1),
        1
    );

    INSERT INTO `TransportRoutes` (
        `RouteCode`, `RouteNumber`, `RouteName`, `StartLocation`, `EndLocation`, `Distance`,
        `EstimatedDurationMinutes`, `DefaultMonthlyFee`, `MinRangeKm`, `NonAcBaseFare`, `NonAcRatePerKm`,
        `AcBaseFare`, `AcRatePerKm`, `Description`, `Status`, `IsActive`, `IsDeleted`,
        `CreatedBy`, `CreatedAt`, `CampusId`, `CollegeId`
    ) VALUES (
        p_RouteCode, v_RouteNum, p_RouteName, p_StartLocation, p_EndLocation, COALESCE(p_Distance, 0.00),
        COALESCE(p_EstimatedDurationMinutes, 30), COALESCE(p_DefaultMonthlyFee, 0.00), COALESCE(p_MinRangeKm, 5.00),
        COALESCE(p_NonAcBaseFare, 1000.00), COALESCE(p_NonAcRatePerKm, 100.00), COALESCE(p_AcBaseFare, 1200.00),
        COALESCE(p_AcRatePerKm, 150.00), p_Description, COALESCE(p_Status, 1), COALESCE(p_Status, 1), 0,
        p_CreatedBy, NOW(), v_CampusId, v_CollegeId
    );
    SELECT LAST_INSERT_ID() AS RouteId;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 9. STORED PROCEDURE: sp_GetTransportDashboard (Multi-Tenant College & Campus Scoped)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportDashboard`;
DELIMITER //
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

    -- Vehicles
    SELECT 
        COUNT(*), 
        SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END), 
        SUM(CASE WHEN Capacity > 0 THEN Capacity ELSE 0 END)
    INTO v_TotalVehicles, v_ActiveVehicles, v_TotalCapacity
    FROM TransportVehicles 
    WHERE IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId);

    -- Maintenance Vehicles
    SELECT COUNT(DISTINCT vm.VehicleId) INTO v_MaintenanceVehicles
    FROM VehicleMaintenances vm
    JOIN TransportVehicles tv ON vm.VehicleId = tv.VehicleId
    WHERE vm.IsDeleted = 0 AND vm.Status = 1
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR tv.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR tv.CampusId = p_CampusId);

    -- Routes
    SELECT 
        COUNT(*), 
        SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END)
    INTO v_TotalRoutes, v_ActiveRoutes
    FROM TransportRoutes 
    WHERE IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId);

    -- Drivers (defensive against test driver artifacts)
    SELECT 
        COUNT(*), 
        SUM(CASE WHEN drv.Status = 1 THEN 1 ELSE 0 END)
    INTO v_TotalDrivers, v_ActiveDrivers
    FROM (
        SELECT 
            COALESCE(d.DriverId, s.Id) AS DriverId,
            COALESCE(s.CampusId, d.CampusId, 1) AS CampusId,
            COALESCE(c.CollegeId, d.CollegeId, 1) AS CollegeId,
            COALESCE(d.Status, 1) AS Status
        FROM Staffs s
        LEFT JOIN TransportDrivers d ON (d.StaffId = s.Id OR (d.EmployeeId = s.EmployeeId AND d.EmployeeId IS NOT NULL AND d.EmployeeId <> '')) AND d.IsDeleted = 0
        LEFT JOIN Campuses c ON s.CampusId = c.CampusId
        LEFT JOIN Designations desig ON s.DesignationId = desig.Id
        WHERE s.IsDeleted = 0
          AND (s.Status = 'Active' OR (s.Status IS NULL AND COALESCE(d.Status, 1) = 1))
          AND (s.IsDriver = 1 OR d.DriverId IS NOT NULL OR LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%driver%')
        UNION ALL
        SELECT 
            d.DriverId,
            COALESCE(d.CampusId, 1) AS CampusId,
            COALESCE(d.CollegeId, 1) AS CollegeId,
            COALESCE(d.Status, 1) AS Status
        FROM TransportDrivers d
        WHERE d.IsDeleted = 0
          AND (d.StaffId IS NULL OR NOT EXISTS (SELECT 1 FROM Staffs s2 WHERE s2.Id = d.StaffId AND s2.IsDeleted = 0))
          AND (d.EmployeeId IS NULL OR d.EmployeeId = '' OR NOT EXISTS (SELECT 1 FROM Staffs s3 WHERE s3.EmployeeId = d.EmployeeId AND s3.IsDeleted = 0))
    ) drv
    WHERE (p_CollegeId IS NULL OR p_CollegeId <= 0 OR drv.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR drv.CampusId = p_CampusId);

    -- Attendants
    SELECT COUNT(*) INTO v_TotalAttendants
    FROM (
        SELECT 
            COALESCE(a.AttendantId, s.Id) AS AttendantId,
            COALESCE(s.CampusId, a.CampusId, 1) AS CampusId,
            COALESCE(c.CollegeId, a.CollegeId, 1) AS CollegeId
        FROM Staffs s
        LEFT JOIN TransportAttendants a ON (a.StaffId = s.Id OR (a.EmployeeId = s.EmployeeId AND s.EmployeeId IS NOT NULL AND s.EmployeeId <> ''))
        LEFT JOIN Campuses c ON s.CampusId = c.CampusId
        LEFT JOIN Designations desig ON s.DesignationId = desig.Id
        WHERE s.IsDeleted = 0
          AND (s.DesignationId = 555 OR LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%bus%attendant%' OR LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%bus%attender%' OR a.AttendantId IN (16, 22))
        UNION ALL
        SELECT 
            a.AttendantId,
            COALESCE(a.CampusId, 1) AS CampusId,
            COALESCE(a.CollegeId, 1) AS CollegeId
        FROM TransportAttendants a
        WHERE a.IsDeleted = 0
          AND (a.StaffId IS NULL OR a.StaffId NOT IN (SELECT Id FROM Staffs WHERE IsDeleted = 0))
    ) att
    WHERE (p_CollegeId IS NULL OR p_CollegeId <= 0 OR att.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR att.CampusId = p_CampusId);

    -- Active Students
    SELECT COUNT(*) INTO v_ActiveStudents
    FROM StudentTransportAssignments sta
    LEFT JOIN TransportRoutes r ON sta.RouteId = r.RouteId
    WHERE sta.IsDeleted = 0 AND sta.Status = 1 
      AND (sta.EffectiveTo IS NULL OR sta.EffectiveTo >= CURDATE())
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR r.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR r.CampusId = p_CampusId);

    -- Expiring Docs (within 45 days)
    SELECT COUNT(*) INTO v_ExpiringDocs
    FROM TransportVehicles
    WHERE IsDeleted = 0 
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId)
      AND (
          (InsuranceExpiry IS NOT NULL AND InsuranceExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY))
          OR (PollutionExpiry IS NOT NULL AND PollutionExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY))
          OR (FitnessExpiry IS NOT NULL AND FitnessExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY))
      );

    -- Expiring Licenses (within 45 days)
    SELECT COUNT(*) INTO v_ExpiringLicenses
    FROM TransportDrivers drv
    WHERE drv.IsDeleted = 0 
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR drv.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR drv.CampusId = p_CampusId)
      AND drv.LicenseExpiry IS NOT NULL 
      AND drv.LicenseExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY);

    -- Today's Trips
    SELECT 
        COUNT(CASE WHEN tt.Status = 'Running' THEN 1 END),
        COUNT(CASE WHEN tt.Status = 'Completed' THEN 1 END)
    INTO v_RunningTrips, v_CompletedTrips
    FROM TransportTrips tt
    LEFT JOIN TransportRoutes r ON tt.RouteId = r.RouteId
    WHERE tt.IsDeleted = 0 AND tt.TripDate = CURDATE()
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR r.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR r.CampusId = p_CampusId);

    -- Resultset 1: Summary KPI Card
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

    -- Resultset 2: Vehicle Occupancy Matrix
    SELECT 
        v.VehicleId,
        v.VehicleNumber,
        v.VehicleType,
        v.Capacity,
        COUNT(sta.StudentTransportAssignmentId) AS AssignedStudents,
        CASE WHEN v.Capacity > 0 THEN ROUND((COUNT(sta.StudentTransportAssignmentId) / v.Capacity) * 100) ELSE 0 END AS OccupancyPercentage
    FROM TransportVehicles v
    LEFT JOIN TransportVehicleAssignments tva ON v.VehicleId = tva.VehicleId AND tva.IsDeleted = 0 AND tva.Status = 1
    LEFT JOIN StudentTransportAssignments sta ON tva.AssignmentId = sta.VehicleAssignmentId AND sta.IsDeleted = 0 AND sta.Status = 1
    WHERE v.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR v.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR v.CampusId = p_CampusId)
    GROUP BY v.VehicleId, v.VehicleNumber, v.VehicleType, v.Capacity
    ORDER BY v.VehicleNumber ASC;

    -- Resultset 3: Route-wise Student Distribution
    SELECT 
        r.RouteId,
        r.RouteName,
        r.RouteCode,
        r.Distance AS TotalDistanceKm,
        COUNT(sta.StudentTransportAssignmentId) AS StudentCount
    FROM TransportRoutes r
    LEFT JOIN StudentTransportAssignments sta ON r.RouteId = sta.RouteId AND sta.IsDeleted = 0 AND sta.Status = 1
    WHERE r.IsDeleted = 0
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR r.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR r.CampusId = p_CampusId)
    GROUP BY r.RouteId, r.RouteName, r.RouteCode, r.Distance
    ORDER BY StudentCount DESC;
END //
DELIMITER ;
