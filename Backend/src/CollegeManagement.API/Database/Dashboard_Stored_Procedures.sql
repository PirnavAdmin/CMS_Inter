-- ====================================================================================================
-- COLLEGE MANAGEMENT SYSTEM - DASHBOARD MODULE STORED PROCEDURES
-- Target Database: MySQL 8.0 / MariaDB
-- Description: Clean, production-ready Stored Procedures for Dashboard KPIs, Charts, Attendance,
--              Certificate Requests, Upcoming Exams, Highlights, and Filters.
-- All procedures strictly support dynamic filtering with @BoardId and @AcademicYearId parameters.
-- ====================================================================================================

-- ----------------------------------------------------------------------------------------------------
-- 1. sp_GetDashboardKPIs / sp_GetDashboardSummary
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
    DECLARE v_EffectiveBoardId INT DEFAULT NULL;
    DECLARE v_TotalStudents INT DEFAULT 0;
    DECLARE v_TeachingStaff INT DEFAULT 0;
    DECLARE v_NonTeachingStaff INT DEFAULT 0;
    DECLARE v_TotalGroups INT DEFAULT 0;
    DECLARE v_TotalSections INT DEFAULT 0;
    DECLARE v_PriorAcademicYearId INT DEFAULT NULL;
    DECLARE v_PriorYearStartDate DATE DEFAULT NULL;
    DECLARE v_PriorYearEndDate DATE DEFAULT NULL;
    DECLARE v_LastYearStudents INT DEFAULT 0;
    DECLARE v_LastYearTeaching INT DEFAULT 0;
    DECLARE v_LastYearNonTeaching INT DEFAULT 0;
    DECLARE v_LastYearGroups INT DEFAULT 0;
    DECLARE v_LastYearSections INT DEFAULT 0;
    DECLARE v_StudentsGrowth DECIMAL(5,1) DEFAULT 0.0;
    DECLARE v_GroupsGrowth DECIMAL(5,1) DEFAULT 0.0;
    DECLARE v_SectionsGrowth DECIMAL(5,1) DEFAULT 0.0;
    DECLARE v_TeachingGrowth DECIMAL(5,1) DEFAULT 0.0;
    DECLARE v_NonTeachingGrowth DECIMAL(5,1) DEFAULT 0.0;
    DECLARE v_TodayAttendancePct DECIMAL(5,1) DEFAULT 0.0;
    DECLARE v_TotalMarked INT DEFAULT 0;
    DECLARE v_PresentCount INT DEFAULT 0;
    DECLARE v_AcademicYearName VARCHAR(100) DEFAULT '';
    DECLARE v_UpcomingExams INT DEFAULT 0;
    DECLARE v_TotalAdmissions INT DEFAULT 0;
    DECLARE v_TotalSubjects INT DEFAULT 0;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());

    -- Resolve Effective Academic Year ID
    IF p_AcademicYearId IS NOT NULL THEN
        SET v_EffectiveAcademicYearId = p_AcademicYearId;
    ELSE
        SELECT AcademicYearId INTO v_EffectiveAcademicYearId
        FROM `AcademicYears` ay
        WHERE (ay.IsActive = 1 OR ay.IsActive IS NULL)
          AND (p_BoardId IS NULL OR ay.BoardId = p_BoardId)
          AND (ay.StartDate <= v_TargetDate AND ay.EndDate >= v_TargetDate)
        ORDER BY ay.StartDate DESC
        LIMIT 1;

        IF v_EffectiveAcademicYearId IS NULL THEN
            SELECT AcademicYearId INTO v_EffectiveAcademicYearId
            FROM `AcademicYears` ay
            WHERE (ay.IsActive = 1 OR ay.IsActive IS NULL)
              AND (p_BoardId IS NULL OR ay.BoardId = p_BoardId)
              AND ay.StartDate <= v_TargetDate
            ORDER BY ay.StartDate DESC
            LIMIT 1;
        END IF;

        IF v_EffectiveAcademicYearId IS NULL THEN
            SELECT AcademicYearId INTO v_EffectiveAcademicYearId
            FROM `AcademicYears` ay
            WHERE (ay.IsActive = 1 OR ay.IsActive IS NULL)
              AND (p_BoardId IS NULL OR ay.BoardId = p_BoardId)
            ORDER BY ay.StartDate ASC
            LIMIT 1;
        END IF;
    END IF;

    -- 1. Current Active Student Count
    SELECT COUNT(*) INTO v_TotalStudents
    FROM `Students` s
    WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (v_EffectiveAcademicYearId IS NULL OR s.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

    -- 2. Teaching Staff Count
    SELECT COUNT(*) INTO v_TeachingStaff
    FROM `Staff` st
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (st.StaffType = 'Teaching' OR st.FacultyType = 'Teaching')
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId OR st.BoardId IS NULL OR st.BoardId = 0);

    -- 3. Non-Teaching Staff Count
    SELECT COUNT(*) INTO v_NonTeachingStaff
    FROM `Staff` st
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (st.StaffType = 'Non-Teaching' OR (st.StaffType != 'Teaching' AND st.FacultyType != 'Teaching'))
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId OR st.BoardId IS NULL OR st.BoardId = 0);

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

    -- 6. Dynamic Prior Academic Year Determination
    IF v_EffectiveAcademicYearId IS NOT NULL THEN
        SELECT AcademicYearName, BoardId INTO v_AcademicYearName, v_EffectiveBoardId
        FROM `AcademicYears`
        WHERE AcademicYearId = v_EffectiveAcademicYearId LIMIT 1;

        -- 1. Look for exact prior academic year by parsed year name (e.g. '2026-2027' -> '2025-2026', '2027-2028' -> '2026-2027')
        IF v_AcademicYearName LIKE '%-%' THEN
            SELECT AcademicYearId, StartDate, EndDate
            INTO v_PriorAcademicYearId, v_PriorYearStartDate, v_PriorYearEndDate
            FROM `AcademicYears` ay
            WHERE (ay.IsActive = 1 OR ay.IsActive IS NULL)
              AND ay.AcademicYearName = CONCAT(CAST(SUBSTRING_INDEX(v_AcademicYearName, '-', 1) AS UNSIGNED) - 1, '-', CAST(SUBSTRING_INDEX(v_AcademicYearName, '-', -1) AS UNSIGNED) - 1)
              AND (v_EffectiveBoardId IS NULL OR ay.BoardId = v_EffectiveBoardId)
            LIMIT 1;
        END IF;

        -- 2. Fallback: strictly prior EndDate < currentYear.StartDate AND distinct name
        IF v_PriorAcademicYearId IS NULL THEN
            SELECT AcademicYearId, StartDate, EndDate 
            INTO v_PriorAcademicYearId, v_PriorYearStartDate, v_PriorYearEndDate
            FROM `AcademicYears` ay
            WHERE (ay.IsActive = 1 OR ay.IsActive IS NULL)
              AND ay.AcademicYearName != v_AcademicYearName
              AND ay.EndDate < (SELECT StartDate FROM `AcademicYears` WHERE AcademicYearId = v_EffectiveAcademicYearId LIMIT 1)
              AND (v_EffectiveBoardId IS NULL OR ay.BoardId = v_EffectiveBoardId)
            ORDER BY ay.StartDate DESC
            LIMIT 1;
        END IF;
    END IF;

    -- Prior Year Stats (Zero/Null handling when no prior year records exist)
    IF v_PriorAcademicYearId IS NOT NULL THEN
        SELECT COUNT(*) INTO v_LastYearStudents
        FROM `Students` s
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND s.AcademicYearId = v_PriorAcademicYearId
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

        -- Strict Rule: If no students exist in prior year, all prior year counts MUST BE 0
        IF v_LastYearStudents > 0 THEN
            SELECT COUNT(*) INTO v_LastYearGroups
            FROM `Groups` g
            WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
              AND g.AcademicYearId = v_PriorAcademicYearId
              AND (p_BoardId IS NULL OR g.BoardId = p_BoardId);

            SELECT COUNT(*) INTO v_LastYearSections
            FROM `Sections` sec
            WHERE (sec.IsActive = 1 OR sec.IsActive IS NULL)
              AND sec.AcademicYearId = v_PriorAcademicYearId
              AND (p_BoardId IS NULL OR sec.BoardId = p_BoardId);

            SELECT COUNT(DISTINCT st.Id) INTO v_LastYearTeaching
            FROM `Staff` st
            WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
              AND (st.Status = 'Active' OR st.Status IS NULL)
              AND (st.StaffType = 'Teaching' OR st.FacultyType = 'Teaching')
              AND (p_BoardId IS NULL OR st.BoardId = p_BoardId OR st.BoardId IS NULL OR st.BoardId = 0)
              AND (v_PriorYearEndDate IS NOT NULL AND st.JoiningDate IS NOT NULL AND DATE(st.JoiningDate) <= v_PriorYearEndDate);

            SELECT COUNT(DISTINCT st.Id) INTO v_LastYearNonTeaching
            FROM `Staff` st
            WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
              AND (st.Status = 'Active' OR st.Status IS NULL)
              AND (st.StaffType = 'Non-Teaching' OR (st.StaffType != 'Teaching' AND st.FacultyType != 'Teaching'))
              AND (p_BoardId IS NULL OR st.BoardId = p_BoardId OR st.BoardId IS NULL OR st.BoardId = 0)
              AND (v_PriorYearEndDate IS NOT NULL AND st.JoiningDate IS NOT NULL AND DATE(st.JoiningDate) <= v_PriorYearEndDate);
        ELSE
            SET v_LastYearStudents = 0;
            SET v_LastYearGroups = 0;
            SET v_LastYearSections = 0;
            SET v_LastYearTeaching = 0;
            SET v_LastYearNonTeaching = 0;
        END IF;
    ELSE
        SET v_LastYearStudents = 0;
        SET v_LastYearGroups = 0;
        SET v_LastYearSections = 0;
        SET v_LastYearTeaching = 0;
        SET v_LastYearNonTeaching = 0;
    END IF;

    -- Safe Division YoY Growth Percentages Formula: ((Current - Previous) / Previous) * 100
    -- If Previous == 0 -> Growth MUST be 0.0 to avoid division-by-zero errors or false spikes
    IF v_LastYearStudents > 0 THEN
        SET v_StudentsGrowth = ROUND(((v_TotalStudents - v_LastYearStudents) * 100.0) / v_LastYearStudents, 1);
    ELSE
        SET v_StudentsGrowth = 0.0;
    END IF;

    IF v_LastYearTeaching > 0 THEN
        SET v_TeachingGrowth = ROUND(((v_TeachingStaff - v_LastYearTeaching) * 100.0) / v_LastYearTeaching, 1);
    ELSE
        SET v_TeachingGrowth = 0.0;
    END IF;

    IF v_LastYearNonTeaching > 0 THEN
        SET v_NonTeachingGrowth = ROUND(((v_NonTeachingStaff - v_LastYearNonTeaching) * 100.0) / v_LastYearNonTeaching, 1);
    ELSE
        SET v_NonTeachingGrowth = 0.0;
    END IF;

    IF v_LastYearGroups > 0 THEN
        SET v_GroupsGrowth = ROUND(((v_TotalGroups - v_LastYearGroups) * 100.0) / v_LastYearGroups, 1);
    ELSE
        SET v_GroupsGrowth = 0.0;
    END IF;

    IF v_LastYearSections > 0 THEN
        SET v_SectionsGrowth = ROUND(((v_TotalSections - v_LastYearSections) * 100.0) / v_LastYearSections, 1);
    ELSE
        SET v_SectionsGrowth = 0.0;
    END IF;

    -- 7. Today's Student Attendance % (Consolidated Morning & Afternoon Sessions)
    SELECT 
        COUNT(a.AttendanceId),
        COALESCE(SUM(CASE WHEN a.Status = 1 OR a.Status = 'Present' OR a.Status = 3 OR a.Status = 'Late' THEN 1 ELSE 0 END), 0)
    INTO v_TotalMarked, v_PresentCount
    FROM `Attendances` a
    INNER JOIN `Students` s ON a.StudentId = s.StudentId
    WHERE DATE(a.AttendanceDate) = v_TargetDate
      AND (a.IsActive = 1 OR a.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

    IF v_TotalMarked > 0 THEN
        SET v_TodayAttendancePct = ROUND((v_PresentCount * 100.0) / v_TotalMarked, 1);
    ELSE
        SET v_TodayAttendancePct = 0.0;
    END IF;

    -- 8. Academic Year Name
    SELECT AcademicYearName INTO v_AcademicYearName
    FROM `AcademicYears` ay
    WHERE (ay.IsActive = 1 OR ay.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR ay.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR ay.BoardId = p_BoardId)
    ORDER BY ay.StartDate DESC
    LIMIT 1;

    IF v_AcademicYearName IS NULL OR v_AcademicYearName = '' THEN
        SELECT AcademicYearName INTO v_AcademicYearName
        FROM `AcademicYears` ay
        WHERE (ay.IsActive = 1 OR ay.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR ay.AcademicYearId = p_AcademicYearId)
        ORDER BY ay.StartDate DESC
        LIMIT 1;
    END IF;

    IF v_AcademicYearName IS NULL OR v_AcademicYearName = '' THEN
        SET v_AcademicYearName = CONCAT(YEAR(CURDATE()), '-', YEAR(CURDATE()) + 1);
    END IF;

    -- 9. Upcoming Exams Count (Strictly active & future/ongoing exams)
    SELECT COUNT(*) INTO v_UpcomingExams
    FROM `Examinations` e
    WHERE (e.IsActive = 1 OR e.IsActive IS NULL)
      AND DATE(e.EndDate) >= v_TargetDate
      AND LOWER(COALESCE(e.Status, '')) NOT IN ('completed', 'cancelled', 'deleted')
      AND (p_AcademicYearId IS NULL OR e.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR e.BoardId = p_BoardId);

    -- 10. Total Admissions
    SELECT COUNT(*) INTO v_TotalAdmissions
    FROM `StudentAdmissions` sa
    WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId);

    IF v_TotalAdmissions = 0 THEN
        SET v_TotalAdmissions = v_TotalStudents;
    END IF;

    -- 11. Total Subjects
    SELECT COUNT(*) INTO v_TotalSubjects
    FROM `Subjects` sub
    WHERE (sub.IsActive = 1 OR sub.IsActive IS NULL)
      AND (p_BoardId IS NULL OR sub.BoardId = p_BoardId);

    -- Final Return
    SELECT 
        v_TotalStudents AS TotalStudents,
        v_TeachingStaff AS TeachingStaff,
        v_NonTeachingStaff AS NonTeachingStaff,
        v_TotalGroups AS TotalGroups,
        v_TotalSections AS TotalSections,
        v_StudentsGrowth AS StudentsVsLastYearPercentage,
        v_LastYearStudents AS LastYearTotalStudents,
        v_TeachingGrowth AS TeachingStaffVsLastYearPercentage,
        v_LastYearTeaching AS LastYearTeachingStaff,
        v_NonTeachingGrowth AS NonTeachingStaffVsLastYearPercentage,
        v_LastYearNonTeaching AS LastYearNonTeachingStaff,
        v_GroupsGrowth AS GroupsVsLastYearPercentage,
        v_LastYearGroups AS LastYearTotalGroups,
        v_SectionsGrowth AS SectionsVsLastYearPercentage,
        v_LastYearSections AS LastYearTotalSections,
        v_TodayAttendancePct AS TodayAttendance,
        v_TotalAdmissions AS Admissions,
        v_AcademicYearName AS AcademicYear,
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
-- 2. sp_GetDashboardStudentsOverview (Line Chart + Gender/Level Breakdown)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardStudentsOverview;

DELIMITER //

CREATE PROCEDURE sp_GetDashboardStudentsOverview(
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    -- Resultset 1: Summary Counts & Gender / Level Distribution
    SELECT 
        COUNT(*) AS TotalStudents,
        SUM(CASE WHEN s.IsActive = 1 OR s.IsActive IS NULL THEN 1 ELSE 0 END) AS ActiveStudents,
        SUM(CASE WHEN s.IsActive = 0 THEN 1 ELSE 0 END) AS InactiveStudents,
        SUM(CASE WHEN LOWER(COALESCE(s.Gender, '')) IN ('male', 'm', 'boy', 'boys') THEN 1 ELSE 0 END) AS MaleStudents,
        SUM(CASE WHEN LOWER(COALESCE(s.Gender, '')) IN ('female', 'f', 'girl', 'girls') THEN 1 ELSE 0 END) AS FemaleStudents,
        SUM(CASE WHEN LOWER(COALESCE(s.Gender, '')) NOT IN ('male', 'm', 'boy', 'boys', 'female', 'f', 'girl', 'girls') THEN 1 ELSE 0 END) AS OtherStudents,
        ROUND(COALESCE((SUM(CASE WHEN LOWER(COALESCE(s.Gender, '')) IN ('male', 'm', 'boy', 'boys') THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 0.0), 1) AS MalePercentage,
        ROUND(COALESCE((SUM(CASE WHEN LOWER(COALESCE(s.Gender, '')) IN ('female', 'f', 'girl', 'girls') THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 0.0), 1) AS FemalePercentage,
        SUM(CASE WHEN al.LevelName LIKE '%1%' OR LOWER(COALESCE(al.LevelName, '')) LIKE '%first%' OR LOWER(COALESCE(al.LevelName, '')) LIKE '%junior%' THEN 1 ELSE 0 END) AS FirstYearStudents,
        SUM(CASE WHEN al.LevelName LIKE '%2%' OR LOWER(COALESCE(al.LevelName, '')) LIKE '%second%' OR LOWER(COALESCE(al.LevelName, '')) LIKE '%senior%' THEN 1 ELSE 0 END) AS SecondYearStudents
    FROM `Students` s
    LEFT JOIN `AcademicLevels` al ON s.AcademicLevelId = al.AcademicLevelId
    WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

    -- Resultset 2: Monthly Trend (Dynamically computed from Students.AdmissionDate)
    SELECT 
        DATE_FORMAT(s.AdmissionDate, '%b %Y') AS Period,
        MIN(s.AdmissionDate) AS SortDate,
        COUNT(*) AS StudentsJoined
    FROM `Students` s
    WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
      AND s.AdmissionDate IS NOT NULL
    GROUP BY DATE_FORMAT(s.AdmissionDate, '%b %Y')
    ORDER BY SortDate ASC;
END //

DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 3. sp_GetDashboardGroupDistribution (Bar Chart / Streams)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardGroupDistribution;

DELIMITER //

CREATE PROCEDURE sp_GetDashboardGroupDistribution(
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
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
END //

DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 4. sp_GetDashboardStudentAttendance (Donut Chart + ViewBy Filters, Morning & Afternoon Consolidated)
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
    DECLARE v_Late INT DEFAULT 0;
    DECLARE v_TotalSessionsMarked INT DEFAULT 0;
    DECLARE v_PresentSessionsMarked INT DEFAULT 0;
    DECLARE v_AttPct DECIMAL(5,1) DEFAULT 0.0;
    DECLARE v_PresentPct DECIMAL(5,1) DEFAULT 0.0;
    DECLARE v_AbsentPct DECIMAL(5,1) DEFAULT 0.0;
    DECLARE v_LatePct DECIMAL(5,1) DEFAULT 0.0;
    DECLARE v_View VARCHAR(50);

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());
    SET v_View = COALESCE(p_ViewBy, 'Overall');

    -- Total Distinct Active Students
    SELECT COUNT(DISTINCT s.StudentId) INTO v_TotalStudents
    FROM `Students` s
    WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

    -- Distinct Student Headcounts Today (Present in either Morning or Afternoon session)
    SELECT 
        COUNT(DISTINCT CASE WHEN a.Status = 1 OR a.Status = 'Present' OR a.Status = 3 OR a.Status = 'Late' THEN a.StudentId END),
        COUNT(DISTINCT CASE WHEN (a.Status = 2 OR a.Status = 'Absent') 
                             AND a.StudentId NOT IN (
                                 SELECT a2.StudentId FROM `Attendances` a2 
                                 WHERE DATE(a2.AttendanceDate) = v_TargetDate 
                                   AND (a2.Status = 1 OR a2.Status = 'Present' OR a2.Status = 3 OR a2.Status = 'Late')
                             ) THEN a.StudentId END),
        COUNT(DISTINCT CASE WHEN a.Status = 3 OR a.Status = 'Late' THEN a.StudentId END),
        COUNT(a.AttendanceId),
        COALESCE(SUM(CASE WHEN a.Status = 1 OR a.Status = 'Present' OR a.Status = 3 OR a.Status = 'Late' THEN 1 ELSE 0 END), 0)
    INTO v_Present, v_Absent, v_Late, v_TotalSessionsMarked, v_PresentSessionsMarked
    FROM `Attendances` a
    INNER JOIN `Students` s ON a.StudentId = s.StudentId
    WHERE DATE(a.AttendanceDate) = v_TargetDate
      AND (a.IsActive = 1 OR a.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

    -- Attendance Percentage across all sessions (Morning + Afternoon consolidated, max 100%)
    IF v_TotalSessionsMarked > 0 THEN
        SET v_AttPct = LEAST(100.0, ROUND((v_PresentSessionsMarked * 100.0) / v_TotalSessionsMarked, 1));
    ELSEIF v_TotalStudents > 0 THEN
        SET v_AttPct = LEAST(100.0, ROUND((v_Present * 100.0) / v_TotalStudents, 1));
    ELSE
        SET v_AttPct = 0.0;
    END IF;

    IF v_TotalStudents > 0 THEN
        SET v_PresentPct = v_AttPct;
        SET v_AbsentPct = LEAST(100.0, ROUND((v_Absent * 100.0) / v_TotalStudents, 1));
        SET v_LatePct = LEAST(100.0, ROUND((v_Late * 100.0) / v_TotalStudents, 1));
    END IF;

    -- Resultset 1: Overall Summary
    SELECT 
        v_View AS ViewBy,
        v_TotalStudents AS TotalStudents,
        v_Present AS Present,
        v_Absent AS Absent,
        v_Late AS Late,
        v_AttPct AS AttendancePercentage,
        v_PresentPct AS PresentPercentage,
        v_AbsentPct AS AbsentPercentage,
        v_LatePct AS LatePercentage;

    -- Resultset 2: Breakdown by Category
    IF LOWER(v_View) IN ('academic level', 'level', 'academic-level', 'academiclevel') THEN
        SELECT 
            COALESCE(al.LevelName, 'General') AS CategoryName,
            COUNT(DISTINCT s.StudentId) AS TotalStudents,
            COUNT(DISTINCT CASE WHEN a.Status = 1 OR a.Status = 'Present' OR a.Status = 3 OR a.Status = 'Late' THEN s.StudentId END) AS Present,
            COUNT(DISTINCT CASE WHEN (a.Status = 2 OR a.Status = 'Absent') 
                                 AND a.StudentId NOT IN (
                                     SELECT a2.StudentId FROM `Attendances` a2 
                                     WHERE DATE(a2.AttendanceDate) = v_TargetDate 
                                       AND (a2.Status = 1 OR a2.Status = 'Present' OR a2.Status = 3 OR a2.Status = 'Late')
                                 ) THEN s.StudentId END) AS Absent,
            COUNT(DISTINCT CASE WHEN a.Status = 3 OR a.Status = 'Late' THEN s.StudentId END) AS Late,
            LEAST(100.0, ROUND(COALESCE((SUM(CASE WHEN a.Status = 1 OR a.Status = 'Present' OR a.Status = 3 OR a.Status = 'Late' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(a.AttendanceId), 0), 0.0), 1)) AS AttendancePercentage
        FROM `Students` s
        LEFT JOIN `AcademicLevels` al ON s.AcademicLevelId = al.AcademicLevelId
        LEFT JOIN `Attendances` a ON a.StudentId = s.StudentId AND DATE(a.AttendanceDate) = v_TargetDate AND (a.IsActive = 1 OR a.IsActive IS NULL)
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
        GROUP BY COALESCE(al.LevelName, 'General')
        ORDER BY TotalStudents DESC;
    ELSEIF LOWER(v_View) IN ('group', 'groups') THEN
        SELECT 
            COALESCE(g.GroupName, 'General') AS CategoryName,
            COUNT(DISTINCT s.StudentId) AS TotalStudents,
            COUNT(DISTINCT CASE WHEN a.Status = 1 OR a.Status = 'Present' OR a.Status = 3 OR a.Status = 'Late' THEN s.StudentId END) AS Present,
            COUNT(DISTINCT CASE WHEN (a.Status = 2 OR a.Status = 'Absent') 
                                 AND a.StudentId NOT IN (
                                     SELECT a2.StudentId FROM `Attendances` a2 
                                     WHERE DATE(a2.AttendanceDate) = v_TargetDate 
                                       AND (a2.Status = 1 OR a2.Status = 'Present' OR a2.Status = 3 OR a2.Status = 'Late')
                                 ) THEN s.StudentId END) AS Absent,
            COUNT(DISTINCT CASE WHEN a.Status = 3 OR a.Status = 'Late' THEN s.StudentId END) AS Late,
            LEAST(100.0, ROUND(COALESCE((SUM(CASE WHEN a.Status = 1 OR a.Status = 'Present' OR a.Status = 3 OR a.Status = 'Late' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(a.AttendanceId), 0), 0.0), 1)) AS AttendancePercentage
        FROM `Students` s
        LEFT JOIN `Groups` g ON s.GroupId = g.GroupId
        LEFT JOIN `Attendances` a ON a.StudentId = s.StudentId AND DATE(a.AttendanceDate) = v_TargetDate AND (a.IsActive = 1 OR a.IsActive IS NULL)
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
        GROUP BY COALESCE(g.GroupName, 'General')
        ORDER BY TotalStudents DESC;
    ELSEIF LOWER(v_View) IN ('section', 'sections') THEN
        SELECT 
            COALESCE(sec.SectionName, 'General') AS CategoryName,
            COUNT(DISTINCT s.StudentId) AS TotalStudents,
            COUNT(DISTINCT CASE WHEN a.Status = 1 OR a.Status = 'Present' OR a.Status = 3 OR a.Status = 'Late' THEN s.StudentId END) AS Present,
            COUNT(DISTINCT CASE WHEN (a.Status = 2 OR a.Status = 'Absent') 
                                 AND a.StudentId NOT IN (
                                     SELECT a2.StudentId FROM `Attendances` a2 
                                     WHERE DATE(a2.AttendanceDate) = v_TargetDate 
                                       AND (a2.Status = 1 OR a2.Status = 'Present' OR a2.Status = 3 OR a2.Status = 'Late')
                                 ) THEN s.StudentId END) AS Absent,
            COUNT(DISTINCT CASE WHEN a.Status = 3 OR a.Status = 'Late' THEN s.StudentId END) AS Late,
            LEAST(100.0, ROUND(COALESCE((SUM(CASE WHEN a.Status = 1 OR a.Status = 'Present' OR a.Status = 3 OR a.Status = 'Late' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(a.AttendanceId), 0), 0.0), 1)) AS AttendancePercentage
        FROM `Students` s
        LEFT JOIN `Sections` sec ON s.SectionId = sec.SectionId
        LEFT JOIN `Attendances` a ON a.StudentId = s.StudentId AND DATE(a.AttendanceDate) = v_TargetDate AND (a.IsActive = 1 OR a.IsActive IS NULL)
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
        GROUP BY COALESCE(sec.SectionName, 'General')
        ORDER BY TotalStudents DESC;
    ELSE
        SELECT 
            'Overall' AS CategoryName,
            v_TotalStudents AS TotalStudents,
            v_Present AS Present,
            v_Absent AS Absent,
            v_Late AS Late,
            v_AttPct AS AttendancePercentage
        WHERE FALSE;
    END IF;
END //

DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 5. sp_GetDashboardStaffAttendance (Donut Chart + Staff Type Filters & Board Scoping)
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
    DECLARE v_TotalStaff INT DEFAULT 0;
    DECLARE v_TeachingCount INT DEFAULT 0;
    DECLARE v_NonTeachingCount INT DEFAULT 0;
    DECLARE v_FilteredTotal INT DEFAULT 0;
    DECLARE v_Present INT DEFAULT 0;
    DECLARE v_Absent INT DEFAULT 0;
    DECLARE v_Late INT DEFAULT 0;
    DECLARE v_OnLeave INT DEFAULT 0;
    DECLARE v_TotalSessionMarks INT DEFAULT 0;
    DECLARE v_AttendancePct DECIMAL(5,2) DEFAULT 0.0;
    DECLARE v_StaffType VARCHAR(50);
    DECLARE v_LeavesCount INT DEFAULT 0;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());
    SET v_StaffType = COALESCE(p_StaffType, 'All Staff');

    SELECT COUNT(*) INTO v_TotalStaff
    FROM `Staff` st
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId OR st.BoardId IS NULL OR st.BoardId = 0);

    SELECT COUNT(*) INTO v_TeachingCount
    FROM `Staff` st
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (st.StaffType = 'Teaching' OR st.FacultyType = 'Teaching' OR st.StaffType IS NULL)
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId OR st.BoardId IS NULL OR st.BoardId = 0);

    SET v_NonTeachingCount = GREATEST(0, v_TotalStaff - v_TeachingCount);

    IF LOWER(v_StaffType) IN ('teaching staff', 'teaching') THEN
        SET v_FilteredTotal = v_TeachingCount;
    ELSEIF LOWER(v_StaffType) IN ('non-teaching staff', 'non-teaching', 'nonteaching staff', 'nonteaching') THEN
        SET v_FilteredTotal = v_NonTeachingCount;
    ELSE
        SET v_FilteredTotal = v_TotalStaff;
    END IF;

    -- Session Attendance counts with Board & Staff Type scoping
    SELECT 
        COALESCE(SUM(sas.PresentCount), 0),
        COALESCE(SUM(sas.AbsentCount), 0),
        COALESCE(SUM(sas.LateCount), 0),
        COALESCE(SUM(sas.LeaveCount), 0)
    INTO v_Present, v_Absent, v_Late, v_OnLeave
    FROM `StaffAttendanceSessions` sas
    WHERE DATE(sas.AttendanceDate) = v_TargetDate
      AND (sas.IsActive = 1 OR sas.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR sas.AcademicYearId = p_AcademicYearId)
      AND (
          LOWER(v_StaffType) IN ('all', 'all staff')
          OR (LOWER(v_StaffType) IN ('teaching', 'teaching staff') AND (sas.StaffType = 1 OR sas.StaffType = 'Teaching' OR sas.StaffType = '1'))
          OR (LOWER(v_StaffType) IN ('non-teaching', 'non-teaching staff', 'nonteaching', 'nonteaching staff') AND (sas.StaffType = 2 OR sas.StaffType = 'Non-Teaching' OR sas.StaffType = '2'))
      );

    -- Leave Requests
    SELECT COUNT(*) INTO v_LeavesCount
    FROM `StaffLeaveRequests` slr
    WHERE (slr.IsActive = 1 OR slr.IsActive IS NULL)
      AND slr.Status = 'Approved'
      AND DATE(slr.StartDate) <= v_TargetDate AND DATE(slr.EndDate) >= v_TargetDate;

    -- Total session marks & normalized attendance calculation
    SET v_TotalSessionMarks = v_Present + v_Absent + v_Late + v_OnLeave;

    IF v_TotalSessionMarks > 0 THEN
        SET v_AttendancePct = LEAST(100.0, ROUND((v_Present * 100.0) / v_TotalSessionMarks, 1));
    ELSEIF v_FilteredTotal > 0 AND v_Present > 0 THEN
        SET v_AttendancePct = LEAST(100.0, ROUND((LEAST(v_Present, v_FilteredTotal) * 100.0) / v_FilteredTotal, 1));
    ELSE
        SET v_AttendancePct = 0.0;
    END IF;

    -- Normalize Headcounts so Present/Absent never exceed Total Staff
    IF v_FilteredTotal > 0 THEN
        SET v_Present = LEAST(v_Present, v_FilteredTotal);
        SET v_Absent = LEAST(v_Absent, v_FilteredTotal);
        SET v_Late = LEAST(v_Late, v_FilteredTotal);
        SET v_OnLeave = LEAST(v_OnLeave, v_FilteredTotal);
    END IF;

    SELECT 
        v_StaffType AS StaffType,
        v_FilteredTotal AS TotalStaff,
        v_FilteredTotal AS Total,
        v_FilteredTotal AS TotalCount,
        v_Present AS Present,
        v_Present AS PresentCount,
        v_Absent AS Absent,
        v_Absent AS AbsentCount,
        v_Late AS Late,
        v_Late AS LateCount,
        v_OnLeave AS OnLeave,
        v_OnLeave AS OnLeaveCount,
        v_OnLeave AS LeaveCount,
        v_AttendancePct AS AttendancePercentage,
        v_AttendancePct AS Percentage,
        v_AttendancePct AS PresentPercentage,
        CASE WHEN v_TotalSessionMarks > 0 THEN ROUND((v_Absent * 100.0) / v_TotalSessionMarks, 1) ELSE 0.0 END AS AbsentPercentage,
        CASE WHEN v_TotalSessionMarks > 0 THEN ROUND((v_Late * 100.0) / v_TotalSessionMarks, 1) ELSE 0.0 END AS LatePercentage,
        CASE WHEN v_TotalSessionMarks > 0 THEN ROUND((v_OnLeave * 100.0) / v_TotalSessionMarks, 1) ELSE 0.0 END AS OnLeavePercentage,
        v_TeachingCount AS TeachingCount,
        v_TeachingCount AS TeachingStaffCount,
        v_NonTeachingCount AS NonTeachingCount,
        v_NonTeachingCount AS NonTeachingStaffCount,
        v_TeachingCount AS TeachingStaff,
        v_NonTeachingCount AS NonTeachingStaff;
END //

DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 6. sp_GetDashboardCertificateRequests (Summary Counts + Recent List)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardCertificateRequests;

DELIMITER //

CREATE PROCEDURE sp_GetDashboardCertificateRequests(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_Limit INT
)
BEGIN
    DECLARE v_Limit INT;
    SET v_Limit = COALESCE(p_Limit, 6);

    -- Resultset 1: Summary Counts by Certificate Type & Status
    SELECT 
        COUNT(*) AS TotalRequests,
        SUM(CASE WHEN LOWER(c.CertificateType) LIKE '%bonafide%' THEN 1 ELSE 0 END) AS Bonafide,
        SUM(CASE WHEN LOWER(c.CertificateType) LIKE '%study%' THEN 1 ELSE 0 END) AS Study,
        SUM(CASE WHEN LOWER(c.CertificateType) LIKE '%conduct%' THEN 1 ELSE 0 END) AS Conduct,
        SUM(CASE WHEN LOWER(c.CertificateType) LIKE '%transfer%' OR LOWER(c.CertificateType) LIKE '%tc%' THEN 1 ELSE 0 END) AS Transfer,
        SUM(CASE WHEN LOWER(c.CertificateType) NOT LIKE '%bonafide%' 
                  AND LOWER(c.CertificateType) NOT LIKE '%study%' 
                  AND LOWER(c.CertificateType) NOT LIKE '%conduct%' 
                  AND LOWER(c.CertificateType) NOT LIKE '%transfer%' 
                  AND LOWER(c.CertificateType) NOT LIKE '%tc%' THEN 1 ELSE 0 END) AS Others,
        SUM(CASE WHEN LOWER(c.Status) IN ('generated', 'pending', 'active') THEN 1 ELSE 0 END) AS GeneratedCount,
        SUM(CASE WHEN LOWER(c.Status) = 'reviewed' THEN 1 ELSE 0 END) AS ReviewedCount,
        SUM(CASE WHEN LOWER(c.Status) = 'approved' THEN 1 ELSE 0 END) AS ApprovedCount,
        SUM(CASE WHEN LOWER(c.Status) = 'issued' THEN 1 ELSE 0 END) AS IssuedCount,
        SUM(CASE WHEN LOWER(c.Status) IN ('cancelled', 'deleted') THEN 1 ELSE 0 END) AS CancelledCount
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (TRIM(sa.AdmissionNo) = TRIM(c.AdmissionNo) OR sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON s.StudentId = c.StudentId OR TRIM(s.AdmissionNo) = TRIM(c.AdmissionNo)
    WHERE (c.IsActive = 1 OR c.IsActive IS NULL)
      AND (p_BoardId IS NULL OR COALESCE(sa.BoardId, s.BoardId) IS NULL OR COALESCE(sa.BoardId, s.BoardId) = p_BoardId)
      AND (p_AcademicYearId IS NULL OR COALESCE(sa.AcademicYearId, s.AcademicYearId) IS NULL OR COALESCE(sa.AcademicYearId, s.AcademicYearId) = p_AcademicYearId);

    -- Resultset 2: Recent Certificate Requests
    SELECT 
        c.Id AS CertificateId,
        COALESCE(c.CertificateNo, CONCAT('CERT-', c.Id)) AS RequestNumber,
        c.CertificateType,
        COALESCE(c.StudentName, NULLIF(TRIM(CONCAT(sa.FirstName, ' ', COALESCE(sa.LastName, ''))), ''), s.StudentName, 'Student') AS StudentName,
        CASE WHEN LOWER(c.Status) = 'active' THEN 'Generated' ELSE c.Status END AS Status,
        COALESCE(c.RequestDate, c.CreatedAt, c.GeneratedAt, c.IssueDate, NOW()) AS RequestedAt
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (TRIM(sa.AdmissionNo) = TRIM(c.AdmissionNo) OR sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON s.StudentId = c.StudentId OR TRIM(s.AdmissionNo) = TRIM(c.AdmissionNo)
    WHERE (c.IsActive = 1 OR c.IsActive IS NULL)
      AND (p_BoardId IS NULL OR COALESCE(sa.BoardId, s.BoardId) IS NULL OR COALESCE(sa.BoardId, s.BoardId) = p_BoardId)
      AND (p_AcademicYearId IS NULL OR COALESCE(sa.AcademicYearId, s.AcademicYearId) IS NULL OR COALESCE(sa.AcademicYearId, s.AcademicYearId) = p_AcademicYearId)
    ORDER BY c.Id DESC
    LIMIT v_Limit;
END //

DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 7. sp_GetDashboardUpcomingExams (Scheduled / Upcoming Exams with Countdown)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardUpcomingExams;

DELIMITER //

CREATE PROCEDURE sp_GetDashboardUpcomingExams(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_Limit INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_Limit INT;
    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());
    SET v_Limit = COALESCE(p_Limit, 6);

    SELECT 
        e.ExaminationId AS ExamId,
        e.ExamName,
        COALESCE(NULLIF(e.ExamCode, ''), CONCAT('EXAM-', LPAD(e.ExaminationId, 4, '0'))) AS ExamCode,
        CONCAT(COALESCE(g.GroupName, al.LevelName, 'All Groups'), ' • ', 
               DATE_FORMAT(e.StartDate, '%d %b %Y'), 
               CASE WHEN e.StartDate != e.EndDate THEN CONCAT(' - ', DATE_FORMAT(e.EndDate, '%d %b %Y')) ELSE '' END
        ) AS Subject,
        DATE_FORMAT(e.StartDate, '%Y-%m-%d') AS StartDate,
        DATE_FORMAT(e.EndDate, '%Y-%m-%d') AS EndDate,
        DATE_FORMAT(e.StartDate, '%d %b %Y') AS FormattedDate,
        COALESCE(NULLIF(e.Status, ''), 'Scheduled') AS Status,
        DATEDIFF(e.StartDate, v_TargetDate) AS DaysRemaining,
        CASE 
            WHEN DATEDIFF(e.StartDate, v_TargetDate) > 1 THEN CONCAT('In ', DATEDIFF(e.StartDate, v_TargetDate), ' days')
            WHEN DATEDIFF(e.StartDate, v_TargetDate) = 1 THEN 'Tomorrow'
            WHEN DATEDIFF(e.StartDate, v_TargetDate) = 0 THEN 'Today'
            WHEN e.StartDate <= v_TargetDate AND e.EndDate >= v_TargetDate THEN 'Ongoing'
            ELSE 'Scheduled'
        END AS DaysRemainingText,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        COALESCE(g.GroupName, al.LevelName, 'All Groups') AS GroupName
    FROM `Examinations` e
    LEFT JOIN `Groups` g ON e.GroupId = g.GroupId
    LEFT JOIN `AcademicLevels` al ON e.AcademicLevelId = al.AcademicLevelId
    WHERE (e.IsActive = 1 OR e.IsActive IS NULL)
      AND (p_BoardId IS NULL OR e.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR e.AcademicYearId = p_AcademicYearId)
      AND DATE(e.EndDate) >= v_TargetDate
      AND LOWER(COALESCE(e.Status, '')) NOT IN ('completed', 'cancelled', 'deleted')
    ORDER BY e.StartDate ASC
    LIMIT v_Limit;
END //

DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 8. sp_GetDashboardTodaysHighlights (Admissions, Certs, Exams, Birthdays)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardTodaysHighlights;

DELIMITER //

CREATE PROCEDURE sp_GetDashboardTodaysHighlights(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_AdmissionsToday INT DEFAULT 0;
    DECLARE v_CertificatesToday INT DEFAULT 0;
    DECLARE v_ExamsToday INT DEFAULT 0;
    DECLARE v_BirthdaysToday INT DEFAULT 0;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());

    -- Admissions Today
    SELECT COUNT(*) INTO v_AdmissionsToday
    FROM `StudentAdmissions` sa
    WHERE (DATE(sa.AdmissionDate) = v_TargetDate OR DATE(sa.CreatedAt) = v_TargetDate)
      AND (sa.IsActive = 1 OR sa.IsActive IS NULL)
      AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId);

    -- Certificate Requests Today
    SELECT COUNT(*) INTO v_CertificatesToday
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (TRIM(sa.AdmissionNo) = TRIM(c.AdmissionNo) OR sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON s.StudentId = c.StudentId OR TRIM(s.AdmissionNo) = TRIM(c.AdmissionNo)
    WHERE (DATE(c.RequestDate) = v_TargetDate OR DATE(c.CreatedAt) = v_TargetDate OR DATE(c.GeneratedAt) = v_TargetDate OR DATE(c.IssueDate) = v_TargetDate)
      AND (c.IsActive = 1 OR c.IsActive IS NULL)
      AND (p_BoardId IS NULL OR COALESCE(sa.BoardId, s.BoardId) = p_BoardId)
      AND (p_AcademicYearId IS NULL OR COALESCE(sa.AcademicYearId, s.AcademicYearId) = p_AcademicYearId);

    -- Examinations Today
    SELECT COUNT(*) INTO v_ExamsToday
    FROM `Examinations` e
    WHERE (e.IsActive = 1 OR e.IsActive IS NULL)
      AND DATE(e.StartDate) <= v_TargetDate AND DATE(e.EndDate) >= v_TargetDate
      AND (p_BoardId IS NULL OR e.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR e.AcademicYearId = p_AcademicYearId);

    -- Birthdays Today
    SELECT COUNT(*) INTO v_BirthdaysToday
    FROM `Students` s
    WHERE MONTH(s.DateOfBirth) = MONTH(v_TargetDate) AND DAY(s.DateOfBirth) = DAY(v_TargetDate)
      AND (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId);

    SELECT 
        v_AdmissionsToday AS AdmissionsToday,
        v_CertificatesToday AS CertificateRequestsToday,
        v_ExamsToday AS ExaminationsToday,
        v_BirthdaysToday AS BirthdaysToday;
END //

DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 9. sp_GetDashboardFilters (Academic Years & Boards)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardFilters;

DELIMITER //

CREATE PROCEDURE sp_GetDashboardFilters()
BEGIN
    -- Resultset 1: Academic Years
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

    -- Resultset 2: Boards
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
-- 10. sp_GetDashboardWeeklyAttendance
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
        COALESCE(SUM(CASE WHEN a.Status = 3 OR a.Status = 'Late' THEN 1 ELSE 0 END), 0) AS Late,
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
-- 11. sp_GetDashboardFacultyWorkload
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
      AND (s.StaffType = 'Teaching' OR s.FacultyType = 'Teaching')
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
    GROUP BY s.Id, s.FirstName, s.LastName, d.DepartmentName
    ORDER BY AssignedSubjects DESC, s.FirstName ASC;
END //

DELIMITER ;
