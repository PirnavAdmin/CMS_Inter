DROP PROCEDURE IF EXISTS sp_ChangeAttendanceStatus;

DELIMITER $$

-- =================================================================================
-- Author:      Senior MySQL 8 Database Architect
-- Purpose:     Changes the active/inactive status of an attendance record.
-- Input:       p_AttendanceId - Unique identifier of the attendance record
--              p_IsActive - The target active status flag (1 = Active, 0 = Inactive)
-- Return:      The number of affected rows.
-- =================================================================================
CREATE PROCEDURE sp_ChangeAttendanceStatus(
    IN p_AttendanceId INT,
    IN p_IsActive BOOLEAN
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    UPDATE attendances
    SET IsActive = p_IsActive,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE AttendanceId = p_AttendanceId;

    COMMIT;

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DELIMITER ;
