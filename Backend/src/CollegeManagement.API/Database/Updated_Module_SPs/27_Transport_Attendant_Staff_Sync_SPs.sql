-- =============================================================================
-- Migration Script: 27_Transport_Attendant_Staff_Sync_SPs.sql
-- Description: Automatic Staff -> Transport Attendant synchronization, idempotent backfill,
--              and campus-isolated attendant querying.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PROCEDURE: sp_SyncTransportAttendantFromStaff
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_SyncTransportAttendantFromStaff`;
DELIMITER //
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
            TRIM(CONCAT(FirstName, ' ', LastName)),
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
                BranchName = COALESCE(v_CampusName, BranchName),
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
        -- Staff role changed away from Attendant: preserve assignment history, soft-delete transport attendant profile
        UPDATE TransportAttendants 
        SET IsDeleted = 1, Status = 0, IsActive = 0, UpdatedAt = UTC_TIMESTAMP() 
        WHERE StaffId = p_StaffId;

        SELECT 0 AS AttendantId;
    END IF;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 2. PROCEDURE: sp_GetTransportAttendants
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportAttendants`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportAttendants`(
    IN p_Search VARCHAR(100),
    IN p_Status TINYINT,
    IN p_CampusId INT
)
BEGIN
    -- Return eligible Attendant staff members linked to TransportAttendants
    SELECT 
        a.AttendantId,
        s.Id AS StaffId,
        COALESCE(s.EmployeeId, a.EmployeeId) AS EmployeeId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), a.AttendantName) AS AttendantName,
        COALESCE(s.Mobile, a.MobileNumber) AS MobileNumber,
        COALESCE(s.AlternateMobile, a.AlternateMobileNumber) AS AlternateMobileNumber,
        COALESCE(s.Gender, a.Gender, 'Female') AS Gender,
        COALESCE(c.CampusName, a.BranchName) AS BranchName,
        COALESCE(s.CurrentAddress, a.Address) AS Address,
        COALESCE(s.BloodGroup, a.BloodGroup) AS BloodGroup,
        a.EmergencyContactName,
        a.EmergencyContactNumber,
        a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        COALESCE(s.CampusId, 1) AS CampusId,
        COALESCE(c.CampusName, a.BranchName, 'Main Campus (HQ)') AS CampusName,
        a.CreatedAt
    FROM Staff s
    INNER JOIN Users u ON s.Id = u.StaffId AND (u.IsActive = 1 OR u.IsActive IS NULL)
    INNER JOIN Roles r ON u.RoleId = r.RoleId AND r.RoleName IN ('Attendant', 'Bus Attendant')
    INNER JOIN TransportAttendants a ON a.AttendantId = (
        SELECT MAX(a2.AttendantId) 
        FROM TransportAttendants a2 
        WHERE (a2.StaffId = s.Id OR (a2.StaffId IS NULL AND a2.EmployeeId = s.EmployeeId)) AND a2.IsDeleted = 0
    )
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    WHERE s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId OR EXISTS (SELECT 1 FROM StaffCampusAssignments sca WHERE sca.StaffId = s.Id AND sca.CampusId = p_CampusId))
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (
          p_Search IS NULL OR p_Search = '' 
          OR LOWER(COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), a.AttendantName)) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(s.EmployeeId, a.EmployeeId)) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(s.Mobile, a.MobileNumber)) LIKE CONCAT('%', LOWER(p_Search), '%')
      )

    UNION ALL

    -- Include any legacy attendants created directly without StaffId
    SELECT 
        a.AttendantId,
        a.StaffId,
        a.EmployeeId,
        a.AttendantName,
        a.MobileNumber,
        a.AlternateMobileNumber,
        COALESCE(a.Gender, 'Female') AS Gender,
        a.BranchName,
        a.Address,
        a.BloodGroup,
        a.EmergencyContactName,
        a.EmergencyContactNumber,
        a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        COALESCE(c.CampusId, 1) AS CampusId,
        COALESCE(c.CampusName, a.BranchName, 'Main Campus (HQ)') AS CampusName,
        a.CreatedAt
    FROM TransportAttendants a
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Campuses c ON a.BranchName = c.CampusName
    WHERE a.IsDeleted = 0 
      AND a.StaffId IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM Staff s2 
          INNER JOIN Users u2 ON s2.Id = u2.StaffId AND (u2.IsActive = 1 OR u2.IsActive IS NULL)
          INNER JOIN Roles r2 ON u2.RoleId = r2.RoleId AND r2.RoleName IN ('Attendant', 'Bus Attendant')
          WHERE s2.EmployeeId = a.EmployeeId
      )
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR c.CampusId = p_CampusId)
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (
          p_Search IS NULL OR p_Search = '' 
          OR LOWER(a.AttendantName) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(a.EmployeeId) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(a.MobileNumber) LIKE CONCAT('%', LOWER(p_Search), '%')
      )
    ORDER BY AttendantId ASC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 3. PROCEDURE: sp_GetTransportAttendantById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportAttendantById`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportAttendantById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        a.AttendantId,
        COALESCE(a.StaffId, s.Id) AS StaffId,
        COALESCE(s.EmployeeId, a.EmployeeId) AS EmployeeId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), a.AttendantName) AS AttendantName,
        COALESCE(s.Mobile, a.MobileNumber) AS MobileNumber,
        COALESCE(s.AlternateMobile, a.AlternateMobileNumber) AS AlternateMobileNumber,
        COALESCE(s.Gender, a.Gender, 'Female') AS Gender,
        COALESCE(c.CampusName, a.BranchName) AS BranchName,
        COALESCE(s.CurrentAddress, a.Address) AS Address,
        COALESCE(s.BloodGroup, a.BloodGroup) AS BloodGroup,
        a.EmergencyContactName,
        a.EmergencyContactNumber,
        a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        COALESCE(s.CampusId, c.CampusId, 1) AS CampusId,
        COALESCE(c.CampusName, a.BranchName, 'Main Campus (HQ)') AS CampusName,
        a.CreatedAt
    FROM TransportAttendants a
    LEFT JOIN Staff s ON (a.StaffId = s.Id OR a.EmployeeId = s.EmployeeId) AND s.IsDeleted = 0
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Campuses c ON COALESCE(s.CampusId, 1) = c.CampusId
    WHERE (a.AttendantId = p_Id OR a.StaffId = p_Id OR s.Id = p_Id)
      AND a.IsDeleted = 0
    ORDER BY a.AttendantId DESC
    LIMIT 1;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. PROCEDURE: sp_GetTransportAttendantByIdOrName
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTransportAttendantByIdOrName`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportAttendantByIdOrName`(
    IN p_SearchId BIGINT,
    IN p_SearchStr VARCHAR(100)
)
BEGIN
    SELECT 
        a.AttendantId,
        COALESCE(a.StaffId, s.Id) AS StaffId,
        COALESCE(s.EmployeeId, a.EmployeeId) AS EmployeeId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), a.AttendantName) AS AttendantName,
        COALESCE(s.Mobile, a.MobileNumber) AS MobileNumber,
        COALESCE(s.AlternateMobile, a.AlternateMobileNumber) AS AlternateMobileNumber,
        COALESCE(s.Gender, a.Gender, 'Female') AS Gender,
        COALESCE(c.CampusName, a.BranchName) AS BranchName,
        COALESCE(s.CurrentAddress, a.Address) AS Address,
        COALESCE(s.BloodGroup, a.BloodGroup) AS BloodGroup,
        a.EmergencyContactName,
        a.EmergencyContactNumber,
        a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        COALESCE(s.CampusId, c.CampusId, 1) AS CampusId,
        COALESCE(c.CampusName, a.BranchName, 'Main Campus (HQ)') AS CampusName,
        a.CreatedAt
    FROM TransportAttendants a
    LEFT JOIN Staff s ON (a.StaffId = s.Id OR a.EmployeeId = s.EmployeeId) AND s.IsDeleted = 0
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Campuses c ON COALESCE(s.CampusId, 1) = c.CampusId
    WHERE a.IsDeleted = 0
      AND (
          a.AttendantId = p_SearchId 
          OR a.StaffId = p_SearchId 
          OR s.Id = p_SearchId 
          OR LOWER(a.AttendantName) = LOWER(p_SearchStr) 
          OR LOWER(s.EmployeeId) = LOWER(p_SearchStr)
          OR LOWER(a.EmployeeId) = LOWER(p_SearchStr)
          OR LOWER(a.MobileNumber) = LOWER(p_SearchStr)
      )
    ORDER BY a.AttendantId DESC
    LIMIT 1;
END //
DELIMITER ;
