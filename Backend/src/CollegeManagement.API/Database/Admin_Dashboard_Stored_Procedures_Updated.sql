-- ====================================================================================================
-- COLLEGE MANAGEMENT SYSTEM - ADMIN PORTAL DASHBOARD STORED PROCEDURES (UPDATED & VERIFIED)
-- Database Engine: MySQL 8.0 / MariaDB
-- Description: Production-ready SPs for Admin Portal Dashboard (KPIs, Charts, Trends, Attendance, Holidays)
-- ====================================================================================================

DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 1. sp_GetDashboardKPIs / sp_GetDashboardSummary (Top Counter Cards)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardKPIs;
DROP PROCEDURE IF EXISTS sp_GetDashboardSummary;

DELIMITER //

CREATE PROCEDURE sp_GetDashboardKPIs(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_EffectiveAcademicYearId INT DEFAULT NULL;
    DECLARE v_TotalStudents INT DEFAULT 0;
    DECLARE v_TeachingStaff INT DEFAULT 0;
    DECLARE v_NonTeachingStaff INT DEFAULT 0;
    DECLARE v_TotalGroups INT DEFAULT 0;
    DECLARE v_TotalSections INT DEFAULT 0;
    DECLARE v_AcademicYearName VARCHAR(100) DEFAULT '';
    DECLARE v_UpcomingExams INT DEFAULT 0;
    DECLARE v_TotalAdmissions INT DEFAULT 0;
    DECLARE v_TotalSubjects INT DEFAULT 0;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());

    -- Resolve Effective Academic Year
    IF p_AcademicYearId IS NOT NULL THEN
        SET v_EffectiveAcademicYearId = p_AcademicYearId;
    ELSE
        SELECT AcademicYearId INTO v_EffectiveAcademicYearId
        FROM `AcademicYears`
        WHERE (IsActive = 1 OR IsActive IS NULL)
          AND (p_BoardId IS NULL OR BoardId = p_BoardId)
          AND (StartDate <= v_TargetDate AND EndDate >= v_TargetDate)
        ORDER BY StartDate DESC LIMIT 1;

        IF v_EffectiveAcademicYearId IS NULL THEN
            SELECT AcademicYearId INTO v_EffectiveAcademicYearId
            FROM `AcademicYears`
            WHERE (IsActive = 1 OR IsActive IS NULL)
              AND (p_BoardId IS NULL OR BoardId = p_BoardId)
            ORDER BY StartDate DESC LIMIT 1;
        END IF;
    END IF;

    -- 1. Total Students from StudentAdmissions (fallback to Students table)
    SELECT COUNT(*) INTO v_TotalStudents
    FROM `StudentAdmissions` sa
    WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
      AND (v_EffectiveAcademicYearId IS NULL OR sa.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId);

    IF v_TotalStudents = 0 THEN
        SELECT COUNT(*) INTO v_TotalStudents
        FROM `Students` s
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (v_EffectiveAcademicYearId IS NULL OR s.AcademicYearId = v_EffectiveAcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);
    END IF;

    -- 2. Teaching Staff Count (Active, non-deleted, filtered by Board)
    SELECT COUNT(*) INTO v_TeachingStaff
    FROM `Staff` st
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId OR st.BoardId IS NULL OR st.BoardId = 0)
      AND (
          st.StaffType = 'Teaching' 
          OR st.StaffType = 'Both' 
          OR st.StaffType IS NULL 
          OR LOWER(st.StaffType) NOT LIKE '%non%'
      );

    -- 3. Non-Teaching Staff Count
    SELECT COUNT(*) INTO v_NonTeachingStaff
    FROM `Staff` st
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId OR st.BoardId IS NULL OR st.BoardId = 0)
      AND (LOWER(st.StaffType) LIKE '%non%');

    -- 4. Total Groups Count
    SELECT COUNT(*) INTO v_TotalGroups
    FROM `Groups` g
    WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
      AND (v_EffectiveAcademicYearId IS NULL OR g.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR g.BoardId = p_BoardId);

    -- 5. Total Sections Count
    SELECT COUNT(*) INTO v_TotalSections
    FROM `Sections` sec
    WHERE (sec.IsActive = 1 OR sec.IsActive IS NULL)
      AND (v_EffectiveAcademicYearId IS NULL OR sec.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR sec.BoardId = p_BoardId);

    -- 6. Academic Year Name
    SELECT AcademicYearName INTO v_AcademicYearName
    FROM `AcademicYears`
    WHERE (IsActive = 1 OR IsActive IS NULL)
      AND (v_EffectiveAcademicYearId IS NULL OR AcademicYearId = v_EffectiveAcademicYearId)
    ORDER BY StartDate DESC LIMIT 1;

    -- 7. Upcoming Exams
    SELECT COUNT(*) INTO v_UpcomingExams
    FROM `Examinations` e
    WHERE (e.IsActive = 1 OR e.IsActive IS NULL)
      AND e.EndDate >= v_TargetDate
      AND (v_EffectiveAcademicYearId IS NULL OR e.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR e.BoardId = p_BoardId);

    -- 8. Total Subjects
    SELECT COUNT(*) INTO v_TotalSubjects
    FROM `Subjects` sub
    WHERE (sub.IsActive = 1 OR sub.IsActive IS NULL)
      AND (p_BoardId IS NULL OR sub.BoardId = p_BoardId);

    -- Return final summary
    SELECT 
        v_TotalStudents AS TotalStudents,
        v_TeachingStaff AS TeachingStaff,
        v_NonTeachingStaff AS NonTeachingStaff,
        v_TotalGroups AS TotalGroups,
        v_TotalSections AS TotalSections,
        v_TotalStudents AS Admissions,
        0.0 AS StudentsVsLastYearPercentage,
        0 AS LastYearTotalStudents,
        0.0 AS TeachingStaffVsLastYearPercentage,
        0 AS LastYearTeachingStaff,
        0.0 AS NonTeachingStaffVsLastYearPercentage,
        0 AS LastYearNonTeachingStaff,
        0.0 AS GroupsVsLastYearPercentage,
        0 AS LastYearTotalGroups,
        0.0 AS SectionsVsLastYearPercentage,
        0 AS LastYearTotalSections,
        COALESCE(v_AcademicYearName, '2026-2027') AS AcademicYear,
        v_TotalSubjects AS TotalSubjects,
        v_UpcomingExams AS UpcomingExams;
END //

CREATE PROCEDURE sp_GetDashboardSummary(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE
)
BEGIN
    CALL sp_GetDashboardKPIs(p_BoardId, p_AcademicYearId, p_TargetDate);
END //

DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 2. sp_GetDashboardStudentsOverview (Month-wise Joining & Demographics)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardStudentsOverview;

DELIMITER //

CREATE PROCEDURE sp_GetDashboardStudentsOverview(
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    DECLARE v_AdmissionsCount INT DEFAULT 0;

    SELECT COUNT(*) INTO v_AdmissionsCount
    FROM `StudentAdmissions` sa
    WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId);

    IF v_AdmissionsCount > 0 THEN
        -- Result Set 1: Summary Counts & Gender Distribution
        SELECT 
            COUNT(*) AS TotalStudents,
            SUM(CASE WHEN sa.IsActive = 1 OR sa.IsActive IS NULL THEN 1 ELSE 0 END) AS ActiveStudents,
            SUM(CASE WHEN sa.IsActive = 0 THEN 1 ELSE 0 END) AS InactiveStudents,
            SUM(CASE WHEN LOWER(COALESCE(sa.Gender, '')) IN ('male', 'm', 'boy', 'boys') THEN 1 ELSE 0 END) AS MaleStudents,
            SUM(CASE WHEN LOWER(COALESCE(sa.Gender, '')) IN ('female', 'f', 'girl', 'girls') THEN 1 ELSE 0 END) AS FemaleStudents,
            SUM(CASE WHEN LOWER(COALESCE(sa.Gender, '')) NOT IN ('male', 'm', 'boy', 'boys', 'female', 'f', 'girl', 'girls') THEN 1 ELSE 0 END) AS OtherStudents,
            ROUND(COALESCE((SUM(CASE WHEN LOWER(COALESCE(sa.Gender, '')) IN ('male', 'm', 'boy', 'boys') THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 0.0), 1) AS MalePercentage,
            ROUND(COALESCE((SUM(CASE WHEN LOWER(COALESCE(sa.Gender, '')) IN ('female', 'f', 'girl', 'girls') THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 0.0), 1) AS FemalePercentage,
            SUM(CASE WHEN sa.AcademicLevelId = 1 THEN 1 ELSE 0 END) AS FirstYearStudents,
            SUM(CASE WHEN sa.AcademicLevelId = 2 THEN 1 ELSE 0 END) AS SecondYearStudents
        FROM `StudentAdmissions` sa
        WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId);

        -- Result Set 2: Monthly Admissions Trend (Chronological)
        SELECT 
            DATE_FORMAT(COALESCE(sa.AdmissionDate, sa.CreatedAt), '%b %Y') AS Period,
            MIN(COALESCE(sa.AdmissionDate, sa.CreatedAt)) AS SortDate,
            COUNT(*) AS StudentsJoined
        FROM `StudentAdmissions` sa
        WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId)
          AND (sa.AdmissionDate IS NOT NULL OR sa.CreatedAt IS NOT NULL)
        GROUP BY DATE_FORMAT(COALESCE(sa.AdmissionDate, sa.CreatedAt), '%b %Y')
        ORDER BY SortDate ASC;
    ELSE
        -- Fallback from Students Table
        SELECT 
            COUNT(*) AS TotalStudents,
            SUM(CASE WHEN s.IsActive = 1 OR s.IsActive IS NULL THEN 1 ELSE 0 END) AS ActiveStudents,
            0 AS InactiveStudents,
            SUM(CASE WHEN LOWER(COALESCE(s.Gender, '')) IN ('male', 'm', 'boy', 'boys') THEN 1 ELSE 0 END) AS MaleStudents,
            SUM(CASE WHEN LOWER(COALESCE(s.Gender, '')) IN ('female', 'f', 'girl', 'girls') THEN 1 ELSE 0 END) AS FemaleStudents,
            0 AS OtherStudents,
            ROUND(COALESCE((SUM(CASE WHEN LOWER(COALESCE(s.Gender, '')) IN ('male', 'm', 'boy', 'boys') THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 0.0), 1) AS MalePercentage,
            ROUND(COALESCE((SUM(CASE WHEN LOWER(COALESCE(s.Gender, '')) IN ('female', 'f', 'girl', 'girls') THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 0.0), 1) AS FemalePercentage,
            SUM(CASE WHEN s.AcademicLevelId = 1 THEN 1 ELSE 0 END) AS FirstYearStudents,
            SUM(CASE WHEN s.AcademicLevelId = 2 THEN 1 ELSE 0 END) AS SecondYearStudents
        FROM `Students` s
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

        SELECT 
            DATE_FORMAT(COALESCE(s.AdmissionDate, s.CreatedAt), '%b %Y') AS Period,
            MIN(COALESCE(s.AdmissionDate, s.CreatedAt)) AS SortDate,
            COUNT(*) AS StudentsJoined
        FROM `Students` s
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
          AND (s.AdmissionDate IS NOT NULL OR s.CreatedAt IS NOT NULL)
        GROUP BY DATE_FORMAT(COALESCE(s.AdmissionDate, s.CreatedAt), '%b %Y')
        ORDER BY SortDate ASC;
    END IF;
END //

DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 3. sp_GetDashboardGroupDistribution (Students by Group)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardGroupDistribution;

DELIMITER //

CREATE PROCEDURE sp_GetDashboardGroupDistribution(
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    DECLARE v_AdmissionsCount INT DEFAULT 0;

    SELECT COUNT(*) INTO v_AdmissionsCount
    FROM `StudentAdmissions` sa
    WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId);

    IF v_AdmissionsCount > 0 THEN
        SELECT 
            MIN(g.GroupId) AS GroupId,
            COALESCE(NULLIF(g.GroupCode, ''), g.GroupName) AS GroupCode,
            COALESCE(g.GroupName, g.GroupCode) AS GroupName,
            COUNT(sa.AdmissionId) AS TotalStudents
        FROM `Groups` g
        LEFT JOIN `StudentAdmissions` sa ON sa.GroupId = g.GroupId 
                               AND (sa.IsActive = 1 OR sa.IsActive IS NULL) 
                               AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId) 
                               AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId)
        WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
          AND (p_BoardId IS NULL OR g.BoardId IS NULL OR g.BoardId = p_BoardId)
          AND (p_AcademicYearId IS NULL OR g.AcademicYearId IS NULL OR g.AcademicYearId = p_AcademicYearId)
        GROUP BY COALESCE(NULLIF(g.GroupCode, ''), g.GroupName), COALESCE(g.GroupName, g.GroupCode)
        ORDER BY TotalStudents DESC, GroupName ASC;
    ELSE
        SELECT 
            MIN(g.GroupId) AS GroupId,
            COALESCE(NULLIF(g.GroupCode, ''), g.GroupName) AS GroupCode,
            COALESCE(g.GroupName, g.GroupCode) AS GroupName,
            COUNT(s.StudentId) AS TotalStudents
        FROM `Groups` g
        LEFT JOIN `Students` s ON s.GroupId = g.GroupId 
                               AND (s.IsActive = 1 OR s.IsActive IS NULL) 
                               AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId) 
                               AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
        WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
          AND (p_BoardId IS NULL OR g.BoardId IS NULL OR g.BoardId = p_BoardId)
          AND (p_AcademicYearId IS NULL OR g.AcademicYearId IS NULL OR g.AcademicYearId = p_AcademicYearId)
        GROUP BY COALESCE(NULLIF(g.GroupCode, ''), g.GroupName), COALESCE(g.GroupName, g.GroupCode)
        ORDER BY TotalStudents DESC, GroupName ASC;
    END IF;
END //

DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 4. sp_GetDashboardStudentAttendance (Today's Student Attendance & Category Breakdown)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardStudentAttendance;

DELIMITER //

CREATE PROCEDURE sp_GetDashboardStudentAttendance(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_ViewBy VARCHAR(50)
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_TotalStudents INT DEFAULT 0;
    DECLARE v_Present INT DEFAULT 0;
    DECLARE v_Absent INT DEFAULT 0;
    DECLARE v_HalfDay INT DEFAULT 0;
    DECLARE v_AttPct DECIMAL(5,1) DEFAULT 0.0;
    DECLARE v_LatestAttTime DATETIME DEFAULT NULL;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());

    -- Total Students
    SELECT COUNT(*) INTO v_TotalStudents
    FROM `Students` s
    WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

    IF v_TotalStudents = 0 THEN
        SELECT COUNT(*) INTO v_TotalStudents
        FROM `StudentAdmissions` sa
        WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId);
    END IF;

    -- Present & Half-Day counts
    SELECT 
        COALESCE(SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN a.Status IN (3, 4) THEN 1 ELSE 0 END), 0)
    INTO v_Present, v_HalfDay
    FROM `Attendances` a
    INNER JOIN `Students` s ON a.StudentId = s.StudentId
    WHERE (
        DATE(a.AttendanceDate) = v_TargetDate
        OR DATE(DATE_ADD(a.AttendanceDate, INTERVAL 330 MINUTE)) = v_TargetDate
        OR DATE(a.CreatedAt) = v_TargetDate
        OR DATE(DATE_ADD(a.CreatedAt, INTERVAL 330 MINUTE)) = v_TargetDate
    )
      AND (a.IsActive = 1 OR a.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

    SELECT MAX(COALESCE(a.UpdatedAt, a.CreatedAt)) INTO v_LatestAttTime
    FROM `Attendances` a
    INNER JOIN `Students` s ON a.StudentId = s.StudentId
    WHERE (
        DATE(a.AttendanceDate) = v_TargetDate
        OR DATE(DATE_ADD(a.AttendanceDate, INTERVAL 330 MINUTE)) = v_TargetDate
        OR DATE(a.CreatedAt) = v_TargetDate
        OR DATE(DATE_ADD(a.CreatedAt, INTERVAL 330 MINUTE)) = v_TargetDate
    )
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

    IF v_LatestAttTime IS NULL AND v_Present > 0 THEN
        SELECT MAX(COALESCE(a.UpdatedAt, a.CreatedAt)) INTO v_LatestAttTime
        FROM `Attendances` a
        INNER JOIN `Students` s ON a.StudentId = s.StudentId
        WHERE (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);
    END IF;

    SET v_Absent = GREATEST(0, v_TotalStudents - v_Present - v_HalfDay);

    IF v_TotalStudents > 0 THEN
        SET v_AttPct = ROUND(((v_Present + 0.5 * v_HalfDay) * 100.0) / v_TotalStudents, 1);
    ELSE
        SET v_AttPct = 0.0;
    END IF;

    -- Result Set 1: Overall Summary
    SELECT 
        COALESCE(p_ViewBy, 'Overall') AS ViewBy,
        v_TotalStudents AS TotalStudents,
        v_Present AS Present,
        v_Absent AS Absent,
        v_HalfDay AS HalfDay,
        v_HalfDay AS Late,
        v_AttPct AS AttendancePercentage,
        v_LatestAttTime AS LastUpdatedTime;

    -- Result Set 2: Category Breakdown
    IF LOWER(COALESCE(p_ViewBy, '')) IN ('academic level', 'level', 'academic-level') THEN
        SELECT 
            COALESCE(al.LevelName, 'General') AS CategoryName,
            COUNT(DISTINCT s.StudentId) AS TotalStudents,
            COALESCE(SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END), 0) AS Present,
            GREATEST(0, COUNT(DISTINCT s.StudentId) - COALESCE(SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END), 0)) AS Absent,
            COALESCE(SUM(CASE WHEN a.Status IN (3, 4) THEN 1 ELSE 0 END), 0) AS HalfDay,
            0.0 AS AttendancePercentage
        FROM `Students` s
        LEFT JOIN `AcademicLevels` al ON s.AcademicLevelId = al.AcademicLevelId
        LEFT JOIN `Attendances` a ON a.StudentId = s.StudentId AND DATE(a.AttendanceDate) = v_TargetDate
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
        GROUP BY COALESCE(al.LevelName, 'General')
        ORDER BY TotalStudents DESC;
    ELSEIF LOWER(COALESCE(p_ViewBy, '')) = 'section' THEN
        SELECT 
            COALESCE(sec.SectionName, 'General') AS CategoryName,
            COUNT(DISTINCT s.StudentId) AS TotalStudents,
            COALESCE(SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END), 0) AS Present,
            GREATEST(0, COUNT(DISTINCT s.StudentId) - COALESCE(SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END), 0)) AS Absent,
            COALESCE(SUM(CASE WHEN a.Status IN (3, 4) THEN 1 ELSE 0 END), 0) AS HalfDay,
            0.0 AS AttendancePercentage
        FROM `Students` s
        LEFT JOIN `Sections` sec ON s.SectionId = sec.SectionId
        LEFT JOIN `Attendances` a ON a.StudentId = s.StudentId AND DATE(a.AttendanceDate) = v_TargetDate
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
        GROUP BY COALESCE(sec.SectionName, 'General')
        ORDER BY TotalStudents DESC;
    ELSE
        SELECT 
            COALESCE(g.GroupName, 'General') AS CategoryName,
            COUNT(DISTINCT s.StudentId) AS TotalStudents,
            COALESCE(SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END), 0) AS Present,
            GREATEST(0, COUNT(DISTINCT s.StudentId) - COALESCE(SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END), 0)) AS Absent,
            COALESCE(SUM(CASE WHEN a.Status IN (3, 4) THEN 1 ELSE 0 END), 0) AS HalfDay,
            0.0 AS AttendancePercentage
        FROM `Students` s
        LEFT JOIN `Groups` g ON s.GroupId = g.GroupId
        LEFT JOIN `Attendances` a ON a.StudentId = s.StudentId AND DATE(a.AttendanceDate) = v_TargetDate
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
        GROUP BY COALESCE(g.GroupName, 'General')
        ORDER BY TotalStudents DESC;
    END IF;
END //

DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 5. sp_GetDashboardStaffAttendance (Staff Attendance & Leave Counts)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardStaffAttendance;

DELIMITER //

CREATE PROCEDURE sp_GetDashboardStaffAttendance(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_StaffType VARCHAR(50)
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_StaffType VARCHAR(50);
    DECLARE v_FilteredTotal INT DEFAULT 0;
    DECLARE v_Present INT DEFAULT 0;
    DECLARE v_Absent INT DEFAULT 0;
    DECLARE v_Late INT DEFAULT 0;
    DECLARE v_OnLeave INT DEFAULT 0;
    DECLARE v_AttendancePct DECIMAL(5,2) DEFAULT 0.0;
    DECLARE v_TeachingCount INT DEFAULT 0;
    DECLARE v_NonTeachingCount INT DEFAULT 0;
    DECLARE v_LatestAttTime DATETIME DEFAULT NULL;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());
    SET v_StaffType = COALESCE(p_StaffType, 'All Staff');

    -- Teaching & Non-Teaching split
    SELECT 
        COUNT(DISTINCT CASE WHEN (st.StaffType = 'Teaching' OR st.StaffType = 'Both' OR st.StaffType IS NULL OR LOWER(st.StaffType) NOT LIKE '%non%') THEN st.Id END),
        COUNT(DISTINCT CASE WHEN LOWER(st.StaffType) LIKE '%non%' THEN st.Id END)
    INTO v_TeachingCount, v_NonTeachingCount
    FROM `Staff` st
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId OR st.BoardId IS NULL OR st.BoardId = 0);

    -- Attendance status joined with active staff
    SELECT 
        COUNT(DISTINCT st.Id),
        COUNT(DISTINCT CASE WHEN att.Status IN (1, 2) OR att.Status = 'Present' THEN st.Id END),
        COUNT(DISTINCT CASE WHEN att.Status = 3 OR att.Status = 'Late' THEN st.Id END),
        COUNT(DISTINCT CASE WHEN slr.StaffLeaveRequestId IS NOT NULL THEN st.Id END)
    INTO v_FilteredTotal, v_Present, v_Late, v_OnLeave
    FROM `Staff` st
    LEFT JOIN (
        SELECT sa2.FacultyId, sa2.Status
        FROM `StaffAttendances` sa2
        JOIN `StaffAttendanceSessions` sas2 ON sa2.StaffSessionId = sas2.StaffSessionId
        WHERE DATE(sas2.AttendanceDate) = v_TargetDate
          AND (sa2.IsActive = 1 OR sa2.IsActive IS NULL)
          AND (sas2.IsActive = 1 OR sas2.IsActive IS NULL)
    ) att ON st.Id = att.FacultyId
    LEFT JOIN `StaffLeaveRequests` slr ON (
        slr.StaffId = st.Id 
        AND (slr.IsActive = 1 OR slr.IsActive IS NULL)
        AND slr.Status = 'Approved' 
        AND DATE(slr.StartDate) <= v_TargetDate 
        AND DATE(slr.EndDate) >= v_TargetDate
    )
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId OR st.BoardId IS NULL OR st.BoardId = 0)
      AND (
          LOWER(v_StaffType) IN ('all', 'all staff')
          OR (LOWER(v_StaffType) IN ('teaching', 'teaching staff') AND (st.StaffType = 'Teaching' OR st.StaffType = 'Both' OR st.StaffType IS NULL OR LOWER(st.StaffType) NOT LIKE '%non%'))
          OR (LOWER(v_StaffType) IN ('non-teaching', 'non-teaching staff', 'nonteaching', 'nonteaching staff') AND (LOWER(st.StaffType) LIKE '%non%'))
      );

    -- Absent calculation
    SET v_Absent = GREATEST(0, v_FilteredTotal - v_Present - v_Late - v_OnLeave);

    IF v_FilteredTotal > 0 THEN
        SET v_AttendancePct = LEAST(100.0, ROUND(((v_Present + 0.5 * v_Late) * 100.0) / v_FilteredTotal, 1));
    ELSE
        SET v_AttendancePct = 0.0;
    END IF;

    SELECT MAX(COALESCE(att.UpdatedAt, att.CreatedAt))
    INTO v_LatestAttTime
    FROM `StaffAttendances` att
    JOIN `StaffAttendanceSessions` sas ON att.StaffSessionId = sas.StaffSessionId
    WHERE (
        DATE(sas.AttendanceDate) = v_TargetDate
        OR DATE(DATE_ADD(sas.AttendanceDate, INTERVAL 330 MINUTE)) = v_TargetDate
        OR DATE(att.CreatedAt) = v_TargetDate
        OR DATE(DATE_ADD(att.CreatedAt, INTERVAL 330 MINUTE)) = v_TargetDate
    )
      AND (att.IsActive = 1 OR att.IsActive IS NULL);

    IF v_LatestAttTime IS NULL AND v_Present > 0 THEN
        SELECT MAX(COALESCE(att.UpdatedAt, att.CreatedAt))
        INTO v_LatestAttTime
        FROM `StaffAttendances` att
        WHERE (att.IsActive = 1 OR att.IsActive IS NULL);
    END IF;

    SELECT 
        v_StaffType AS StaffType,
        v_FilteredTotal AS TotalStaff,
        v_FilteredTotal AS Total,
        v_Present AS Present,
        v_Absent AS Absent,
        v_Late AS Late,
        v_OnLeave AS OnLeave,
        v_AttendancePct AS AttendancePercentage,
        v_TeachingCount AS TeachingCount,
        v_NonTeachingCount AS NonTeachingCount,
        v_LatestAttTime AS LastUpdatedTime;
END //

DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 6. sp_GetDashboardUpcomingHolidays (Upcoming Holidays with Badges)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardUpcomingHolidays;

DELIMITER //

CREATE PROCEDURE sp_GetDashboardUpcomingHolidays(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_Limit INT
)
BEGIN
    DECLARE v_Limit INT DEFAULT 20;
    IF p_Limit IS NOT NULL AND p_Limit > 0 THEN
        SET v_Limit = p_Limit;
    END IF;

    SELECT 
        h.Id,
        h.HolidayCode,
        h.AcademicYearId,
        h.BoardId,
        h.HolidayName,
        COALESCE(h.HolidayType, 'Festival Holiday') AS HolidayType,
        COALESCE(h.AppliesTo, 'All Students & Staff') AS AppliesTo,
        COALESCE(h.DateType, 'Single Day') AS DateType,
        h.StartDate,
        h.EndDate,
        DATEDIFF(h.StartDate, CURDATE()) AS DaysRemaining,
        CASE 
            WHEN CURDATE() BETWEEN h.StartDate AND h.EndDate THEN 'Ongoing'
            WHEN DATEDIFF(h.StartDate, CURDATE()) = 0 THEN 'Today'
            WHEN DATEDIFF(h.StartDate, CURDATE()) = 1 THEN 'Tomorrow'
            WHEN DATEDIFF(h.StartDate, CURDATE()) > 1 THEN CONCAT('In ', DATEDIFF(h.StartDate, CURDATE()), ' Days')
            ELSE 'Upcoming'
        END AS CountdownText,
        COALESCE(h.Status, 'Active') AS Status,
        h.Description
    FROM `Holidays` h
    WHERE (h.IsDeleted = 0 OR h.IsDeleted IS NULL)
      AND (h.Status = 'Active' OR h.Status IS NULL)
      AND (h.EndDate >= CURDATE() OR h.StartDate >= CURDATE())
      AND (p_AcademicYearId IS NULL OR h.AcademicYearId = p_AcademicYearId OR h.AcademicYearId IS NULL)
      AND (p_BoardId IS NULL OR h.BoardId = p_BoardId OR h.BoardId IS NULL)
    ORDER BY h.StartDate ASC
    LIMIT v_Limit;
END //

DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 7. sp_GetDashboardUpcomingExaminations (Upcoming Exams)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardUpcomingExaminations;

DELIMITER //

CREATE PROCEDURE sp_GetDashboardUpcomingExaminations(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_Limit INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_Limit INT DEFAULT 6;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());
    IF p_Limit IS NOT NULL AND p_Limit > 0 THEN
        SET v_Limit = p_Limit;
    END IF;

    SELECT 
        e.ExamId AS Id,
        e.ExamCode,
        e.ExamName,
        e.AcademicYearId,
        e.BoardId,
        e.StartDate,
        e.EndDate,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        COALESCE(g.GroupName, '') AS GroupName,
        CASE 
            WHEN v_TargetDate BETWEEN e.StartDate AND e.EndDate THEN 'Ongoing'
            WHEN DATEDIFF(e.StartDate, v_TargetDate) = 0 THEN 'Today'
            WHEN DATEDIFF(e.StartDate, v_TargetDate) = 1 THEN 'Tomorrow'
            WHEN DATEDIFF(e.StartDate, v_TargetDate) > 1 THEN CONCAT(DATEDIFF(e.StartDate, v_TargetDate), ' Days')
            ELSE 'Scheduled'
        END AS DaysRemainingText,
        COALESCE(e.Status, 'Scheduled') AS Status
    FROM `Examinations` e
    LEFT JOIN `AcademicLevels` al ON e.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON e.GroupId = g.GroupId
    WHERE (e.IsActive = 1 OR e.IsActive IS NULL)
      AND e.EndDate >= v_TargetDate
      AND LOWER(COALESCE(e.Status, '')) NOT IN ('completed', 'cancelled', 'deleted')
      AND (p_AcademicYearId IS NULL OR e.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR e.BoardId = p_BoardId)
    ORDER BY e.StartDate ASC
    LIMIT v_Limit;
END //

DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 8. sp_GetDashboardFilters (Academic Years & Boards)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardFilters;

DELIMITER //

CREATE PROCEDURE sp_GetDashboardFilters()
BEGIN
    -- Result Set 1: Academic Years
    SELECT 
        AcademicYearId AS Id,
        BoardId,
        AcademicYearName AS Name,
        AcademicYearName AS Code,
        IsActive,
        CASE WHEN (StartDate <= CURDATE() AND EndDate >= CURDATE()) THEN 1 ELSE 0 END AS IsCurrent
    FROM `AcademicYears`
    WHERE IsActive = 1
    ORDER BY StartDate DESC;

    -- Result Set 2: Boards
    SELECT 
        BoardId AS Id,
        BoardId,
        BoardName AS Name,
        COALESCE(BoardCode, BoardName) AS Code,
        IsActive,
        1 AS IsCurrent
    FROM `Boards`
    WHERE IsActive = 1
    ORDER BY BoardName ASC;
END //

DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 9. sp_GetDashboardWeeklyAttendance (Weekly Trend)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardWeeklyAttendance;

DELIMITER //

CREATE PROCEDURE sp_GetDashboardWeeklyAttendance(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_StartDate DATE,
    IN p_EndDate DATE
)
BEGIN
    SELECT 
        DATE(a.AttendanceDate) AS AttDate,
        COUNT(*) AS Total,
        COALESCE(SUM(CASE WHEN a.Status = 1 OR a.Status = 'Present' THEN 1 ELSE 0 END), 0) AS Present,
        COALESCE(SUM(CASE WHEN a.Status = 2 OR a.Status = 'Absent' THEN 1 ELSE 0 END), 0) AS Absent,
        COALESCE(SUM(CASE WHEN a.Status IN (3, 4) OR a.Status = 'Late' THEN 1 ELSE 0 END), 0) AS Late,
        ROUND(COALESCE((SUM(CASE WHEN a.Status = 1 OR a.Status = 'Present' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 0.0), 1) AS Percentage
    FROM `Attendances` a
    INNER JOIN `Students` s ON a.StudentId = s.StudentId
    WHERE DATE(a.AttendanceDate) >= p_StartDate AND DATE(a.AttendanceDate) <= p_EndDate
      AND (a.IsActive = 1 OR a.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
    GROUP BY DATE(a.AttendanceDate)
    ORDER BY DATE(a.AttendanceDate) ASC;
END //

DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 10. sp_GetDashboardFacultyWorkload (Faculty Workload)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardFacultyWorkload;

DELIMITER //

CREATE PROCEDURE sp_GetDashboardFacultyWorkload(
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT 
        s.Id AS FacultyId,
        CONCAT(s.FirstName, ' ', COALESCE(s.LastName, '')) AS FacultyName,
        COALESCE(d.DepartmentName, 'General') AS Department,
        COUNT(sa.Id) AS AssignedSubjects,
        CAST(COUNT(sa.Id) * 6.0 AS DECIMAL(18,1)) AS HoursPerWeek
    FROM `Staff` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId
    INNER JOIN `StaffSubjectAllocations` sa ON sa.StaffId = s.Id
    WHERE (s.IsDeleted = 0 OR s.IsDeleted IS NULL)
      AND (s.Status = 'Active' OR s.Status IS NULL)
      AND (s.StaffType = 'Teaching' OR s.StaffType = 'Both' OR s.StaffType IS NULL)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
    GROUP BY s.Id, s.FirstName, s.LastName, d.DepartmentName
    ORDER BY AssignedSubjects DESC;
END //

DELIMITER ;

