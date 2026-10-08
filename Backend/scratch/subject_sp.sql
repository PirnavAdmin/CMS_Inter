DELIMITER //

DROP PROCEDURE IF EXISTS sp_GetStudentSubjectAttendance //

CREATE PROCEDURE sp_GetStudentSubjectAttendance(IN p_StudentId INT)
BEGIN
    SELECT 
        a.SubjectId,
        sub.SubjectName,
        a.FacultyId,
        CONCAT(st.FirstName, ' ', st.LastName) AS FacultyName,
        COUNT(a.AttendanceId) AS TotalClassesConducted,
        SUM(CASE WHEN a.Status = 1 OR a.Status = 3 THEN 1 ELSE 0 END) AS ClassesAttended,
        CASE 
            WHEN COUNT(a.AttendanceId) > 0 THEN 
                ROUND((SUM(CASE WHEN a.Status = 1 OR a.Status = 3 THEN 1 ELSE 0 END) / COUNT(a.AttendanceId)) * 100, 2)
            ELSE 0 
        END AS AttendancePercentage
    FROM Attendances a
    LEFT JOIN Subjects sub ON a.SubjectId = sub.SubjectId
    LEFT JOIN Staffs st ON a.FacultyId = st.Id
    WHERE a.StudentId = p_StudentId AND a.IsActive = 1 AND a.SubjectId IS NOT NULL
    GROUP BY a.SubjectId, sub.SubjectName, a.FacultyId, st.FirstName, st.LastName;
END //

DELIMITER ;
