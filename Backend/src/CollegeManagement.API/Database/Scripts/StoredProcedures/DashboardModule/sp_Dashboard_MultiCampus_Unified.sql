-- ====================================================================================================
-- COLLEGE MANAGEMENT SYSTEM - DASHBOARD MODULE STORED PROCEDURES (MULTI-CAMPUS ENABLED)
-- Target Database: MySQL 8.0+ Instance (CMSDB / u819242402_CLM_System)
-- Description: Complete stored procedures for Dashboard KPIs, Charts, Attendance,
--              Certificate Requests, Upcoming Exams, Highlights, and Filters with strict CampusId scoping.
-- ====================================================================================================

DELIMITER //

-- ----------------------------------------------------------------------------------------------------
-- 1. sp_GetDashboardKPIs / sp_GetDashboardSummary
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardKPIs//
DROP PROCEDURE IF EXISTS sp_GetDashboardSummary//

CREATE PROCEDURE sp_GetDashboardKPIs(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_EffectiveAcademicYearId INT DEFAULT NULL;
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
    DECLARE v_HalfDayCount INT DEFAULT 0;
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
      AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
      AND (v_EffectiveAcademicYearId IS NULL OR s.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

    IF v_TotalStudents = 0 THEN
        SELECT COUNT(*) INTO v_TotalStudents
        FROM `StudentAdmissions` sa
        WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
          AND (p_CampusId IS NULL OR sa.CampusId = p_CampusId)
          AND (v_EffectiveAcademicYearId IS NULL OR sa.AcademicYearId = v_EffectiveAcademicYearId)
          AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId);
    END IF;

    -- 2. Staff Counts
    SELECT 
        COUNT(DISTINCT CASE WHEN (st.StaffType = 'Teaching' OR st.StaffType = 'Both' OR REPLACE(REPLACE(COALESCE(st.StaffType, ''), '-', ''), ' ', '') = 'Teaching' OR st.StaffType IS NULL) THEN st.Id END),
        COUNT(DISTINCT CASE WHEN (st.StaffType = 'Non-Teaching' OR st.StaffType = 'NonTeaching' OR st.StaffType = 'Non Teaching' OR REPLACE(REPLACE(COALESCE(st.StaffType, ''), '-', ''), ' ', '') = 'NonTeaching') THEN st.Id END)
    INTO v_TeachingStaff, v_NonTeachingStaff
    FROM `Staff` st
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId);

    -- 3. Groups Count
    SELECT COUNT(*) INTO v_TotalGroups
    FROM `Groups` g
    WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
      AND (p_BoardId IS NULL OR g.BoardId IS NULL OR g.BoardId = p_BoardId)
      AND (v_EffectiveAcademicYearId IS NULL OR g.AcademicYearId IS NULL OR g.AcademicYearId = v_EffectiveAcademicYearId);

    -- 4. Sections Count
    SELECT COUNT(*) INTO v_TotalSections
    FROM `Sections` sec
    WHERE (sec.IsActive = 1 OR sec.IsActive IS NULL)
      AND (p_CampusId IS NULL OR sec.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR sec.BoardId IS NULL OR sec.BoardId = p_BoardId)
      AND (v_EffectiveAcademicYearId IS NULL OR sec.AcademicYearId = v_EffectiveAcademicYearId);

    -- 5. Prior Year Comparison
    IF v_EffectiveAcademicYearId IS NOT NULL THEN
        SELECT StartDate INTO v_PriorYearStartDate
        FROM `AcademicYears`
        WHERE AcademicYearId = v_EffectiveAcademicYearId;

        SELECT AcademicYearId, AcademicYearName, StartDate, EndDate 
        INTO v_PriorAcademicYearId, v_AcademicYearName, v_PriorYearStartDate, v_PriorYearEndDate
        FROM `AcademicYears`
        WHERE (IsActive = 1 OR IsActive IS NULL)
          AND (p_BoardId IS NULL OR BoardId = p_BoardId)
          AND StartDate < v_PriorYearStartDate
        ORDER BY StartDate DESC
        LIMIT 1;
    END IF;

    IF v_PriorAcademicYearId IS NOT NULL THEN
        SELECT COUNT(*) INTO v_LastYearStudents
        FROM `Students` s
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
          AND s.AcademicYearId = v_PriorAcademicYearId
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

        SELECT COUNT(*) INTO v_LastYearGroups
        FROM `Groups` g
        WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
          AND (p_BoardId IS NULL OR g.BoardId IS NULL OR g.BoardId = p_BoardId)
          AND (g.AcademicYearId = v_PriorAcademicYearId);

        SELECT COUNT(*) INTO v_LastYearSections
        FROM `Sections` sec
        WHERE (sec.IsActive = 1 OR sec.IsActive IS NULL)
          AND (p_CampusId IS NULL OR sec.CampusId = p_CampusId)
          AND (p_BoardId IS NULL OR sec.BoardId IS NULL OR sec.BoardId = p_BoardId)
          AND (sec.AcademicYearId = v_PriorAcademicYearId);

        SET v_LastYearTeaching = v_TeachingStaff;
        SET v_LastYearNonTeaching = v_NonTeachingStaff;
    ELSE
        SET v_LastYearStudents = 0;
        SET v_LastYearGroups = 0;
        SET v_LastYearSections = 0;
        SET v_LastYearTeaching = 0;
        SET v_LastYearNonTeaching = 0;
    END IF;

    -- Calculate Growth %
    IF v_LastYearStudents > 0 THEN
        SET v_StudentsGrowth = ROUND(((v_TotalStudents - v_LastYearStudents) * 100.0) / v_LastYearStudents, 1);
    ELSE
        SET v_StudentsGrowth = 0.0;
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

    -- 6. Today Attendance
    SELECT 
        COUNT(DISTINCT a.StudentId),
        COUNT(DISTINCT CASE WHEN a.Status = 1 OR a.Status = 'Present' OR a.Status = '1' THEN a.StudentId END),
        COUNT(DISTINCT CASE WHEN a.Status = 2 OR a.Status = 'HalfDay' OR a.Status = '3' OR a.Status = 'Late' THEN a.StudentId END)
    INTO v_TotalMarked, v_PresentCount, v_HalfDayCount
    FROM `Attendances` a
    JOIN `Students` s ON s.StudentId = a.StudentId
    WHERE DATE(a.AttendanceDate) = v_TargetDate
      AND (a.IsActive = 1 OR a.IsActive IS NULL)
      AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
      AND (v_EffectiveAcademicYearId IS NULL OR s.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

    IF v_TotalStudents > 0 THEN
        SET v_TodayAttendancePct = ROUND(((v_PresentCount + 0.5 * v_HalfDayCount) * 100.0) / v_TotalStudents, 1);
    ELSE
        SET v_TodayAttendancePct = 0.0;
    END IF;

    -- 7. Upcoming Exams
    SELECT COUNT(*) INTO v_UpcomingExams
    FROM `Examinations` e
    WHERE (e.IsActive = 1 OR e.IsActive IS NULL)
      AND (p_CampusId IS NULL OR e.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR e.BoardId = p_BoardId)
      AND (v_EffectiveAcademicYearId IS NULL OR e.AcademicYearId = v_EffectiveAcademicYearId)
      AND DATE(e.EndDate) >= v_TargetDate;

    -- Output Primary Resultset
    SELECT 
        v_TotalStudents AS TotalStudents,
        v_TeachingStaff AS TeachingStaff,
        v_NonTeachingStaff AS NonTeachingStaff,
        v_TotalGroups AS TotalGroups,
        v_TotalSections AS TotalSections,
        v_LastYearStudents AS LastYearStudents,
        v_LastYearTeaching AS LastYearTeachingStaff,
        v_LastYearNonTeaching AS LastYearNonTeachingStaff,
        v_LastYearGroups AS LastYearGroups,
        v_LastYearSections AS LastYearSections,
        v_StudentsGrowth AS StudentsGrowthPercentage,
        v_TeachingGrowth AS TeachingStaffGrowthPercentage,
        v_NonTeachingGrowth AS NonTeachingStaffGrowthPercentage,
        v_GroupsGrowth AS GroupsGrowthPercentage,
        v_SectionsGrowth AS SectionsGrowthPercentage,
        v_TodayAttendancePct AS TodayAttendancePercentage,
        v_UpcomingExams AS UpcomingExams;
END //

CREATE PROCEDURE sp_GetDashboardSummary(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_CampusId INT
)
BEGIN
    CALL sp_GetDashboardKPIs(p_BoardId, p_AcademicYearId, p_TargetDate, p_CampusId);
END //

-- ----------------------------------------------------------------------------------------------------
-- 2. sp_GetDashboardStudentsOverview
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardStudentsOverview//

CREATE PROCEDURE sp_GetDashboardStudentsOverview(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_CampusId INT
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
        SUM(CASE WHEN al.LevelName LIKE '%1%' OR LOWER(COALESCE(al.LevelName, '')) LIKE '%first%' OR LOWER(COALESCE(al.LevelName, '')) LIKE '%junior%' OR s.AcademicLevelId = 1 THEN 1 ELSE 0 END) AS FirstYearStudents,
        SUM(CASE WHEN al.LevelName LIKE '%2%' OR LOWER(COALESCE(al.LevelName, '')) LIKE '%second%' OR LOWER(COALESCE(al.LevelName, '')) LIKE '%senior%' OR s.AcademicLevelId = 2 THEN 1 ELSE 0 END) AS SecondYearStudents
    FROM `Students` s
    LEFT JOIN `AcademicLevels` al ON s.AcademicLevelId = al.AcademicLevelId
    WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

    -- Resultset 2: Monthly Trend
    SELECT 
        DATE_FORMAT(COALESCE(s.AdmissionDate, s.CreatedAt), '%b %Y') AS Period,
        MIN(COALESCE(s.AdmissionDate, s.CreatedAt)) AS SortDate,
        COUNT(*) AS StudentsJoined
    FROM `Students` s
    WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
      AND (s.AdmissionDate IS NOT NULL OR s.CreatedAt IS NOT NULL)
    GROUP BY DATE_FORMAT(COALESCE(s.AdmissionDate, s.CreatedAt), '%b %Y')
    ORDER BY SortDate ASC;
END //

-- ----------------------------------------------------------------------------------------------------
-- 3. sp_GetDashboardGroupDistribution
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardGroupDistribution//

CREATE PROCEDURE sp_GetDashboardGroupDistribution(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        MIN(g.GroupId) AS GroupId,
        COALESCE(NULLIF(g.GroupCode, ''), g.GroupName) AS GroupCode,
        COALESCE(g.GroupName, g.GroupCode) AS GroupName,
        COUNT(s.StudentId) AS TotalStudents,
        COUNT(s.StudentId) AS StudentCount
    FROM `Groups` g
    LEFT JOIN `Students` s ON s.GroupId = g.GroupId 
                           AND (s.IsActive = 1 OR s.IsActive IS NULL) 
                           AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
                           AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId) 
                           AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
    WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
      AND (p_BoardId IS NULL OR g.BoardId IS NULL OR g.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR g.AcademicYearId IS NULL OR g.AcademicYearId = p_AcademicYearId)
    GROUP BY COALESCE(NULLIF(g.GroupCode, ''), g.GroupName), COALESCE(g.GroupName, g.GroupCode)
    ORDER BY TotalStudents DESC, GroupName ASC;
END //

DELIMITER ;
