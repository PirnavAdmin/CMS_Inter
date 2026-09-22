DROP PROCEDURE IF EXISTS sp_UpdateAttendance;

DELIMITER $$

-- =================================================================================
-- Author:      Senior MySQL 8 Database Architect
-- Purpose:     Update an existing student attendance status and remarks.
-- =================================================================================
CREATE PROCEDURE sp_UpdateAttendance(
    IN p_AttendanceId INT,
    IN p_Status TINYINT,
    IN p_Remarks VARCHAR(500)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    UPDATE attendances
    SET Status = p_Status,
        Remarks = p_Remarks,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE AttendanceId = p_AttendanceId;

    COMMIT;

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DELIMITER ;
