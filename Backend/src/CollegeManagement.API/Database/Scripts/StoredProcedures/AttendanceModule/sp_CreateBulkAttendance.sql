DROP PROCEDURE IF EXISTS sp_CreateBulkAttendance;

DELIMITER $$

-- =================================================================================
-- Author:      Senior MySQL 8 Database Architect
-- Purpose:     Bulk insert attendance records for a specific session using a JSON array.
-- =================================================================================
CREATE PROCEDURE sp_CreateBulkAttendance(
    IN p_AttendanceSessionId INT,
    IN p_AttendanceJson JSON
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Validate that the attendance session exists and is active
    IF NOT EXISTS (
        SELECT 1 
        FROM attendance_sessions 
        WHERE AttendanceSessionId = p_AttendanceSessionId 
          AND IsActive = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Active Attendance Session was not found.';
    END IF;

    -- Validate that none of the students already have marked attendance for this session
    IF EXISTS (
        SELECT 1 
        FROM attendances 
        WHERE AttendanceSessionId = p_AttendanceSessionId 
          AND StudentId IN (
              SELECT StudentId 
              FROM JSON_TABLE(
                  p_AttendanceJson,
                  '$[*]' COLUMNS(StudentId INT PATH '$.StudentId')
              ) jt
          )
          AND IsActive = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Duplicate attendance detected: One or more students already have marked attendance for this session.';
    END IF;

    START TRANSACTION;

    INSERT INTO attendances (
        AttendanceSessionId, 
        StudentId, 
        Status, 
        Remarks, 
        IsActive, 
        CreatedAt
    )
    SELECT 
        p_AttendanceSessionId, 
        jt.StudentId, 
        jt.Status, 
        jt.Remarks, 
        IFNULL(jt.IsActive, 1), 
        UTC_TIMESTAMP()
    FROM JSON_TABLE(
        p_AttendanceJson,
        '$[*]' COLUMNS(
            StudentId INT PATH '$.StudentId',
            Status TINYINT PATH '$.Status',
            Remarks VARCHAR(500) PATH '$.Remarks',
            IsActive BOOLEAN PATH '$.IsActive'
        )
    ) jt;

    COMMIT;

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DELIMITER ;
