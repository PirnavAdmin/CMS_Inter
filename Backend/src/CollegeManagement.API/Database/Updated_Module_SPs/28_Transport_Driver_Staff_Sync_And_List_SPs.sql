-- =============================================================================
-- Migration 28: Transport Driver Staff Synchronization and Listing SPs
-- Purpose:
--   1. sp_SyncTransportDriverFromStaff: Transactionally creates or updates
--      TransportDrivers record from StaffId. Preserves vehicle assignments when
--      a staff member is no longer a driver (does not delete assigned drivers).
--   2. sp_GetTransportDrivers: Returns Result Set 1 (TotalCount) and Result Set 2 (Items)
--      using IDENTICAL filters and joins. Includes active driver staff, scopes by CampusId,
--      and avoids excluding valid drivers when Users/Roles are unlinked.
--   3. sp_GetTransportDriversById: Retrieves driver by DriverId or StaffId with Campus info.
--   4. Idempotent backfill of all existing active driver staff records.
-- =============================================================================

-- Clean up any empty license strings to NULL to respect UX_TransportDrivers_LicenseNumber unique constraint
UPDATE TransportDrivers SET LicenseNo = NULL WHERE TRIM(COALESCE(LicenseNo, '')) = '';

DELIMITER //

DROP PROCEDURE IF EXISTS `sp_SyncTransportDriverFromStaff`//
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
    DECLARE v_AssignedVehicleId BIGINT DEFAULT NULL;

    -- Fetch current staff details
    SELECT 
        TRIM(CONCAT(COALESCE(FirstName, ''), ' ', COALESCE(LastName, ''))),
        EmployeeId,
        Mobile,
        NULLIF(TRIM(AlternateMobile), ''),
        NULLIF(TRIM(Email), ''),
        NULLIF(TRIM(DrivingLicenseNumber), ''),
        DrivingLicenseExpiryDate,
        COALESCE(DrivingExperienceYears, 0),
        NULLIF(TRIM(CurrentAddress), ''),
        NULLIF(TRIM(BloodGroup), '')
    INTO 
        v_DriverName,
        v_EmployeeId,
        v_Mobile,
        v_AlternateMobile,
        v_Email,
        v_LicenseNo,
        v_LicenseExpiry,
        v_Experience,
        v_Address,
        v_BloodGroup
    FROM Staff
    WHERE Id = p_StaffId
    LIMIT 1;

    -- Find existing TransportDrivers profile by StaffId OR EmployeeId
    SELECT DriverId, AssignedVehicleId 
    INTO v_ExistingDriverId, v_AssignedVehicleId
    FROM TransportDrivers 
    WHERE (StaffId = p_StaffId OR (EmployeeId = v_EmployeeId AND v_EmployeeId IS NOT NULL AND v_EmployeeId <> ''))
    ORDER BY (StaffId = p_StaffId) DESC, DriverId DESC 
    LIMIT 1;

    IF p_IsDriverRole = 1 THEN
        -- Mark Staff.IsDriver = 1
        UPDATE Staff 
        SET IsDriver = 1, UpdatedAt = UTC_TIMESTAMP() 
        WHERE Id = p_StaffId;

        IF v_ExistingDriverId IS NOT NULL THEN
            -- Reactivate and sync existing record
            UPDATE TransportDrivers
            SET 
                StaffId = p_StaffId,
                DriverName = v_DriverName,
                EmployeeId = v_EmployeeId,
                MobileNo = v_Mobile,
                AlternateMobileNo = COALESCE(v_AlternateMobile, AlternateMobileNo),
                Email = COALESCE(v_Email, Email),
                LicenseNo = COALESCE(v_LicenseNo, LicenseNo),
                LicenseExpiry = COALESCE(v_LicenseExpiry, LicenseExpiry),
                Experience = COALESCE(v_Experience, Experience, 0),
                Address = COALESCE(v_Address, Address),
                BloodGroup = COALESCE(v_BloodGroup, BloodGroup),
                Status = 1,
                IsActive = 1,
                IsDeleted = 0,
                UpdatedAt = UTC_TIMESTAMP()
            WHERE DriverId = v_ExistingDriverId;

            -- Deduplicate: soft delete any older duplicates for this staff member
            UPDATE TransportDrivers
            SET IsDeleted = 1, Status = 0, IsActive = 0, UpdatedAt = UTC_TIMESTAMP()
            WHERE (StaffId = p_StaffId OR (EmployeeId = v_EmployeeId AND v_EmployeeId IS NOT NULL AND v_EmployeeId <> '')) AND DriverId <> v_ExistingDriverId;

            SELECT v_ExistingDriverId AS DriverId;
        ELSE
            -- Insert new TransportDrivers profile
            INSERT INTO TransportDrivers (
                StaffId, DriverName, EmployeeId, MobileNo, AlternateMobileNo, Email,
                LicenseNo, LicenseExpiry, Address, BloodGroup, EmergencyContactName,
                EmergencyContactNumber, Experience, Status, IsActive, IsDeleted, CreatedAt
            ) VALUES (
                p_StaffId, v_DriverName, v_EmployeeId, v_Mobile, v_AlternateMobile, v_Email,
                v_LicenseNo, v_LicenseExpiry, v_Address, v_BloodGroup, '',
                '', v_Experience, 1, 1, 0, UTC_TIMESTAMP()
            );

            SELECT LAST_INSERT_ID() AS DriverId;
        END IF;

    ELSE
        -- Staff is no longer active driver
        UPDATE Staff 
        SET IsDriver = 0, UpdatedAt = UTC_TIMESTAMP() 
        WHERE Id = p_StaffId;

        IF v_ExistingDriverId IS NOT NULL THEN
            -- Check for vehicle assignments before changing status or deleting
            IF v_AssignedVehicleId IS NOT NULL AND v_AssignedVehicleId > 0 THEN
                -- Do NOT delete or deactivate assigned driver automatically
                UPDATE TransportDrivers 
                SET StaffId = p_StaffId, UpdatedAt = UTC_TIMESTAMP() 
                WHERE DriverId = v_ExistingDriverId;
            ELSEIF EXISTS (
                SELECT 1 FROM TransportVehicleAssignments 
                WHERE DriverId = v_ExistingDriverId AND IsDeleted = 0 AND (Status = 'Active' OR Status = 1)
            ) THEN
                -- Do NOT delete or deactivate assigned driver automatically
                UPDATE TransportDrivers 
                SET StaffId = p_StaffId, UpdatedAt = UTC_TIMESTAMP() 
                WHERE DriverId = v_ExistingDriverId;
            ELSE
                -- Safely deactivate unassigned driver
                UPDATE TransportDrivers
                SET Status = 0, IsActive = 0, UpdatedAt = UTC_TIMESTAMP()
                WHERE DriverId = v_ExistingDriverId;
            END IF;
        END IF;

        SELECT 0 AS DriverId;
    END IF;
END//

DROP PROCEDURE IF EXISTS `sp_GetTransportDrivers`//
CREATE PROCEDURE `sp_GetTransportDrivers`(
    IN p_Search VARCHAR(100),
    IN p_Status TINYINT,
    IN p_CampusId INT,
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
            COALESCE(s.CampusId, 1) AS CampusId,
            s.Id AS CampusCheckStaffId,
            COALESCE(d.Status, 1) AS Status
        FROM Staff s
        LEFT JOIN TransportDrivers d ON (d.StaffId = s.Id OR (d.EmployeeId = s.EmployeeId AND d.EmployeeId IS NOT NULL AND d.EmployeeId <> '')) AND d.IsDeleted = 0
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
            1 AS CampusId,
            NULL AS CampusCheckStaffId,
            COALESCE(d.Status, 1) AS Status
        FROM TransportDrivers d
        WHERE d.IsDeleted = 0
          AND (d.StaffId IS NULL OR NOT EXISTS (SELECT 1 FROM Staff s2 WHERE s2.Id = d.StaffId AND s2.IsDeleted = 0))
          AND (d.EmployeeId IS NULL OR d.EmployeeId = '' OR NOT EXISTS (SELECT 1 FROM Staff s3 WHERE s3.EmployeeId = d.EmployeeId AND s3.IsDeleted = 0))
    ) drv
    WHERE (
        p_CampusId IS NULL OR p_CampusId <= 0 
        OR drv.CampusId = p_CampusId 
        OR (drv.CampusCheckStaffId IS NOT NULL AND EXISTS (
            SELECT 1 FROM StaffCampusAssignments sca 
            WHERE sca.StaffId = drv.CampusCheckStaffId AND sca.CampusId = p_CampusId AND (sca.IsActive = 1 OR sca.IsActive IS NULL)
        ))
    )
    AND (
        p_Status IS NULL 
        OR (p_Status = 1 AND drv.Status = 1) 
        OR (p_Status = 0 AND drv.Status = 0)
    )
    AND (
        p_Search IS NULL OR p_Search = ''
        OR LOWER(COALESCE(drv.DriverName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
        OR LOWER(COALESCE(drv.EmployeeId, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
        OR LOWER(COALESCE(drv.LicenseNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
        OR LOWER(COALESCE(drv.MobileNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
    );

    -- Result Set 2: Paged Items
    SELECT 
        drv.Id,
        drv.DriverId,
        drv.StaffId,
        drv.EmployeeId,
        drv.DriverName,
        drv.MobileNumber,
        drv.AlternateMobileNumber,
        drv.Email,
        drv.LicenseNumber,
        drv.LicenseExpiryDate,
        drv.Address,
        drv.BloodGroup,
        drv.EmergencyContactName,
        drv.EmergencyContactNumber,
        drv.ExperienceYears,
        drv.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN drv.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        drv.CreatedAt,
        drv.CampusId,
        c.CampusName
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
            d.EmergencyContactName,
            d.EmergencyContactNumber,
            COALESCE(s.DrivingExperienceYears, d.Experience, 0) AS ExperienceYears,
            d.AssignedVehicleId,
            d.CreatedAt,
            COALESCE(s.CampusId, 1) AS CampusId,
            s.Id AS CampusCheckStaffId,
            COALESCE(d.Status, 1) AS Status
        FROM Staff s
        LEFT JOIN TransportDrivers d ON (d.StaffId = s.Id OR (d.EmployeeId = s.EmployeeId AND d.EmployeeId IS NOT NULL AND d.EmployeeId <> '')) AND d.IsDeleted = 0
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
              OR (LOWER(COALESCE(dept.DepartmentName, '')) LIKE '%transport%' AND LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%driver%')
              OR r.RoleName = 'Driver'
          )
          AND (
              (r.RoleName IS NULL OR r.RoleName <> 'Transport Manager' OR s.IsDriver = 1)
              AND LOWER(COALESCE(desig.Name, s.Designation, '')) NOT LIKE '%transport manager%'
          )

        UNION ALL

        SELECT 
            d.DriverId AS Id,
            d.DriverId,
            d.StaffId,
            d.EmployeeId,
            d.DriverName,
            d.MobileNo AS MobileNumber,
            d.AlternateMobileNo AS AlternateMobileNumber,
            d.Email,
            d.LicenseNo AS LicenseNumber,
            DATE_FORMAT(d.LicenseExpiry, '%Y-%m-%d') AS LicenseExpiryDate,
            d.Address,
            d.BloodGroup,
            d.EmergencyContactName,
            d.EmergencyContactNumber,
            COALESCE(d.Experience, 0) AS ExperienceYears,
            d.AssignedVehicleId,
            d.CreatedAt,
            1 AS CampusId,
            NULL AS CampusCheckStaffId,
            COALESCE(d.Status, 1) AS Status
        FROM TransportDrivers d
        WHERE d.IsDeleted = 0
          AND (d.StaffId IS NULL OR NOT EXISTS (SELECT 1 FROM Staff s2 WHERE s2.Id = d.StaffId AND s2.IsDeleted = 0))
          AND (d.EmployeeId IS NULL OR d.EmployeeId = '' OR NOT EXISTS (SELECT 1 FROM Staff s3 WHERE s3.EmployeeId = d.EmployeeId AND s3.IsDeleted = 0))
    ) drv
    LEFT JOIN TransportVehicles v ON drv.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Campuses c ON drv.CampusId = c.CampusId
    WHERE (
        p_CampusId IS NULL OR p_CampusId <= 0 
        OR drv.CampusId = p_CampusId 
        OR (drv.CampusCheckStaffId IS NOT NULL AND EXISTS (
            SELECT 1 FROM StaffCampusAssignments sca 
            WHERE sca.StaffId = drv.CampusCheckStaffId AND sca.CampusId = p_CampusId AND (sca.IsActive = 1 OR sca.IsActive IS NULL)
        ))
    )
    AND (
        p_Status IS NULL 
        OR (p_Status = 1 AND drv.Status = 1) 
        OR (p_Status = 0 AND drv.Status = 0)
    )
    AND (
        p_Search IS NULL OR p_Search = ''
        OR LOWER(COALESCE(drv.DriverName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
        OR LOWER(COALESCE(drv.EmployeeId, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
        OR LOWER(COALESCE(drv.LicenseNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
        OR LOWER(COALESCE(drv.MobileNumber, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
    )
    ORDER BY drv.DriverId ASC
    LIMIT v_PageSize OFFSET v_Offset;
END//

DROP PROCEDURE IF EXISTS `sp_GetTransportDriversById`//
CREATE PROCEDURE `sp_GetTransportDriversById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        drv.Id,
        drv.DriverId,
        drv.StaffId,
        drv.EmployeeId,
        drv.DriverName,
        drv.MobileNumber,
        drv.AlternateMobileNumber,
        drv.Email,
        drv.LicenseNumber,
        drv.LicenseExpiryDate,
        drv.Address,
        drv.BloodGroup,
        drv.EmergencyContactName,
        drv.EmergencyContactNumber,
        drv.ExperienceYears,
        drv.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN drv.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        drv.CreatedAt,
        drv.CampusId,
        c.CampusName
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
            d.EmergencyContactName,
            d.EmergencyContactNumber,
            COALESCE(s.DrivingExperienceYears, d.Experience, 0) AS ExperienceYears,
            d.AssignedVehicleId,
            d.CreatedAt,
            COALESCE(s.CampusId, 1) AS CampusId,
            COALESCE(d.Status, 1) AS Status
        FROM Staff s
        LEFT JOIN TransportDrivers d ON (d.StaffId = s.Id OR (d.EmployeeId = s.EmployeeId AND d.EmployeeId IS NOT NULL AND d.EmployeeId <> '')) AND d.IsDeleted = 0
        WHERE s.IsDeleted = 0 AND (s.Id = p_Id OR d.DriverId = p_Id)

        UNION ALL

        SELECT 
            d.DriverId AS Id,
            d.DriverId,
            d.StaffId,
            d.EmployeeId,
            d.DriverName,
            d.MobileNo AS MobileNumber,
            d.AlternateMobileNo AS AlternateMobileNumber,
            d.Email,
            d.LicenseNo AS LicenseNumber,
            DATE_FORMAT(d.LicenseExpiry, '%Y-%m-%d') AS LicenseExpiryDate,
            d.Address,
            d.BloodGroup,
            d.EmergencyContactName,
            d.EmergencyContactNumber,
            COALESCE(d.Experience, 0) AS ExperienceYears,
            d.AssignedVehicleId,
            d.CreatedAt,
            1 AS CampusId,
            COALESCE(d.Status, 1) AS Status
        FROM TransportDrivers d
        WHERE d.IsDeleted = 0 AND d.DriverId = p_Id
          AND (d.StaffId IS NULL OR NOT EXISTS (SELECT 1 FROM Staff s2 WHERE s2.Id = d.StaffId AND s2.IsDeleted = 0))
    ) drv
    LEFT JOIN TransportVehicles v ON drv.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN Campuses c ON drv.CampusId = c.CampusId
    LIMIT 1;
END//

-- Backfill procedure to safely sync all driver staff
DROP PROCEDURE IF EXISTS `sp_BackfillDriverStaff`//
CREATE PROCEDURE `sp_BackfillDriverStaff`()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur_staff_id INT;
    DECLARE cur_staff CURSOR FOR
        SELECT DISTINCT s.Id
        FROM Staff s
        LEFT JOIN Departments dept ON s.DepartmentId = dept.DepartmentId
        LEFT JOIN Designations desig ON s.DesignationId = desig.Id
        LEFT JOIN Users u ON s.Id = u.StaffId
        LEFT JOIN Roles r ON u.RoleId = r.RoleId
        WHERE s.IsDeleted = 0
          AND (
              s.IsDriver = 1
              OR LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%driver%'
              OR r.RoleName = 'Driver'
              OR (LOWER(COALESCE(dept.DepartmentName, '')) LIKE '%transport%' AND LOWER(COALESCE(desig.Name, s.Designation, '')) LIKE '%driver%')
          );
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur_staff;
    read_loop: LOOP
        FETCH cur_staff INTO cur_staff_id;
        IF done THEN
            LEAVE read_loop;
        END IF;
        CALL sp_SyncTransportDriverFromStaff(cur_staff_id, 1);
    END LOOP;
    CLOSE cur_staff;
END//

CALL sp_BackfillDriverStaff()//
DROP PROCEDURE IF EXISTS `sp_BackfillDriverStaff`//

DELIMITER ;
