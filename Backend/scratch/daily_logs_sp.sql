DELIMITER //

DROP PROCEDURE IF EXISTS sp_GetStudentDailyPunchLogs //

CREATE PROCEDURE sp_GetStudentDailyPunchLogs(
    IN p_StudentId INT,
    IN p_Month INT,
    IN p_Year INT
)
BEGIN
    SELECT 
        DATE(a.AttendanceDate) AS AttendanceDate,
        DATE_FORMAT(a.AttendanceDate, '%h:%i %p') AS CheckInTime,
        NULL AS CheckOutTime,
        a.Remarks AS DailyPunchRemarks,
        CASE a.Status
            WHEN 1 THEN 'Present'
            WHEN 2 THEN 'Absent'
            WHEN 3 THEN 'Late'
            WHEN 4 THEN 'Leave/HalfDay'
            WHEN 5 THEN 'Holiday'
            ELSE 'Unknown'
        END AS Status
    FROM Attendances a
    WHERE a.StudentId = p_StudentId 
      AND MONTH(a.AttendanceDate) = p_Month 
      AND YEAR(a.AttendanceDate) = p_Year
      AND a.IsActive = 1
    ORDER BY a.AttendanceDate DESC;
END //

DELIMITER ;
