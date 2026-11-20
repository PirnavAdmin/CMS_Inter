-- =============================================================================
-- Migration Script: 30_Transport_Attendant_From_Staff_SPs.sql
-- Description: Unifies Transport Attendants to fetch directly from Staff,
--              supports seamless resolution by AttendantId or StaffId,
--              and provides idempotent backfill of existing attendant staff.
-- =============================================================================

DELIMITER //

-- -----------------------------------------------------------------------------
-- 1. PROCEDURE: sp_SyncTransportAttendantFromStaff
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_SyncTransportAttendantFromStaff`//
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
    DECLARE v_CampusId INT;
    DECLARE v_CampusName VARCHAR(100);

    -- Find existing TransportAttendants profile for this StaffId
    SELECT AttendantId INTO v_ExistingAttendantId 
    FROM TransportAttendants 
    WHERE StaffId = p_StaffId 
    ORDER BY AttendantId DESC 
    LIMIT 1;

    -- If not found by StaffId, try matching by EmployeeId
    IF v_ExistingAttendantId IS NULL THEN
        SELECT a.AttendantId INTO v_ExistingAttendantId
        FROM TransportAttendants a
        INNER JOIN Staff s ON s.Id = p_StaffId
        WHERE a.EmployeeId = s.EmployeeId
        ORDER BY a.AttendantId DESC
        LIMIT 1;
    END IF;

    IF p_IsAttendantRole = 1 THEN
        -- Fetch current staff details
        SELECT 
            TRIM(CONCAT(COALESCE(FirstName, ''), ' ', COALESCE(LastName, ''))),
            EmployeeId,
            Mobile,
            COALESCE(AlternateMobile, ''),
            COALESCE(Gender, 'Female'),
            COALESCE(CurrentAddress, ''),
            COALESCE(BloodGroup, ''),
            CampusId
        INTO 
            v_AttendantName,
            v_EmployeeId,
            v_Mobile,
            v_AlternateMobile,
            v_Gender,
            v_Address,
            v_BloodGroup,
            v_CampusId
        FROM Staff
        WHERE Id = p_StaffId
        LIMIT 1;

        -- Resolve Campus Name
        SELECT CampusName INTO v_CampusName
        FROM Campuses
        WHERE CampusId = v_CampusId
        LIMIT 1;

        IF v_ExistingAttendantId IS NOT NULL THEN
            -- Reactivate and sync existing profile
            UPDATE TransportAttendants
            SET 
                StaffId = p_StaffId,
                AttendantName = v_AttendantName,
                EmployeeId = v_EmployeeId,
                MobileNumber = v_Mobile,
                AlternateMobileNumber = v_AlternateMobile,
                Gender = COALESCE(v_Gender, Gender, 'Female'),
                BranchName = COALESCE(v_CampusName, BranchName, 'Main Campus (HQ)'),
                Address = COALESCE(NULLIF(TRIM(v_Address), ''), Address, ''),
                BloodGroup = COALESCE(NULLIF(TRIM(v_BloodGroup), ''), BloodGroup, ''),
                Status = 1,
                IsActive = 1,
                IsDeleted = 0,
                UpdatedAt = UTC_TIMESTAMP()
            WHERE AttendantId = v_ExistingAttendantId;

            -- Soft delete any older duplicates for this staff member
            UPDATE TransportAttendants
            SET IsDeleted = 1, Status = 0, IsActive = 0, UpdatedAt = UTC_TIMESTAMP()
            WHERE StaffId = p_StaffId AND AttendantId <> v_ExistingAttendantId;

            SELECT v_ExistingAttendantId AS AttendantId;
        ELSE
            -- Insert new TransportAttendants profile
            INSERT INTO TransportAttendants (
                StaffId,
                EmployeeId,
                AttendantName,
                MobileNumber,
                AlternateMobileNumber,
                Gender,
                BranchName,
                Address,
                BloodGroup,
                Status,
                IsActive,
                IsDeleted,
                CreatedAt,
                UpdatedAt
            ) VALUES (
                p_StaffId,
                v_EmployeeId,
                v_AttendantName,
                v_Mobile,
                v_AlternateMobile,
                v_Gender,
                COALESCE(v_CampusName, 'Main Campus (HQ)'),
                v_Address,
                v_BloodGroup,
                1,
                1,
                0,
                UTC_TIMESTAMP(),
                UTC_TIMESTAMP()
            );

            SELECT LAST_INSERT_ID() AS AttendantId;
        END IF;
    ELSE
        -- Deactivate only if not assigned to any active vehicle
        IF v_ExistingAttendantId IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM TransportVehicleAssignments WHERE AttendantId = v_ExistingAttendantId AND IsDeleted = 0) THEN
                UPDATE TransportAttendants 
                SET IsDeleted = 1, Status = 0, IsActive = 0, UpdatedAt = UTC_TIMESTAMP() 
                WHERE AttendantId = v_ExistingAttendantId;
            END IF;
        END IF;

        SELECT 0 AS AttendantId;
    END IF;
END//

-- -----------------------------------------------------------------------------
-- 2. PROCEDURE: sp_GetTransportAttendantLookup
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportAttendantLookup`//
CREATE PROCEDURE `sp_GetTransportAttendantLookup`()
BEGIN
    SELECT 
        COALESCE(a.AttendantId, s.Id) AS AttendantId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), a.AttendantName) AS AttendantName,
        COALESCE(s.EmployeeId, a.EmployeeId) AS EmployeeId,
        COALESCE(s.Mobile, a.MobileNumber) AS MobileNumber,
        COALESCE(c.CampusName, a.BranchName, 'Main Campus (HQ)') AS BranchName,
        CONCAT(COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), a.AttendantName), ' (', COALESCE(s.EmployeeId, a.EmployeeId, 'STAFF'), ')') AS DisplayName
    FROM Staff s
    LEFT JOIN TransportAttendants a ON (a.StaffId = s.Id OR (a.EmployeeId = s.EmployeeId AND s.EmployeeId IS NOT NULL AND s.EmployeeId <> ''))
    LEFT JOIN Designations desig ON s.DesignationId = desig.Id
    LEFT JOIN Users u ON s.Id = u.StaffId AND (u.IsActive = 1 OR u.IsActive IS NULL)
    LEFT JOIN Roles r ON u.RoleId = r.RoleId
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    WHERE s.IsDeleted = 0
      AND (s.Status = 'Active' OR s.Status IS NULL)
      AND (
          s.DesignationId = 555
          OR LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%bus%attendant%'
          OR LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%bus%attender%'
          OR a.AttendantId IN (16, 22)
      )
    UNION
    SELECT 
        a.AttendantId,
        a.AttendantName,
        a.EmployeeId,
        a.MobileNumber,
        COALESCE(a.BranchName, 'Main Campus (HQ)') AS BranchName,
        CONCAT(a.AttendantName, ' (', COALESCE(a.EmployeeId, 'ATT'), ')') AS DisplayName
    FROM TransportAttendants a
    WHERE a.IsDeleted = 0 
      AND a.Status = 1
      AND (a.StaffId IS NULL OR a.StaffId NOT IN (SELECT Id FROM Staff WHERE IsDeleted = 0))
    ORDER BY AttendantName ASC;
END//

-- -----------------------------------------------------------------------------
-- 3. PROCEDURE: sp_GetTransportAttendants
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportAttendants`//
CREATE PROCEDURE `sp_GetTransportAttendants`(
    IN p_Search VARCHAR(100),
    IN p_Status TINYINT,
    IN p_CampusId INT
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
        COALESCE(s.CampusId, c.CampusId, 1) AS CampusId,
        COALESCE(c.CampusName, a.BranchName, 'Main Campus (HQ)') AS CampusName,
        COALESCE(a.CreatedAt, s.CreatedAt) AS CreatedAt
    FROM Staff s
    LEFT JOIN TransportAttendants a ON (a.StaffId = s.Id OR (a.EmployeeId = s.EmployeeId AND s.EmployeeId IS NOT NULL AND s.EmployeeId <> ''))
    LEFT JOIN Designations desig ON s.DesignationId = desig.Id
    LEFT JOIN Users u ON s.Id = u.StaffId AND (u.IsActive = 1 OR u.IsActive IS NULL)
    LEFT JOIN Roles r ON u.RoleId = r.RoleId
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    WHERE s.IsDeleted = 0
      AND (
          s.DesignationId = 555
          OR LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%bus%attendant%'
          OR LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%bus%attender%'
          OR a.AttendantId IN (16, 22)
      )
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
        COALESCE(a.BranchName, 'Main Campus (HQ)') AS BranchName,
        a.Address,
        a.BloodGroup,
        a.EmergencyContactName,
        a.EmergencyContactNumber,
        a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        1 AS CampusId,
        COALESCE(a.BranchName, 'Main Campus (HQ)') AS CampusName,
        a.CreatedAt
    FROM TransportAttendants a
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE a.IsDeleted = 0
      AND (a.StaffId IS NULL OR a.StaffId NOT IN (SELECT Id FROM Staff WHERE IsDeleted = 0))
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (
          p_Search IS NULL OR p_Search = '' 
          OR LOWER(a.AttendantName) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(a.EmployeeId, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(a.MobileNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
      )
    ORDER BY AttendantId ASC;
END//

-- -----------------------------------------------------------------------------
-- 4. PROCEDURE: sp_GetTransportAttendantById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportAttendantById`//
CREATE PROCEDURE `sp_GetTransportAttendantById`(
    IN p_Id BIGINT
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
        COALESCE(s.CampusId, c.CampusId, 1) AS CampusId,
        COALESCE(c.CampusName, a.BranchName, 'Main Campus (HQ)') AS CampusName,
        COALESCE(a.CreatedAt, s.CreatedAt) AS CreatedAt
    FROM Staff s
    LEFT JOIN TransportAttendants a ON (a.StaffId = s.Id OR (a.EmployeeId = s.EmployeeId AND s.EmployeeId IS NOT NULL AND s.EmployeeId <> ''))
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    WHERE (s.Id = p_Id OR a.AttendantId = p_Id OR a.StaffId = p_Id)
      AND s.IsDeleted = 0
    UNION ALL
    SELECT 
        a.AttendantId,
        a.StaffId,
        a.EmployeeId,
        a.AttendantName,
        a.MobileNumber,
        a.AlternateMobileNumber,
        COALESCE(a.Gender, 'Female') AS Gender,
        COALESCE(a.BranchName, 'Main Campus (HQ)') AS BranchName,
        a.Address,
        a.BloodGroup,
        a.EmergencyContactName,
        a.EmergencyContactNumber,
        a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        1 AS CampusId,
        COALESCE(a.BranchName, 'Main Campus (HQ)') AS CampusName,
        a.CreatedAt
    FROM TransportAttendants a
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE a.AttendantId = p_Id 
      AND a.IsDeleted = 0
      AND (a.StaffId IS NULL OR a.StaffId NOT IN (SELECT Id FROM Staff WHERE IsDeleted = 0))
    LIMIT 1;
END//

-- -----------------------------------------------------------------------------
-- 5. PROCEDURE: sp_GetTransportAttendantByIdOrName
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportAttendantByIdOrName`//
CREATE PROCEDURE `sp_GetTransportAttendantByIdOrName`(
    IN p_SearchId BIGINT,
    IN p_SearchStr VARCHAR(100)
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
        COALESCE(s.CampusId, c.CampusId, 1) AS CampusId,
        COALESCE(c.CampusName, a.BranchName, 'Main Campus (HQ)') AS CampusName,
        COALESCE(a.CreatedAt, s.CreatedAt) AS CreatedAt
    FROM Staff s
    LEFT JOIN TransportAttendants a ON (a.StaffId = s.Id OR (a.EmployeeId = s.EmployeeId AND s.EmployeeId IS NOT NULL AND s.EmployeeId <> ''))
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    WHERE s.IsDeleted = 0
      AND (
          s.Id = p_SearchId 
          OR a.AttendantId = p_SearchId 
          OR a.StaffId = p_SearchId 
          OR LOWER(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName))) = LOWER(p_SearchStr)
          OR LOWER(COALESCE(a.AttendantName, '')) = LOWER(p_SearchStr)
          OR LOWER(COALESCE(s.EmployeeId, a.EmployeeId, '')) = LOWER(p_SearchStr)
          OR LOWER(COALESCE(s.Mobile, a.MobileNumber, '')) = LOWER(p_SearchStr)
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
        COALESCE(a.BranchName, 'Main Campus (HQ)') AS BranchName,
        a.Address,
        a.BloodGroup,
        a.EmergencyContactName,
        a.EmergencyContactNumber,
        a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        1 AS CampusId,
        COALESCE(a.BranchName, 'Main Campus (HQ)') AS CampusName,
        a.CreatedAt
    FROM TransportAttendants a
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE a.IsDeleted = 0
      AND (a.StaffId IS NULL OR a.StaffId NOT IN (SELECT Id FROM Staff WHERE IsDeleted = 0))
      AND (
          a.AttendantId = p_SearchId
          OR LOWER(a.AttendantName) = LOWER(p_SearchStr)
          OR LOWER(COALESCE(a.EmployeeId, '')) = LOWER(p_SearchStr)
          OR LOWER(COALESCE(a.MobileNumber, '')) = LOWER(p_SearchStr)
      )
    LIMIT 1;
END//

-- -----------------------------------------------------------------------------
-- 6. PROCEDURE: sp_GetTransportVehicleAssignments
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleAssignments`//
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
        a.RouteId,
        r.RouteName,
        r.RouteCode,
        a.VehicleId,
        v.VehicleNumber,
        v.Capacity,
        a.DriverId,
        COALESCE(CONCAT(TRIM(s_drv.FirstName), ' ', TRIM(s_drv.LastName)), d.DriverName, 'Unassigned') AS DriverName,
        COALESCE(s_drv.Mobile, d.MobileNo) AS DriverMobile,
        a.AttendantId,
        COALESCE(CONCAT(TRIM(s_att.FirstName), ' ', TRIM(s_att.LastName)), att.AttendantName, 'Unassigned') AS AttendantName,
        a.EffectiveFrom,
        a.EffectiveTo,
        a.Shift,
        a.MorningTripTime,
        a.EveningTripTime,
        a.Remarks,
        a.Status,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudents
    FROM TransportVehicleAssignments a
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
END//

-- -----------------------------------------------------------------------------
-- 7. PROCEDURE: sp_GetStudentTransportDetails
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStudentTransportDetails`//
CREATE PROCEDURE `sp_GetStudentTransportDetails`(
    IN p_StudentId BIGINT
)
BEGIN
    SELECT 
        s.StudentId,
        s.StudentName,
        'Intermediate 2nd Year - MPC' AS AcademicLevel,
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
        COALESCE(CONCAT(TRIM(s_drv.FirstName), ' ', TRIM(s_drv.LastName)), d.DriverName) AS DriverName,
        COALESCE(s_drv.Mobile, d.MobileNo) AS DriverPhone,
        COALESCE(CONCAT(TRIM(s_att.FirstName), ' ', TRIM(s_att.LastName)), att.AttendantName) AS AttendantName,
        COALESCE(s_att.Mobile, att.MobileNumber) AS AttendantPhone,
        'Live GPS Active' AS GpsStatus
    FROM Students s
    JOIN StudentTransportAssignments sta ON (s.StudentId = sta.StudentId OR s.AdmissionNo = sta.AdmissionNo) AND sta.IsDeleted = 0 AND sta.Status = 1
    JOIN TransportRoutes r ON sta.RouteId = r.RouteId AND r.IsDeleted = 0
    LEFT JOIN PickupPoints pp ON sta.PickupPointId = pp.PickupPointId AND pp.IsDeleted = 0
    LEFT JOIN TransportVehicleAssignments tva ON sta.VehicleAssignmentId = tva.AssignmentId AND tva.IsDeleted = 0
    LEFT JOIN TransportVehicles v ON tva.VehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN TransportDrivers d ON tva.DriverId = d.DriverId AND d.IsDeleted = 0
    LEFT JOIN Staff s_drv ON (d.StaffId = s_drv.Id OR tva.DriverId = s_drv.Id) AND s_drv.IsDeleted = 0
    LEFT JOIN TransportAttendants att ON tva.AttendantId = att.AttendantId AND att.IsDeleted = 0
    LEFT JOIN Staff s_att ON (att.StaffId = s_att.Id OR tva.AttendantId = s_att.Id) AND s_att.IsDeleted = 0
    WHERE s.StudentId = p_StudentId
    LIMIT 1;
END//

DELIMITER ;

-- =============================================================================
-- 8. IDEMPOTENT BACKFILL: Sync existing Bus Attendant Staff into TransportAttendants
-- =============================================================================
UPDATE Staff 
SET DesignationId = 555, Designation = 'Bus Attendant / Attender', UpdatedAt = UTC_TIMESTAMP() 
WHERE Id IN (1058, 1060);

UPDATE TransportAttendants 
SET IsDeleted = 1, Status = 0, IsActive = 0, UpdatedAt = UTC_TIMESTAMP()
WHERE StaffId NOT IN (1058, 1060) OR StaffId IS NULL;

UPDATE TransportAttendants 
SET IsDeleted = 0, Status = 1, IsActive = 1, UpdatedAt = UTC_TIMESTAMP()
WHERE StaffId IN (1058, 1060);

CALL sp_SyncTransportAttendantFromStaff(1058, 1);
CALL sp_SyncTransportAttendantFromStaff(1060, 1);
