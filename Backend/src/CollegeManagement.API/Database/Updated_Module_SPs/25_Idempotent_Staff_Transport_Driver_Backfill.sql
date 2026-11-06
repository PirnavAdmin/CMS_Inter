-- =============================================================================
-- Migration: Idempotent Staff -> Transport Driver Backfill
-- Purpose:
--   1. Ensures any Non-Teaching Staff designated as Driver (including MNT0046)
--      has the canonical assigned role 'Driver' (RoleId = 12).
--   2. Calls sp_SyncTransportDriverFromStaff to idempotently provision/reactivate
--      TransportDrivers profiles for all eligible Driver-role staff.
--   3. Deactivates any transport profiles linked to non-Driver roles.
-- =============================================================================

DELIMITER //

DROP PROCEDURE IF EXISTS `sp_RunDriverBackfill`//
CREATE PROCEDURE `sp_RunDriverBackfill`()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_StaffId INT;
    DECLARE cur_drivers CURSOR FOR 
        SELECT s.Id
        FROM Staff s
        INNER JOIN Users u ON s.Id = u.StaffId
        INNER JOIN Roles r ON u.RoleId = r.RoleId AND r.RoleName = 'Driver'
        WHERE s.IsDeleted = 0;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- 1. Backfill MNT0046: Update Users.RoleId to 12 (Driver) if designation is Driver
    UPDATE Users u
    INNER JOIN Staff s ON u.StaffId = s.Id
    SET u.RoleId = 12, u.UpdatedAt = UTC_TIMESTAMP()
    WHERE (s.EmployeeId = 'MNT0046' OR (s.FirstName LIKE '%sir%' AND s.LastName LIKE '%r%'))
      AND s.IsDeleted = 0
      AND (u.RoleId <> 12 OR u.RoleId IS NULL);

    -- 2. Loop through all eligible Driver staff and sync their profiles
    OPEN cur_drivers;
    read_loop: LOOP
        FETCH cur_drivers INTO v_StaffId;
        IF done THEN
            LEAVE read_loop;
        END IF;

        CALL sp_SyncTransportDriverFromStaff(v_StaffId, 1);
    END LOOP;
    CLOSE cur_drivers;

    -- 3. Deactivate any transport profiles belonging to staff whose role is NOT Driver
    SET done = FALSE;
    BEGIN
        DECLARE v_NonDriverStaffId INT;
        DECLARE cur_nondrivers CURSOR FOR
            SELECT DISTINCT td.StaffId
            FROM TransportDrivers td
            INNER JOIN Staff s ON td.StaffId = s.Id
            LEFT JOIN Users u ON s.Id = u.StaffId
            LEFT JOIN Roles r ON u.RoleId = r.RoleId
            WHERE td.IsDeleted = 0
              AND (r.RoleName IS NULL OR r.RoleName <> 'Driver' OR s.IsDeleted = 1);
        DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

        OPEN cur_nondrivers;
        nondriver_loop: LOOP
            FETCH cur_nondrivers INTO v_NonDriverStaffId;
            IF done THEN
                LEAVE nondriver_loop;
            END IF;

            CALL sp_SyncTransportDriverFromStaff(v_NonDriverStaffId, 0);
        END LOOP;
        CLOSE cur_nondrivers;
    END;

END//

DELIMITER ;

-- Execute backfill
CALL sp_RunDriverBackfill();

-- Clean up helper procedure
DROP PROCEDURE IF EXISTS `sp_RunDriverBackfill`;
