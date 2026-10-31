-- ====================================================================================================
-- COLLEGE MANAGEMENT SYSTEM - DASHBOARD MODULE STORED PROCEDURES (MULTI-CAMPUS ENABLED)
-- Target Database: MySQL 8.0+ Instance
-- Description: Complete, production-ready stored procedures for Dashboard KPIs, Charts, Attendance,
--              Certificate Requests, Upcoming Exams, Highlights, and Filters with strict CampusId scoping.
-- All procedures strictly support dynamic filtering with @BoardId, @AcademicYearId, and @CampusId parameters.
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
    IF p_AcademicYearId IS NOT NULL AND p_AcademicYearId > 0 THEN
        SET v_EffectiveAcademicYearId = p_AcademicYearId;
    ELSE
        SELECT AcademicYearId INTO v_EffectiveAcademicYearId
        FROM `AcademicYears` ay
        WHERE (ay.IsActive = 1 OR ay.IsActive IS NULL)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR ay.BoardId = p_BoardId)
          AND (ay.StartDate <= v_TargetDate AND ay.EndDate >= v_TargetDate)
        ORDER BY ay.StartDate DESC
        LIMIT 1;

        IF v_EffectiveAcademicYearId IS NULL THEN
            SELECT AcademicYearId INTO v_EffectiveAcademicYearId
            FROM `AcademicYears` ay
            WHERE (ay.IsActive = 1 OR ay.IsActive IS NULL)
              AND (p_BoardId IS NULL OR p_BoardId = 0 OR ay.BoardId = p_BoardId)
              AND ay.StartDate <= v_TargetDate
            ORDER BY ay.StartDate DESC
            LIMIT 1;
        END IF;

        IF v_EffectiveAcademicYearId IS NULL THEN
            SELECT AcademicYearId INTO v_EffectiveAcademicYearId
            FROM `AcademicYears` ay
            WHERE (ay.IsActive = 1 OR ay.IsActive IS NULL)
              AND (p_BoardId IS NULL OR p_BoardId = 0 OR ay.BoardId = p_BoardId)
            ORDER BY ay.StartDate ASC
            LIMIT 1;
        END IF;
    END IF;

    -- 1. Total Students mapped to StudentAdmissions (fallback to Students table)
    SELECT COUNT(*) INTO v_TotalStudents
    FROM `StudentAdmissions` sa
    WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
      AND (sa.Status IS NULL OR sa.Status = '' OR sa.Status IN ('Approved', 'Request Approved', 'Admitted', 'Active'))
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR sa.CampusId = p_CampusId)
      AND (v_EffectiveAcademicYearId IS NULL OR sa.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR sa.BoardId = p_BoardId);

    IF v_TotalStudents = 0 THEN
        SELECT COUNT(*) INTO v_TotalStudents
        FROM `Students` s
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
          AND (v_EffectiveAcademicYearId IS NULL OR s.AcademicYearId = v_EffectiveAcademicYearId)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId);
    END IF;

    -- 2. Teaching Staff Count
    SELECT COUNT(*) INTO v_TeachingStaff
    FROM `Staff` st
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR st.BoardId = p_BoardId OR st.BoardId IS NULL)
      AND (
          st.StaffType = 'Teaching' 
          OR st.StaffType = 'Both' 
          OR REPLACE(REPLACE(COALESCE(st.StaffType, ''), '-', ''), ' ', '') = 'Teaching'
          OR st.StaffType IS NULL
          OR LOWER(st.StaffType) NOT LIKE '%non%'
      );

    -- 3. Non-Teaching Staff Count
    SELECT COUNT(*) INTO v_NonTeachingStaff
    FROM `Staff` st
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR st.BoardId = p_BoardId OR st.BoardId IS NULL)
      AND (LOWER(st.StaffType) LIKE '%non%');

    -- 4. Total Groups Count
    SELECT COUNT(*) INTO v_TotalGroups
    FROM `Groups` g
    WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR g.BoardId = p_BoardId)
      AND (v_EffectiveAcademicYearId IS NULL OR g.AcademicYearId = v_EffectiveAcademicYearId);

    -- 5. Total Sections Count
    SELECT COUNT(*) INTO v_TotalSections
    FROM `Sections` sec
    WHERE (sec.IsActive = 1 OR sec.IsActive IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR sec.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR sec.BoardId = p_BoardId)
      AND (v_EffectiveAcademicYearId IS NULL OR sec.AcademicYearId = v_EffectiveAcademicYearId);

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
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR e.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR e.BoardId = p_BoardId)
      AND (v_EffectiveAcademicYearId IS NULL OR e.AcademicYearId = v_EffectiveAcademicYearId);

    -- 8. Total Subjects
    SELECT COUNT(*) INTO v_TotalSubjects
    FROM `Subjects` sub
    WHERE (sub.IsActive = 1 OR sub.IsActive IS NULL)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR sub.BoardId = p_BoardId);

    -- 9. Prior Academic Year Baseline Comparison
    IF v_EffectiveAcademicYearId IS NOT NULL THEN
        SELECT StartDate INTO v_PriorYearStartDate
        FROM `AcademicYears`
        WHERE AcademicYearId = v_EffectiveAcademicYearId;

        SELECT AcademicYearId, StartDate, EndDate 
        INTO v_PriorAcademicYearId, v_PriorYearStartDate, v_PriorYearEndDate
        FROM `AcademicYears`
        WHERE (IsActive = 1 OR IsActive IS NULL)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR BoardId = p_BoardId)
          AND StartDate < v_PriorYearStartDate
        ORDER BY StartDate DESC
        LIMIT 1;
    END IF;

    IF v_PriorAcademicYearId IS NOT NULL THEN
        SELECT COUNT(*) INTO v_LastYearStudents
        FROM `StudentAdmissions` sa
        WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR sa.CampusId = p_CampusId)
          AND sa.AcademicYearId = v_PriorAcademicYearId
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR sa.BoardId = p_BoardId);

        IF v_LastYearStudents = 0 THEN
            SELECT COUNT(*) INTO v_LastYearStudents
            FROM `Students` s
            WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
              AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
              AND s.AcademicYearId = v_PriorAcademicYearId
              AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId);
        END IF;

        SELECT COUNT(*) INTO v_LastYearGroups
        FROM `Groups` g
        WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR g.BoardId = p_BoardId)
          AND g.AcademicYearId = v_PriorAcademicYearId;

        SELECT COUNT(*) INTO v_LastYearSections
        FROM `Sections` sec
        WHERE (sec.IsActive = 1 OR sec.IsActive IS NULL)
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR sec.CampusId = p_CampusId)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR sec.BoardId = p_BoardId)
          AND sec.AcademicYearId = v_PriorAcademicYearId;

        SET v_LastYearTeaching = v_TeachingStaff;
        SET v_LastYearNonTeaching = v_NonTeachingStaff;
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

    -- Return complete KPI recordset matching DashboardSummaryResponseDto
    SELECT 
        v_TotalStudents AS TotalStudents,
        v_TeachingStaff AS TeachingStaff,
        v_NonTeachingStaff AS NonTeachingStaff,
        v_TotalGroups AS TotalGroups,
        v_TotalSections AS TotalSections,
        v_TotalStudents AS Admissions,
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
        COALESCE(v_AcademicYearName, '') AS AcademicYear,
        v_TotalSubjects AS TotalSubjects,
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
-- 2. sp_GetDashboardStudentsOverview (Month-wise Joining & Demographics)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardStudentsOverview//

CREATE PROCEDURE sp_GetDashboardStudentsOverview(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_AdmissionsCount INT DEFAULT 0;

    SELECT COUNT(*) INTO v_AdmissionsCount
    FROM `StudentAdmissions` sa
    WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
      AND (sa.Status IS NULL OR sa.Status = '' OR sa.Status IN ('Approved', 'Request Approved', 'Admitted', 'Active'))
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR sa.CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR sa.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR sa.BoardId = p_BoardId);

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
          AND (sa.Status IS NULL OR sa.Status = '' OR sa.Status IN ('Approved', 'Request Approved', 'Admitted', 'Active'))
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR sa.CampusId = p_CampusId)
          AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR sa.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR sa.BoardId = p_BoardId);

        -- Result Set 2: Monthly Admissions Trend
        SELECT 
            DATE_FORMAT(COALESCE(sa.AdmissionDate, sa.CreatedAt), '%b %Y') AS Period,
            MIN(COALESCE(sa.AdmissionDate, sa.CreatedAt)) AS SortDate,
            COUNT(*) AS StudentsJoined
        FROM `StudentAdmissions` sa
        WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
          AND (sa.Status IS NULL OR sa.Status = '' OR sa.Status IN ('Approved', 'Request Approved', 'Admitted', 'Active'))
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR sa.CampusId = p_CampusId)
          AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR sa.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR sa.BoardId = p_BoardId)
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
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
          AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId);

        SELECT 
            DATE_FORMAT(COALESCE(s.AdmissionDate, s.CreatedAt), '%b %Y') AS Period,
            MIN(COALESCE(s.AdmissionDate, s.CreatedAt)) AS SortDate,
            COUNT(*) AS StudentsJoined
        FROM `Students` s
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
          AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
          AND (s.AdmissionDate IS NOT NULL OR s.CreatedAt IS NOT NULL)
        GROUP BY DATE_FORMAT(COALESCE(s.AdmissionDate, s.CreatedAt), '%b %Y')
        ORDER BY SortDate ASC;
    END IF;
END //

-- ----------------------------------------------------------------------------------------------------
-- 3. sp_GetDashboardGroupDistribution (Students by Group)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardGroupDistribution//

CREATE PROCEDURE sp_GetDashboardGroupDistribution(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_AdmissionsCount INT DEFAULT 0;

    SELECT COUNT(*) INTO v_AdmissionsCount
    FROM `StudentAdmissions` sa
    WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR sa.CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR sa.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR sa.BoardId = p_BoardId);

    IF v_AdmissionsCount > 0 THEN
        SELECT 
            g.GroupId,
            COALESCE(NULLIF(g.GroupCode, ''), g.GroupName) AS GroupCode,
            COALESCE(g.GroupName, g.GroupCode) AS GroupName,
            COUNT(sa.AdmissionId) AS TotalStudents
        FROM `Groups` g
        LEFT JOIN `StudentAdmissions` sa ON sa.GroupId = g.GroupId 
                               AND (sa.IsActive = 1 OR sa.IsActive IS NULL) 
                               AND (p_CampusId IS NULL OR p_CampusId = 0 OR sa.CampusId = p_CampusId)
                               AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR sa.AcademicYearId = p_AcademicYearId) 
                               AND (p_BoardId IS NULL OR p_BoardId = 0 OR sa.BoardId = p_BoardId)
        WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR g.BoardId = p_BoardId)
          AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR g.AcademicYearId = p_AcademicYearId)
        GROUP BY g.GroupId, COALESCE(NULLIF(g.GroupCode, ''), g.GroupName), COALESCE(g.GroupName, g.GroupCode)
        ORDER BY TotalStudents DESC, GroupName ASC;
    ELSE
        SELECT 
            g.GroupId,
            COALESCE(NULLIF(g.GroupCode, ''), g.GroupName) AS GroupCode,
            COALESCE(g.GroupName, g.GroupCode) AS GroupName,
            COUNT(s.StudentId) AS TotalStudents
        FROM `Groups` g
        LEFT JOIN `Students` s ON s.GroupId = g.GroupId 
                               AND (s.IsActive = 1 OR s.IsActive IS NULL) 
                               AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
                               AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId) 
                               AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
        WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR g.BoardId = p_BoardId)
          AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR g.AcademicYearId = p_AcademicYearId)
        GROUP BY g.GroupId, COALESCE(NULLIF(g.GroupCode, ''), g.GroupName), COALESCE(g.GroupName, g.GroupCode)
        ORDER BY TotalStudents DESC, GroupName ASC;
    END IF;
END //

-- ----------------------------------------------------------------------------------------------------
-- 4. sp_GetDashboardStudentAttendance (Today's Student Attendance)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardStudentAttendance//

CREATE PROCEDURE sp_GetDashboardStudentAttendance(
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
    DECLARE v_PresentPct DECIMAL(5,1) DEFAULT 0.0;
    DECLARE v_AbsentPct DECIMAL(5,1) DEFAULT 0.0;
    DECLARE v_HalfDayPct DECIMAL(5,1) DEFAULT 0.0;
    DECLARE v_View VARCHAR(50);
    DECLARE v_LatestAttTime DATETIME DEFAULT NULL;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());
    SET v_View = COALESCE(p_ViewBy, 'Overall');

    -- Total Students
    SELECT COUNT(*) INTO v_TotalStudents
    FROM `Students` s
    WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId);

    IF v_TotalStudents = 0 THEN
        SELECT COUNT(*) INTO v_TotalStudents
        FROM `StudentAdmissions` sa
        WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR sa.CampusId = p_CampusId)
          AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR sa.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR sa.BoardId = p_BoardId);
    END IF;

    -- Present & Half-Day counts
    SELECT 
        COALESCE(SUM(CASE 
            WHEN (MorningStatus = 1 AND AfternoonStatus = 1) 
              OR (MorningStatus = 1 AND AfternoonStatus IS NULL) 
              OR (MorningStatus IS NULL AND AfternoonStatus = 1) THEN 1 
            ELSE 0 
        END), 0),
        COALESCE(SUM(CASE 
            WHEN ((MorningStatus = 1 AND AfternoonStatus = 2) 
              OR (MorningStatus = 2 AND AfternoonStatus = 1) 
              OR MorningStatus IN (3,4) 
              OR AfternoonStatus IN (3,4)) THEN 1 
            ELSE 0 
        END), 0)
    INTO v_Present, v_HalfDay
    FROM (
        SELECT 
            s.StudentId,
            MAX(CASE WHEN a.Session = 1 THEN a.Status ELSE NULL END) AS MorningStatus,
            MAX(CASE WHEN a.Session = 2 THEN a.Status ELSE NULL END) AS AfternoonStatus
        FROM `Students` s
        INNER JOIN `Attendances` a ON a.StudentId = s.StudentId 
                                  AND DATE(a.AttendanceDate) = v_TargetDate 
                                  AND (a.IsActive = 1 OR a.IsActive IS NULL)
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
          AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
        GROUP BY s.StudentId
    ) AS dailyAtt;

    -- Latest attendance marked time
    SELECT MAX(COALESCE(a.UpdatedAt, a.CreatedAt)) INTO v_LatestAttTime
    FROM `Attendances` a
    INNER JOIN `Students` s ON a.StudentId = s.StudentId
    WHERE DATE(a.AttendanceDate) = v_TargetDate
      AND (a.IsActive = 1 OR a.IsActive IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId);

    IF v_TotalStudents > 0 THEN
        SET v_Absent = GREATEST(0, v_TotalStudents - v_Present - v_HalfDay);
        SET v_PresentPct = ROUND((v_Present * 100.0) / v_TotalStudents, 1);
        SET v_AbsentPct = ROUND((v_Absent * 100.0) / v_TotalStudents, 1);
        SET v_HalfDayPct = ROUND((v_HalfDay * 100.0) / v_TotalStudents, 1);
        SET v_AttPct = ROUND(((v_Present + 0.5 * v_HalfDay) * 100.0) / v_TotalStudents, 1);
    ELSE
        SET v_Absent = 0;
        SET v_PresentPct = 0.0;
        SET v_AbsentPct = 0.0;
        SET v_HalfDayPct = 0.0;
        SET v_AttPct = 0.0;
    END IF;

    -- Resultset 1: Overall Summary
    SELECT 
        v_View AS ViewBy,
        v_TotalStudents AS TotalStudents,
        v_Present AS Present,
        v_Absent AS Absent,
        v_HalfDay AS HalfDay,
        v_HalfDay AS Late,
        v_AttPct AS AttendancePercentage,
        v_PresentPct AS PresentPercentage,
        v_AbsentPct AS AbsentPercentage,
        v_HalfDayPct AS HalfDayPercentage,
        v_HalfDayPct AS LatePercentage,
        v_LatestAttTime AS LastUpdatedTime;

    -- Resultset 2: Breakdown by Section or Group
    IF LOWER(v_View) IN ('section', 'sections') THEN
        SELECT 
            COALESCE(sec.SectionName, CONCAT('Section ', s.SectionId)) AS CategoryName,
            COUNT(DISTINCT s.StudentId) AS Total,
            COUNT(DISTINCT CASE WHEN a.Status = 1 THEN a.StudentId END) AS Present,
            GREATEST(0, COUNT(DISTINCT s.StudentId) - COUNT(DISTINCT CASE WHEN a.Status = 1 THEN a.StudentId END)) AS Absent,
            ROUND(COALESCE((COUNT(DISTINCT CASE WHEN a.Status = 1 THEN a.StudentId END) * 100.0) / NULLIF(COUNT(DISTINCT s.StudentId), 0), 0.0), 1) AS Percentage
        FROM `Students` s
        LEFT JOIN `Sections` sec ON s.SectionId = sec.SectionId
        LEFT JOIN `Attendances` a ON a.StudentId = s.StudentId 
                                AND DATE(a.AttendanceDate) = v_TargetDate 
                                AND (a.IsActive = 1 OR a.IsActive IS NULL)
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
          AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
        GROUP BY s.SectionId, COALESCE(sec.SectionName, CONCAT('Section ', s.SectionId))
        ORDER BY CategoryName ASC;
    ELSE
        SELECT 
            COALESCE(g.GroupName, CONCAT('Group ', s.GroupId)) AS CategoryName,
            COUNT(DISTINCT s.StudentId) AS Total,
            COUNT(DISTINCT CASE WHEN a.Status = 1 THEN a.StudentId END) AS Present,
            GREATEST(0, COUNT(DISTINCT s.StudentId) - COUNT(DISTINCT CASE WHEN a.Status = 1 THEN a.StudentId END)) AS Absent,
            ROUND(COALESCE((COUNT(DISTINCT CASE WHEN a.Status = 1 THEN a.StudentId END) * 100.0) / NULLIF(COUNT(DISTINCT s.StudentId), 0), 0.0), 1) AS Percentage
        FROM `Students` s
        LEFT JOIN `Groups` g ON s.GroupId = g.GroupId
        LEFT JOIN `Attendances` a ON a.StudentId = s.StudentId 
                                AND DATE(a.AttendanceDate) = v_TargetDate 
                                AND (a.IsActive = 1 OR a.IsActive IS NULL)
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
          AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
        GROUP BY s.GroupId, COALESCE(g.GroupName, CONCAT('Group ', s.GroupId))
        ORDER BY CategoryName ASC;
    END IF;
END //

-- ----------------------------------------------------------------------------------------------------
-- 5. sp_GetDashboardStaffAttendance (Today's Faculty Attendance)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardStaffAttendance//

CREATE PROCEDURE sp_GetDashboardStaffAttendance(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_StaffType VARCHAR(50),
    IN p_CampusId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_StaffType VARCHAR(50);
    DECLARE v_TotalStaff INT DEFAULT 0;
    DECLARE v_TeachingCount INT DEFAULT 0;
    DECLARE v_NonTeachingCount INT DEFAULT 0;
    DECLARE v_FilteredTotal INT DEFAULT 0;
    DECLARE v_Present INT DEFAULT 0;
    DECLARE v_ExplicitAbsent INT DEFAULT 0;
    DECLARE v_Absent INT DEFAULT 0;
    DECLARE v_Late INT DEFAULT 0;
    DECLARE v_OnLeave INT DEFAULT 0;
    DECLARE v_AttendancePct DECIMAL(5,2) DEFAULT 0.0;
    DECLARE v_PresentPct DECIMAL(5,2) DEFAULT 0.0;
    DECLARE v_AbsentPct DECIMAL(5,2) DEFAULT 0.0;
    DECLARE v_LatePct DECIMAL(5,2) DEFAULT 0.0;
    DECLARE v_OnLeavePct DECIMAL(5,2) DEFAULT 0.0;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());
    SET v_StaffType = COALESCE(p_StaffType, 'All Staff');

    -- Total Active Teaching & Non-Teaching Staff
    SELECT 
        COUNT(DISTINCT CASE WHEN (st.StaffType = 'Teaching' OR st.StaffType = 'Both' OR REPLACE(REPLACE(COALESCE(st.StaffType, ''), '-', ''), ' ', '') = 'Teaching' OR st.StaffType IS NULL) THEN st.Id END),
        COUNT(DISTINCT CASE WHEN (st.StaffType = 'Non-Teaching' OR st.StaffType = 'NonTeaching' OR st.StaffType = 'Non Teaching' OR REPLACE(REPLACE(COALESCE(st.StaffType, ''), '-', ''), ' ', '') = 'NonTeaching') THEN st.Id END)
    INTO v_TeachingCount, v_NonTeachingCount
    FROM `Staff` st
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR st.BoardId = p_BoardId OR st.BoardId IS NULL);

    SET v_TotalStaff = v_TeachingCount + v_NonTeachingCount;

    -- Attendance metrics
    SELECT 
        COUNT(DISTINCT st.Id),
        COUNT(DISTINCT CASE WHEN att.Status = 1 OR att.Status = 'Present' OR att.Status = '1' THEN st.Id END),
        COUNT(DISTINCT CASE WHEN att.Status = 2 OR att.Status = 'Absent' OR att.Status = '2' THEN st.Id END),
        COUNT(DISTINCT CASE WHEN att.Status = 3 OR att.Status = 'Late' OR att.Status = '3' THEN st.Id END),
        COUNT(DISTINCT CASE WHEN att.Status = 4 OR att.Status = 'Leave' OR att.Status = '4' OR slr.StaffLeaveRequestId IS NOT NULL THEN st.Id END)
    INTO v_FilteredTotal, v_Present, v_ExplicitAbsent, v_Late, v_OnLeave
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
        AND slr.Status = 2
        AND v_TargetDate BETWEEN DATE(slr.StartDate) AND DATE(slr.EndDate)
    )
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR st.BoardId = p_BoardId OR st.BoardId IS NULL);

    IF v_TotalStaff > 0 THEN
        SET v_Absent = GREATEST(0, v_TotalStaff - v_Present - v_Late - v_OnLeave);
        SET v_AttendancePct = ROUND(((v_Present + 0.5 * v_Late) * 100.0) / v_TotalStaff, 1);
        SET v_PresentPct = ROUND((v_Present * 100.0) / v_TotalStaff, 1);
        SET v_AbsentPct = ROUND((v_Absent * 100.0) / v_TotalStaff, 1);
        SET v_LatePct = ROUND((v_Late * 100.0) / v_TotalStaff, 1);
        SET v_OnLeavePct = ROUND((v_OnLeave * 100.0) / v_TotalStaff, 1);
    END IF;

    SELECT 
        v_StaffType AS StaffType,
        v_TotalStaff AS TotalStaff,
        v_Present AS Present,
        v_Absent AS Absent,
        v_Late AS Late,
        v_OnLeave AS OnLeave,
        v_AttendancePct AS AttendancePercentage,
        v_PresentPct AS PresentPercentage,
        v_AbsentPct AS AbsentPercentage,
        v_LatePct AS LatePercentage,
        v_OnLeavePct AS OnLeavePercentage,
        v_TeachingCount AS TeachingCount,
        v_NonTeachingCount AS NonTeachingCount,
        NOW() AS LastUpdatedTime;
END //

-- ----------------------------------------------------------------------------------------------------
-- 6. sp_GetDashboardCertificateRequests
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardCertificateRequests//

CREATE PROCEDURE sp_GetDashboardCertificateRequests(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_Limit INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_Limit INT;
    SET v_Limit = COALESCE(p_Limit, 6);

    -- Resultset 1: Summary Counts by Certificate Type & Status
    SELECT 
        COUNT(*) AS TotalRequests,
        SUM(CASE WHEN LOWER(COALESCE(c.CertificateType, '')) LIKE '%bonafide%' THEN 1 ELSE 0 END) AS Bonafide,
        SUM(CASE WHEN LOWER(COALESCE(c.CertificateType, '')) LIKE '%study%' THEN 1 ELSE 0 END) AS Study,
        SUM(CASE WHEN LOWER(COALESCE(c.CertificateType, '')) LIKE '%conduct%' THEN 1 ELSE 0 END) AS Conduct,
        SUM(CASE WHEN LOWER(COALESCE(c.CertificateType, '')) LIKE '%transfer%' OR LOWER(COALESCE(c.CertificateType, '')) LIKE '%tc%' THEN 1 ELSE 0 END) AS Transfer,
        SUM(CASE WHEN LOWER(COALESCE(c.CertificateType, '')) NOT LIKE '%bonafide%' 
                  AND LOWER(COALESCE(c.CertificateType, '')) NOT LIKE '%study%' 
                  AND LOWER(COALESCE(c.CertificateType, '')) NOT LIKE '%conduct%' 
                  AND LOWER(COALESCE(c.CertificateType, '')) NOT LIKE '%transfer%' 
                  AND LOWER(COALESCE(c.CertificateType, '')) NOT LIKE '%tc%' THEN 1 ELSE 0 END) AS Others,
        SUM(CASE WHEN LOWER(COALESCE(c.Status, '')) IN ('generated', 'pending', 'active') THEN 1 ELSE 0 END) AS GeneratedCount,
        SUM(CASE WHEN LOWER(COALESCE(c.Status, '')) = 'reviewed' THEN 1 ELSE 0 END) AS ReviewedCount,
        SUM(CASE WHEN LOWER(COALESCE(c.Status, '')) = 'approved' THEN 1 ELSE 0 END) AS ApprovedCount,
        SUM(CASE WHEN LOWER(COALESCE(c.Status, '')) = 'issued' THEN 1 ELSE 0 END) AS IssuedCount,
        SUM(CASE WHEN LOWER(COALESCE(c.Status, '')) IN ('cancelled', 'deleted') THEN 1 ELSE 0 END) AS CancelledCount
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (TRIM(sa.AdmissionNo) = TRIM(c.AdmissionNo) OR sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (s.StudentId = c.StudentId OR TRIM(s.AdmissionNo) = TRIM(c.AdmissionNo))
    WHERE (c.IsActive = 1 OR c.IsActive IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR sa.CampusId = p_CampusId OR s.CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR sa.AcademicYearId = p_AcademicYearId OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR sa.BoardId = p_BoardId OR s.BoardId = p_BoardId);

    -- Resultset 2: Recent Certificate Requests
    SELECT 
        c.Id,
        c.CertificateNo,
        COALESCE(c.StudentName, sa.FirstName, s.StudentName, 'Student') AS StudentName,
        c.AdmissionNo,
        c.CertificateType,
        c.IssueDate,
        COALESCE(c.Status, 'Pending') AS Status,
        c.CreatedAt
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (TRIM(sa.AdmissionNo) = TRIM(c.AdmissionNo) OR sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (s.StudentId = c.StudentId OR TRIM(s.AdmissionNo) = TRIM(c.AdmissionNo))
    WHERE (c.IsActive = 1 OR c.IsActive IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR sa.CampusId = p_CampusId OR s.CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR sa.AcademicYearId = p_AcademicYearId OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR sa.BoardId = p_BoardId OR s.BoardId = p_BoardId)
    ORDER BY c.CreatedAt DESC
    LIMIT v_Limit;
END //

-- ----------------------------------------------------------------------------------------------------
-- 7. sp_GetDashboardUpcomingExaminations & sp_GetDashboardUpcomingExams
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardUpcomingExaminations//
DROP PROCEDURE IF EXISTS sp_GetDashboardUpcomingExams//

CREATE PROCEDURE sp_GetDashboardUpcomingExaminations(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_Limit INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_Limit INT;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());
    SET v_Limit = COALESCE(p_Limit, 6);

    SELECT 
        e.ExamId AS Id,
        e.ExamId,
        e.ExamCode,
        e.ExamName,
        e.AcademicYearId,
        e.BoardId,
        e.StartDate,
        e.EndDate,
        DATE_FORMAT(e.StartDate, '%d %b %Y') AS FormattedDate,
        DATE_FORMAT(e.StartDate, '%Y-%m-%d') AS Date,
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
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR e.CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR e.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR e.BoardId = p_BoardId)
    ORDER BY e.StartDate ASC
    LIMIT v_Limit;
END //

CREATE PROCEDURE sp_GetDashboardUpcomingExams(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_Limit INT,
    IN p_CampusId INT
)
BEGIN
    CALL sp_GetDashboardUpcomingExaminations(p_BoardId, p_AcademicYearId, p_TargetDate, p_Limit, p_CampusId);
END //

-- ----------------------------------------------------------------------------------------------------
-- 8. sp_GetDashboardTodaysHighlights
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardTodaysHighlights//

CREATE PROCEDURE sp_GetDashboardTodaysHighlights(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_CampusId INT
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
    WHERE DATE(COALESCE(sa.AdmissionDate, sa.CreatedAt)) = v_TargetDate
      AND (sa.IsActive = 1 OR sa.IsActive IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR sa.CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR sa.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR sa.BoardId = p_BoardId);

    -- Certificates Today
    SELECT COUNT(*) INTO v_CertificatesToday
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (TRIM(sa.AdmissionNo) = TRIM(c.AdmissionNo) OR sa.AdmissionId = c.StudentId)
    WHERE DATE(c.CreatedAt) = v_TargetDate
      AND (c.IsActive = 1 OR c.IsActive IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR sa.CampusId = p_CampusId);

    -- Exams Today
    SELECT COUNT(*) INTO v_ExamsToday
    FROM `Examinations` e
    WHERE (e.IsActive = 1 OR e.IsActive IS NULL)
      AND v_TargetDate BETWEEN DATE(e.StartDate) AND DATE(e.EndDate)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR e.CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR e.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR e.BoardId = p_BoardId);

    -- Birthdays Today
    SELECT COUNT(*) INTO v_BirthdaysToday
    FROM `StudentAdmissions` sa
    WHERE sa.DateOfBirth IS NOT NULL
      AND MONTH(sa.DateOfBirth) = MONTH(v_TargetDate)
      AND DAY(sa.DateOfBirth) = DAY(v_TargetDate)
      AND (sa.IsActive = 1 OR sa.IsActive IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR sa.CampusId = p_CampusId);

    SELECT 
        v_AdmissionsToday AS AdmissionsToday,
        v_CertificatesToday AS CertificatesToday,
        v_ExamsToday AS ExamsToday,
        v_BirthdaysToday AS BirthdaysToday;
END //

-- ----------------------------------------------------------------------------------------------------
-- 9. sp_GetDashboardFilters
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardFilters//

CREATE PROCEDURE sp_GetDashboardFilters()
BEGIN
    -- Resultset 1: Academic Years
    SELECT 
        AcademicYearId AS Id,
        COALESCE(BoardId, AcademicYearId) AS BoardId,
        COALESCE(AcademicYearName, '') AS Name,
        COALESCE(AcademicYearName, '') AS Code,
        COALESCE(IsActive, 1) AS IsActive,
        CASE WHEN CURDATE() BETWEEN StartDate AND EndDate THEN 1 ELSE 0 END AS IsCurrent
    FROM `AcademicYears`
    WHERE (IsActive = 1 OR IsActive IS NULL)
    ORDER BY StartDate DESC;

    -- Resultset 2: Boards
    SELECT 
        BoardId AS Id,
        BoardId,
        COALESCE(BoardName, '') AS Name,
        COALESCE(BoardCode, BoardName, '') AS Code,
        COALESCE(IsActive, 1) AS IsActive
    FROM `Boards`
    WHERE (IsActive = 1 OR IsActive IS NULL)
    ORDER BY BoardName ASC;
END //

-- ----------------------------------------------------------------------------------------------------
-- 10. sp_GetDashboardWeeklyAttendance
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardWeeklyAttendance//

CREATE PROCEDURE sp_GetDashboardWeeklyAttendance(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_CampusId INT
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
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
    GROUP BY DATE(a.AttendanceDate)
    ORDER BY DATE(a.AttendanceDate) ASC;
END //

-- ----------------------------------------------------------------------------------------------------
-- 11. sp_GetDashboardFacultyWorkload
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardFacultyWorkload//

CREATE PROCEDURE sp_GetDashboardFacultyWorkload(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_CampusId INT
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
    LEFT JOIN `StaffSubjectAllocations` sa ON s.Id = sa.StaffId
    WHERE (s.IsDeleted = 0 OR s.IsDeleted IS NULL)
      AND (s.Status = 'Active' OR s.Status IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId OR s.BoardId IS NULL)
      AND (
          s.StaffType = 'Teaching' 
          OR s.StaffType = 'Both' 
          OR REPLACE(REPLACE(COALESCE(s.StaffType, ''), '-', ''), ' ', '') = 'Teaching'
          OR s.StaffType IS NULL
      )
    GROUP BY s.Id, s.FirstName, s.LastName, d.DepartmentName
    ORDER BY HoursPerWeek DESC, FacultyName ASC
    LIMIT 20;
END //

-- ----------------------------------------------------------------------------------------------------
-- 12. sp_GetDashboardUpcomingHolidays
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardUpcomingHolidays//

CREATE PROCEDURE sp_GetDashboardUpcomingHolidays(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_Limit INT,
    IN p_CampusId INT
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
        h.HolidayName AS Name,
        h.HolidayName,
        COALESCE(h.HolidayType, 'Festival Holiday') AS HolidayType,
        COALESCE(h.AppliesTo, 'All Students & Staff') AS AppliesTo,
        COALESCE(h.DateType, 'Single Day') AS DateType,
        h.StartDate,
        h.EndDate,
        COALESCE(DATEDIFF(h.EndDate, h.StartDate) + 1, 1) AS TotalDays,
        COALESCE(h.Description, '') AS Description,
        COALESCE(h.Status, 'Active') AS Status,
        DATEDIFF(h.StartDate, CURDATE()) AS DaysRemaining,
        CASE 
            WHEN CURDATE() BETWEEN h.StartDate AND h.EndDate THEN 'Ongoing'
            WHEN DATEDIFF(h.StartDate, CURDATE()) = 0 THEN 'Today'
            WHEN DATEDIFF(h.StartDate, CURDATE()) = 1 THEN 'Tomorrow'
            WHEN DATEDIFF(h.StartDate, CURDATE()) > 1 THEN CONCAT('In ', DATEDIFF(h.StartDate, CURDATE()), ' Days')
            ELSE 'Upcoming'
        END AS CountdownText
    FROM `Holidays` h
    WHERE (h.IsDeleted = 0 OR h.IsDeleted IS NULL)
      AND (h.Status = 'Active' OR h.Status IS NULL)
      AND h.EndDate >= CURDATE()
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR h.CampusId = p_CampusId OR h.CampusId IS NULL)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR h.AcademicYearId = p_AcademicYearId OR h.AcademicYearId IS NULL)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR h.BoardId = p_BoardId OR h.BoardId IS NULL)
    ORDER BY h.StartDate ASC
    LIMIT v_Limit;
END //

-- ----------------------------------------------------------------------------------------------------
-- 13. sp_GetDashboardRecentActivity
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDashboardRecentActivity//

CREATE PROCEDURE sp_GetDashboardRecentActivity(
    IN p_Limit INT
)
BEGIN
    DECLARE v_Limit INT DEFAULT 15;
    IF p_Limit IS NOT NULL AND p_Limit > 0 THEN
        SET v_Limit = p_Limit;
    END IF;

    (
        SELECT 
            CONCAT('adm-', sa.AdmissionId) AS ActivityId,
            'New Student Admission' AS Title,
            CONCAT('Student ', sa.FirstName, ' ', COALESCE(sa.LastName, ''), ' admitted.') AS Description,
            sa.CreatedAt AS Timestamp,
            'Admission' AS ActivityType,
            'green' AS Tone
        FROM `StudentAdmissions` sa
        WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
        ORDER BY sa.CreatedAt DESC
        LIMIT v_Limit
    )
    UNION ALL
    (
        SELECT 
            CONCAT('cert-', c.Id) AS ActivityId,
            'Certificate Issued' AS Title,
            CONCAT(c.CertificateType, ' request for ', COALESCE(c.StudentName, 'Student')) AS Description,
            c.CreatedAt AS Timestamp,
            'Certificate' AS ActivityType,
            'purple' AS Tone
        FROM `certificates` c
        WHERE (c.IsActive = 1 OR c.IsActive IS NULL)
        ORDER BY c.CreatedAt DESC
        LIMIT v_Limit
    )
    ORDER BY Timestamp DESC
    LIMIT v_Limit;
END //

DELIMITER ;
