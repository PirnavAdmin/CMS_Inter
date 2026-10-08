DELIMITER //

DROP PROCEDURE IF EXISTS sp_GetStudentTimetable //

CREATE PROCEDURE sp_GetStudentTimetable(IN p_StudentId INT)
BEGIN
    DECLARE v_SectionId INT;
    
    SELECT SectionId INTO v_SectionId FROM Students WHERE StudentId = p_StudentId AND IsActive = 1 LIMIT 1;
    
    IF v_SectionId IS NOT NULL THEN
        SELECT 
            t.Id, 
            t.CampusId, 
            t.BoardId, b.BoardCode, b.BoardName,
            t.AcademicLevelId, al.LevelCode, al.LevelName,
            t.AcademicYearId, ay.AcademicYearName,
            t.GroupId, g.GroupCode, g.GroupName,
            t.SectionId, sec.SectionName,
            t.DayOfWeek, 
            CASE t.DayOfWeek
                WHEN 1 THEN 'Monday'
                WHEN 2 THEN 'Tuesday'
                WHEN 3 THEN 'Wednesday'
                WHEN 4 THEN 'Thursday'
                WHEN 5 THEN 'Friday'
                WHEN 6 THEN 'Saturday'
                WHEN 0 THEN 'Sunday'
                ELSE ''
            END AS DayName,
            t.PeriodId, p.PeriodName, p.DisplayOrder AS PeriodNumber,
            t.StartTime, t.EndTime, t.IsBreak,
            t.SubjectId, sub.SubjectCode, sub.SubjectName,
            t.StaffId, st.EmployeeId AS StaffEmployeeId, CONCAT(st.FirstName, ' ', st.LastName) AS StaffName,
            t.RoomId, r.RoomName
        FROM Timetables t
        LEFT JOIN Boards b ON t.BoardId = b.BoardId
        LEFT JOIN AcademicLevels al ON t.AcademicLevelId = al.AcademicLevelId
        LEFT JOIN AcademicYears ay ON t.AcademicYearId = ay.AcademicYearId
        LEFT JOIN Groups g ON t.GroupId = g.GroupId
        LEFT JOIN Sections sec ON t.SectionId = sec.SectionId
        LEFT JOIN Periods p ON t.PeriodId = p.PeriodId
        LEFT JOIN Subjects sub ON t.SubjectId = sub.SubjectId
        LEFT JOIN Staffs st ON t.StaffId = st.Id
        LEFT JOIN Rooms r ON t.RoomId = r.Id
        WHERE t.SectionId = v_SectionId 
          AND t.IsPublished = 1
          AND t.IsActive = 1
        ORDER BY t.DayOfWeek, t.StartTime;
    END IF;
END //

DELIMITER ;
