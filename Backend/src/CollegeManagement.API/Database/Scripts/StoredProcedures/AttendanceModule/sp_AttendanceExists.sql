DROP PROCEDURE IF EXISTS sp_AttendanceExists;

DELIMITER $$

-- =================================================================================
-- Author:      Senior MySQL 8 Database Architect
-- Purpose:     Check if an active attendance record already exists for a student in a specific session.
-- =================================================================================
CREATE PROCEDURE sp_AttendanceExists(
    IN p_StudentId INT,
    IN p_AttendanceSessionId INT
)
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM attendances 
        WHERE StudentId = p_StudentId 
          AND AttendanceSessionId = p_AttendanceSessionId
          AND IsActive = 1
    ) AS AttendanceExists;
END$$

DELIMITER ;
