DROP PROCEDURE IF EXISTS sp_CreateAttendance;

DELIMITER $$

-- =================================================================================
-- Author:      Senior MySQL 8 Database Architect
-- Purpose:     Create a new student attendance record in the attendances table.
-- =================================================================================
CREATE PROCEDURE sp_CreateAttendance(
    IN p_AttendanceSessionId INT,
    IN p_StudentId INT,
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

    INSERT INTO attendances (
        AttendanceSessionId, 
        StudentId, 
        Status, 
        Remarks,
        IsActive,
        CreatedAt
    ) VALUES (
        p_AttendanceSessionId, 
        p_StudentId, 
        p_Status, 
        p_Remarks, 
        1, -- IsActive defaults to true on creation
        UTC_TIMESTAMP()
    );

    COMMIT;

    SELECT LAST_INSERT_ID() AS AttendanceId;
END$$

DELIMITER ;
