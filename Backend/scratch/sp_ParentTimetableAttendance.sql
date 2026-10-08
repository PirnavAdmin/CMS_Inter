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
            t.PeriodId, p.PeriodName, p.PeriodNumber,
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

DROP PROCEDURE IF EXISTS sp_GetStudentAttendances //

CREATE PROCEDURE sp_GetStudentAttendances(IN p_StudentId INT, IN p_AcademicYearId INT)
BEGIN
    DECLARE v_AcademicYearId INT;
    DECLARE v_StartDate DATE;
    DECLARE v_EndDate DATE;

    IF p_AcademicYearId <= 0 THEN
        SELECT ay.AcademicYearId, ay.StartDate, ay.EndDate 
        INTO v_AcademicYearId, v_StartDate, v_EndDate
        FROM Students s
        JOIN AcademicYears ay ON ay.BoardId = s.BoardId AND ay.IsActive = 1
        WHERE s.StudentId = p_StudentId LIMIT 1;
    ELSE
        SET v_AcademicYearId = p_AcademicYearId;
        SELECT StartDate, EndDate INTO v_StartDate, v_EndDate FROM AcademicYears WHERE AcademicYearId = v_AcademicYearId LIMIT 1;
    END IF;

    SELECT v_AcademicYearId AS AcademicYearId, v_StartDate AS StartDate, v_EndDate AS EndDate;

    SELECT 
        AttendanceId, AttendanceSessionId, StudentId, SubjectId, GroupId, SectionId, AcademicYearId, AcademicLevelId, BoardId, FacultyId, Session, ModifiedByUserId, ModifiedAt, AttendanceDate, Status, Remarks, IsActive, CreatedAt, UpdatedAt
    FROM Attendances
    WHERE StudentId = p_StudentId 
      AND AcademicYearId = v_AcademicYearId
      AND IsActive = 1
    ORDER BY AttendanceDate ASC;
END //

DELIMITER ;
