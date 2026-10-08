CREATE PROCEDURE `sp_GetDashboardStudentAttendance_New`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_ViewBy VARCHAR(50),
    IN p_CampusId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_TotalStudents INT DEFAULT 0;
    DECLARE v_Present INT DEFAULT 0;
    DECLARE v_Absent INT DEFAULT 0;
    DECLARE v_HalfDay INT DEFAULT 0;
    DECLARE v_AttPct DECIMAL(5,1) DEFAULT 0.0;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());

    -- Create a temporary table to store the precalculated statuses per student
    DROP TEMPORARY TABLE IF EXISTS TempStudentStatuses;
    CREATE TEMPORARY TABLE TempStudentStatuses (
        StudentId INT,
        AcademicLevelId INT,
        GroupId INT,
        SectionId INT,
        AggregatedStatus VARCHAR(20)
    );

    INSERT INTO TempStudentStatuses
    SELECT 
        s.StudentId,
        s.AcademicLevelId,
        s.GroupId,
        s.SectionId,
        CASE 
            WHEN MAX(CASE WHEN a.Session = 1 THEN a.Status END) = 1 AND MAX(CASE WHEN a.Session = 2 THEN a.Status END) = 1 THEN 'Present'
            WHEN (MAX(CASE WHEN a.Session = 1 THEN a.Status END) = 1 AND MAX(CASE WHEN a.Session = 2 THEN a.Status END) = 2) OR 
                 (MAX(CASE WHEN a.Session = 1 THEN a.Status END) = 2 AND MAX(CASE WHEN a.Session = 2 THEN a.Status END) = 1) THEN 'HalfDay'
            WHEN MAX(CASE WHEN a.Session = 1 THEN a.Status END) = 4 OR MAX(CASE WHEN a.Session = 2 THEN a.Status END) = 4 THEN 'HalfDay'
            WHEN MAX(CASE WHEN a.Session = 1 THEN a.Status END) = 1 OR MAX(CASE WHEN a.Session = 2 THEN a.Status END) = 1 THEN 'Present'
            WHEN MAX(CASE WHEN a.Session = 1 THEN a.Status END) = 2 OR MAX(CASE WHEN a.Session = 2 THEN a.Status END) = 2 THEN 'Absent'
            ELSE 'Unmarked'
        END AS AggregatedStatus
    FROM Students s
    LEFT JOIN Attendances a ON s.StudentId = a.StudentId 
        AND (
            DATE(a.AttendanceDate) = v_TargetDate
            OR DATE(DATE_ADD(a.AttendanceDate, INTERVAL 330 MINUTE)) = v_TargetDate
            OR DATE(a.CreatedAt) = v_TargetDate
            OR DATE(DATE_ADD(a.CreatedAt, INTERVAL 330 MINUTE)) = v_TargetDate
        )
        AND (a.IsActive = 1 OR a.IsActive IS NULL)
    WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
      AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
    GROUP BY s.StudentId, s.AcademicLevelId, s.GroupId, s.SectionId;

    SELECT COUNT(*) INTO v_TotalStudents FROM TempStudentStatuses;

    IF v_TotalStudents = 0 THEN
        -- If no active students, check admissions table just like original logic
        SELECT COUNT(*) INTO v_TotalStudents
        FROM `StudentAdmissions` sa
        WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId)
          AND (p_CampusId IS NULL OR sa.CampusId = p_CampusId);
    END IF;

    SELECT 
        SUM(CASE WHEN AggregatedStatus = 'Present' THEN 1 ELSE 0 END),
        SUM(CASE WHEN AggregatedStatus = 'HalfDay' THEN 1 ELSE 0 END)
    INTO v_Present, v_HalfDay
    FROM TempStudentStatuses;

    SET v_Present = COALESCE(v_Present, 0);
    SET v_HalfDay = COALESCE(v_HalfDay, 0);

    -- Ensure Absent is accurately representing unmarked + explicitly absent according to the dashboard logic requirement
    SET v_Absent = GREATEST(0, v_TotalStudents - v_Present - v_HalfDay);

    IF v_TotalStudents > 0 THEN
        SET v_AttPct = ROUND((v_Present + 0.5 * v_HalfDay) * 100.0 / v_TotalStudents, 1);
    END IF;

    -- Return overall summary
    SELECT 
        p_ViewBy AS ViewBy,
        v_TotalStudents AS TotalStudents,
        v_Present AS Present,
        v_Absent AS Absent,
        v_HalfDay AS HalfDayCount,
        v_AttPct AS AttendancePercentage,
        DATE_FORMAT(v_TargetDate, '%Y-%m-%d') AS AttendanceDate,
        DATE_FORMAT(NOW(), '%d %b %Y, %h:%i %p') AS LastUpdatedFormatted;

    -- Return grouped summary if view is specified
    IF p_ViewBy = 'Academic Level' THEN
        SELECT 
            COALESCE(al.Name, 'Unknown') AS CategoryName,
            COUNT(t.StudentId) AS TotalStudents,
            SUM(CASE WHEN t.AggregatedStatus = 'Present' THEN 1 ELSE 0 END) AS Present,
            GREATEST(0, COUNT(t.StudentId) - SUM(CASE WHEN t.AggregatedStatus = 'Present' THEN 1 ELSE 0 END) - SUM(CASE WHEN t.AggregatedStatus = 'HalfDay' THEN 1 ELSE 0 END)) AS Absent,
            SUM(CASE WHEN t.AggregatedStatus = 'HalfDay' THEN 1 ELSE 0 END) AS HalfDay
        FROM TempStudentStatuses t
        LEFT JOIN `AcademicLevels` al ON t.AcademicLevelId = al.Id
        GROUP BY al.Name;
    ELSEIF p_ViewBy = 'Group' THEN
        SELECT 
            COALESCE(g.Name, 'Unknown') AS CategoryName,
            COUNT(t.StudentId) AS TotalStudents,
            SUM(CASE WHEN t.AggregatedStatus = 'Present' THEN 1 ELSE 0 END) AS Present,
            GREATEST(0, COUNT(t.StudentId) - SUM(CASE WHEN t.AggregatedStatus = 'Present' THEN 1 ELSE 0 END) - SUM(CASE WHEN t.AggregatedStatus = 'HalfDay' THEN 1 ELSE 0 END)) AS Absent,
            SUM(CASE WHEN t.AggregatedStatus = 'HalfDay' THEN 1 ELSE 0 END) AS HalfDay
        FROM TempStudentStatuses t
        LEFT JOIN `Groups` g ON t.GroupId = g.Id
        GROUP BY g.Name;
    ELSEIF p_ViewBy = 'Section' THEN
        SELECT 
            COALESCE(sec.Name, 'Unknown') AS CategoryName,
            COUNT(t.StudentId) AS TotalStudents,
            SUM(CASE WHEN t.AggregatedStatus = 'Present' THEN 1 ELSE 0 END) AS Present,
            GREATEST(0, COUNT(t.StudentId) - SUM(CASE WHEN t.AggregatedStatus = 'Present' THEN 1 ELSE 0 END) - SUM(CASE WHEN t.AggregatedStatus = 'HalfDay' THEN 1 ELSE 0 END)) AS Absent,
            SUM(CASE WHEN t.AggregatedStatus = 'HalfDay' THEN 1 ELSE 0 END) AS HalfDay
        FROM TempStudentStatuses t
        LEFT JOIN `Sections` sec ON t.SectionId = sec.Id
        GROUP BY sec.Name;
    ELSE
        SELECT 'All Students' AS CategoryName, 
               v_TotalStudents AS TotalStudents, 
               v_Present AS Present, 
               v_Absent AS Absent, 
               v_HalfDay AS HalfDay;
    END IF;

    DROP TEMPORARY TABLE IF EXISTS TempStudentStatuses;
END
