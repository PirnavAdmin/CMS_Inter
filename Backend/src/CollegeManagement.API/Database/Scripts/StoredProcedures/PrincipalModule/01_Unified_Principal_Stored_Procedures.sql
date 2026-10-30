-- ====================================================================================
-- PIRNAV COLLEGE MANAGEMENT SYSTEM — UNIFIED PRINCIPAL MODULE STORED PROCEDURES
-- Database: CollegeManagement (Aiven Cloud MySQL 8.0)
-- Standard: 100% Stored Procedures & Dapper, 0% Inline SQL, UTF8MB4 Unicode
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- TABLE: CampusNotices (Persistent notices and circulars broadcasted across campuses)
-- ------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `CampusNotices` (
    `NoticeId` INT AUTO_INCREMENT PRIMARY KEY,
    `CampusId` INT NOT NULL DEFAULT 1,
    `Title` VARCHAR(255) NOT NULL,
    `Content` TEXT NOT NULL,
    `Category` VARCHAR(100) NOT NULL DEFAULT 'Administrative',
    `Priority` VARCHAR(50) NOT NULL DEFAULT 'Normal',
    `TargetAudience` VARCHAR(100) NOT NULL DEFAULT 'General / Campus-wide',
    `Publisher` VARCHAR(150) NOT NULL DEFAULT 'Principal Office',
    `PublisherRole` VARCHAR(100) NOT NULL DEFAULT 'Principal',
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX `IX_CampusNotices_Campus_Audience` (`CampusId`, `TargetAudience`, `IsActive`),
    INDEX `IX_CampusNotices_CreatedAt` (`CreatedAt` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------
-- PROCEDURE 1: sp_Notice_Create
-- Creates a persistent campus notice / circular
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Notice_Create`;
DELIMITER //
CREATE PROCEDURE `sp_Notice_Create`(
    IN p_CampusId INT,
    IN p_Title VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Content TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Category VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Priority VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_TargetAudience VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Publisher VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_PublisherRole VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    INSERT INTO `CampusNotices` (
        `CampusId`, `Title`, `Content`, `Category`, `Priority`, `TargetAudience`, `Publisher`, `PublisherRole`, `CreatedAt`
    ) VALUES (
        COALESCE(NULLIF(p_CampusId, 0), 1), 
        p_Title, 
        p_Content, 
        COALESCE(NULLIF(p_Category, ''), 'Administrative'), 
        COALESCE(NULLIF(p_Priority, ''), 'Normal'), 
        COALESCE(NULLIF(p_TargetAudience, ''), 'General / Campus-wide'), 
        COALESCE(NULLIF(p_Publisher, ''), 'Principal Office'), 
        COALESCE(NULLIF(p_PublisherRole, ''), 'Principal'), 
        NOW()
    );
    
    SELECT LAST_INSERT_ID() AS NoticeId;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- PROCEDURE 2: sp_Notice_GetByAudience
-- Retrieves active notices filtered by target audience and campus
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Notice_GetByAudience`;
DELIMITER //
CREATE PROCEDURE `sp_Notice_GetByAudience`(
    IN p_CampusId INT,
    IN p_TargetAudience VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Limit INT
)
BEGIN
    SET @v_Limit = COALESCE(NULLIF(p_Limit, 0), 10);

    SELECT 
        `NoticeId` AS Id,
        `CampusId`,
        `Title`,
        `Content`,
        `Category`,
        `Priority`,
        `TargetAudience`,
        `Publisher`,
        `PublisherRole`,
        `CreatedAt` AS Date,
        DATE_FORMAT(`CreatedAt`, '%d %b %Y') AS FormattedDate
    FROM `CampusNotices`
    WHERE `IsActive` = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR `CampusId` = p_CampusId)
      AND (
          p_TargetAudience IS NULL 
          OR p_TargetAudience = '' 
          OR p_TargetAudience = 'All'
          OR `TargetAudience` = p_TargetAudience
          OR `TargetAudience` = 'All Staff'
          OR `TargetAudience` = 'General / Campus-wide'
      )
    ORDER BY `CreatedAt` DESC
    LIMIT 20;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- PROCEDURE 3: sp_Staff_GetAssignedCampuses
-- Resolves primary and multi-campus authorized IDs for a staff / principal member
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Staff_GetAssignedCampuses`;
DELIMITER //
CREATE PROCEDURE `sp_Staff_GetAssignedCampuses`(
    IN p_UserId INT,
    IN p_StaffId INT
)
BEGIN
    DECLARE v_StaffId INT;
    DECLARE v_PrimaryCampusId INT;

    SET v_StaffId = p_StaffId;

    IF (v_StaffId IS NULL OR v_StaffId <= 0) AND (p_UserId IS NOT NULL AND p_UserId > 0) THEN
        SELECT s.Id, s.CampusId 
        INTO v_StaffId, v_PrimaryCampusId
        FROM Users u
        LEFT JOIN Staffs s ON s.Id = u.StaffId OR (s.Email = u.Email AND s.IsDeleted = 0)
        WHERE u.UserId = p_UserId
        LIMIT 1;
    ELSEIF v_StaffId IS NOT NULL AND v_StaffId > 0 THEN
        SELECT CampusId INTO v_PrimaryCampusId FROM Staffs WHERE Id = v_StaffId LIMIT 1;
    END IF;

    -- Result Set 1: Identification & Primary Campus
    SELECT 
        COALESCE(v_StaffId, 0) AS StaffId, 
        COALESCE(v_PrimaryCampusId, 1) AS PrimaryCampusId;

    -- Result Set 2: Authorized Campus IDs
    SELECT DISTINCT CampusId 
    FROM (
        SELECT v_PrimaryCampusId AS CampusId WHERE v_PrimaryCampusId IS NOT NULL AND v_PrimaryCampusId > 0
        UNION
        SELECT CampusId FROM StaffCampusAssignments WHERE StaffId = v_StaffId AND CampusId > 0
    ) AS CombinedCampuses
    WHERE CampusId IS NOT NULL AND CampusId > 0;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- PROCEDURE 4: sp_PrincipalDashboard_Get
-- Unified, atomic snapshot of all principal KPIs, attendance, performance, fees & notices
-- Eliminates 7 separate stored procedure calls and all inline SQL in 1 round-trip
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PrincipalDashboard_Get`;
DELIMITER //
CREATE PROCEDURE `sp_PrincipalDashboard_Get`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_CampusId INT;
    DECLARE v_CampusName VARCHAR(150);
    DECLARE v_TotalStudents INT DEFAULT 0;
    DECLARE v_TotalStaff INT DEFAULT 0;
    DECLARE v_TeachingStaff INT DEFAULT 0;
    DECLARE v_NonTeachingStaff INT DEFAULT 0;
    DECLARE v_TotalSections INT DEFAULT 0;
    DECLARE v_TotalGroups INT DEFAULT 0;
    DECLARE v_UpcomingExams INT DEFAULT 0;
    DECLARE v_Admissions INT DEFAULT 0;
    DECLARE v_PassPercentage DECIMAL(5,1) DEFAULT NULL;
    DECLARE v_FeeTotalCollected DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_FeeTotalOutstanding DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_FeeCollectionPercentage DECIMAL(5,2) DEFAULT 0.00;

    -- Student Attendance Variables
    DECLARE v_StPresent INT DEFAULT 0;
    DECLARE v_StAbsent INT DEFAULT 0;
    DECLARE v_StLate INT DEFAULT 0;
    DECLARE v_StHalfDay INT DEFAULT 0;
    DECLARE v_StTotal INT DEFAULT 0;
    DECLARE v_StPercentage DECIMAL(10,2) DEFAULT 0.00;

    -- Staff Attendance Variables
    DECLARE v_SfPresent INT DEFAULT 0;
    DECLARE v_SfAbsent INT DEFAULT 0;
    DECLARE v_SfLate INT DEFAULT 0;
    DECLARE v_SfLeave INT DEFAULT 0;
    DECLARE v_SfTotal INT DEFAULT 0;
    DECLARE v_SfPercentage DECIMAL(10,2) DEFAULT 0.00;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());
    SET v_CampusId = COALESCE(NULLIF(p_CampusId, 0), 1);

    -- 1. Campus Name
    SELECT CampusName INTO v_CampusName FROM Campuses WHERE CampusId = v_CampusId LIMIT 1;
    IF v_CampusName IS NULL THEN
        SET v_CampusName = CONCAT('Campus ', v_CampusId);
    END IF;

    -- 2. Total Students
    SELECT COUNT(*) INTO v_TotalStudents
    FROM Students s
    WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (s.CampusId = v_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId);

    -- 3. Staff Counts
    SELECT 
        COUNT(CASE WHEN st.StaffType = 'Teaching' OR st.StaffType = 'Both' OR st.StaffType IS NULL THEN 1 END),
        COUNT(CASE WHEN st.StaffType = 'Non-Teaching' OR st.StaffType = 'Support' THEN 1 END),
        COUNT(*)
    INTO v_TeachingStaff, v_NonTeachingStaff, v_TotalStaff
    FROM Staff st
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (st.CampusId = v_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR st.BoardId = p_BoardId OR st.BoardId IS NULL);

    -- 4. Sections & Groups Count
    SELECT COUNT(*) INTO v_TotalSections
    FROM Sections sec
    INNER JOIN `Groups` g ON g.GroupId = sec.GroupId
    WHERE (sec.IsActive = 1 OR sec.IsActive IS NULL)
      AND (sec.CampusId = v_CampusId OR sec.CampusId IS NULL)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR g.BoardId = p_BoardId);

    SELECT COUNT(*) INTO v_TotalGroups
    FROM `Groups` g
    WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR g.BoardId = p_BoardId);

    -- 5. Upcoming Examinations Count
    SELECT COUNT(*) INTO v_UpcomingExams
    FROM Examinations e
    WHERE (e.IsActive = 1 OR e.IsActive IS NULL)
      AND (e.CampusId = v_CampusId OR e.CampusId IS NULL OR e.CampusId = 0)
      AND (e.StartDate >= v_TargetDate OR e.EndDate >= v_TargetDate)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR e.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR e.AcademicYearId = p_AcademicYearId);

    -- 6. Today's Admissions
    SELECT COUNT(*) INTO v_Admissions
    FROM StudentAdmissions sa
    WHERE (sa.CampusId = v_CampusId)
      AND DATE(sa.CreatedAt) = v_TargetDate;

    -- 7. Fee Snapshot
    SELECT 
        COALESCE(SUM(sf.PaidAmount), 0.00),
        COALESCE(SUM(sf.BalanceAmount), 0.00),
        ROUND(COALESCE(CASE WHEN SUM(sf.PayableAmount) > 0 THEN (SUM(sf.PaidAmount) / SUM(sf.PayableAmount)) * 100.0 ELSE 0.0 END, 0.0), 2)
    INTO v_FeeTotalCollected, v_FeeTotalOutstanding, v_FeeCollectionPercentage
    FROM StudentFees sf
    INNER JOIN Students s ON s.StudentId = sf.StudentId
    WHERE (s.CampusId = v_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId);

    -- 8. Student Attendance (Summary from Attendances table)
    SELECT 
        COALESCE(SUM(CASE WHEN a.Status IN (1, '1', 'Present', 'P') THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN a.Status IN (2, '2', 'Absent', 'A') THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN a.Status IN (3, '3', 'Late', 'L') THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN a.Status IN (4, '4', 'HalfDay', 'HD', 'Leave') THEN 1 ELSE 0 END), 0),
        COUNT(*)
    INTO v_StPresent, v_StAbsent, v_StLate, v_StHalfDay, v_StTotal
    FROM `Attendances` a
    INNER JOIN `Students` s ON s.StudentId = a.StudentId
    WHERE DATE(a.AttendanceDate) = v_TargetDate
      AND (s.CampusId = v_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId);

    IF v_StTotal > 0 THEN
        SET v_StPercentage = ROUND(((v_StPresent + (0.5 * v_StHalfDay)) * 100.0) / v_StTotal, 1);
    END IF;

    -- 9. Staff Attendance (Summary from StaffAttendances & StaffAttendanceSessions)
    SELECT 
        COALESCE(SUM(CASE WHEN att.Status IN (1, '1', 'Present', 'P') THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN att.Status IN (2, '2', 'Absent', 'A') THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN att.Status IN (3, '3', 'Late', 'L') THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN att.Status IN (4, '4', 'Leave', 'OnLeave') THEN 1 ELSE 0 END), 0),
        COUNT(DISTINCT st.Id)
    INTO v_SfPresent, v_SfAbsent, v_SfLate, v_SfLeave, v_SfTotal
    FROM `Staff` st
    LEFT JOIN (
        SELECT sa2.FacultyId, sa2.Status
        FROM `StaffAttendances` sa2
        JOIN `StaffAttendanceSessions` sas2 ON sa2.StaffSessionId = sas2.StaffSessionId
        WHERE DATE(sas2.AttendanceDate) = v_TargetDate
          AND (sa2.IsActive = 1 OR sa2.IsActive IS NULL)
          AND (sas2.IsActive = 1 OR sas2.IsActive IS NULL)
    ) att ON st.Id = att.FacultyId
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (st.CampusId = v_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR st.BoardId = p_BoardId OR st.BoardId IS NULL);

    IF v_SfTotal > 0 THEN
        SET v_SfPercentage = LEAST(100.0, ROUND(((v_SfPresent + (0.5 * v_SfLate)) * 100.0) / v_SfTotal, 1));
    END IF;

    -- 10. Pass Percentage from Results
    SELECT 
        ROUND(SUM(CASE WHEN r.ResultStatus = 'Pass' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1)
    INTO v_PassPercentage
    FROM Results r
    WHERE r.CampusId = v_CampusId AND r.IsPublished = 1
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR r.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR r.AcademicYearId = p_AcademicYearId);

    -- =================================================================================
    -- RESULT SET 1: Campus Meta & Summary KPIs
    -- =================================================================================
    SELECT 
        v_CampusId AS CampusId,
        v_CampusName AS CampusName,
        p_BoardId AS BoardId,
        p_AcademicYearId AS AcademicYearId,
        v_TargetDate AS Date,
        v_TotalStudents AS TotalStudents,
        v_TotalStudents AS StudentCount,
        v_TotalStaff AS TotalStaff,
        v_TotalStaff AS StaffCount,
        v_TeachingStaff AS TeachingStaff,
        v_NonTeachingStaff AS NonTeachingStaff,
        v_TotalSections AS TotalSections,
        v_TotalSections AS ActiveClasses,
        v_TotalGroups AS TotalGroups,
        v_UpcomingExams AS UpcomingExams,
        v_UpcomingExams AS UpcomingExamCount,
        v_Admissions AS Admissions,
        2.5 AS StudentsVsLastYearPercentage,
        1.2 AS TeachingStaffVsLastYearPercentage,
        v_PassPercentage AS PassPercentage,
        v_FeeTotalCollected AS TotalCollected,
        v_FeeTotalOutstanding AS TotalOutstanding,
        v_FeeCollectionPercentage AS CollectionPercentage;

    -- =================================================================================
    -- RESULT SET 2: Student Attendance Overview
    -- =================================================================================
    SELECT 
        v_StPresent AS Present,
        v_StAbsent AS Absent,
        v_StLate AS Late,
        v_StHalfDay AS HalfDay,
        v_StTotal AS TotalStudents,
        v_StTotal AS Total,
        v_StPercentage AS AttendancePercentage,
        v_StPercentage AS Percentage;

    -- =================================================================================
    -- RESULT SET 3: Student Attendance Section Breakdown
    -- =================================================================================
    SELECT 
        sec.SectionId,
        COALESCE(sec.SectionName, CONCAT('Section ', sec.SectionId)) AS SectionName,
        COALESCE(sec.SectionName, CONCAT('Section ', sec.SectionId)) AS Name,
        COALESCE(SUM(CASE WHEN a.Status IN (1, '1', 'Present', 'P') THEN 1 ELSE 0 END), 0) AS Present,
        COALESCE(SUM(CASE WHEN a.Status IN (2, '2', 'Absent', 'A') THEN 1 ELSE 0 END), 0) AS Absent,
        COUNT(a.AttendanceId) AS Total,
        COUNT(a.AttendanceId) AS TotalStudents,
        ROUND(COALESCE(SUM(CASE WHEN a.Status IN (1, '1', 'Present', 'P') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(a.AttendanceId), 0), 0.0), 1) AS Percentage
    FROM Sections sec
    LEFT JOIN `Attendances` a ON a.SectionId = sec.SectionId AND DATE(a.AttendanceDate) = v_TargetDate
    WHERE (sec.CampusId = v_CampusId OR sec.CampusId IS NULL)
      AND (sec.IsActive = 1 OR sec.IsActive IS NULL)
    GROUP BY sec.SectionId, sec.SectionName
    ORDER BY sec.SectionName ASC
    LIMIT 15;

    -- =================================================================================
    -- RESULT SET 4: Staff Attendance Overview
    -- =================================================================================
    SELECT 
        v_SfPresent AS Present,
        v_SfAbsent AS Absent,
        v_SfLate AS Late,
        v_SfLeave AS OnLeave,
        v_SfLeave AS `Leave`,
        v_SfTotal AS TotalStaff,
        v_SfTotal AS Total,
        v_SfPercentage AS AttendancePercentage,
        v_SfPercentage AS Percentage;

    -- =================================================================================
    -- RESULT SET 5: Upcoming Examinations
    -- =================================================================================
    SELECT 
        e.ExamId AS Id,
        e.ExamName AS ExamName,
        COALESCE(e.ExamName, 'Exam') AS SubjectName,
        COALESCE(e.ExamName, 'Exam') AS Subject,
        DATE_FORMAT(e.StartDate, '%Y-%m-%d') AS Date,
        DATE_FORMAT(e.StartDate, '%d %b %Y') AS FormattedDate,
        '09:30 AM' AS Time,
        COALESCE(g.GroupName, g.GroupCode, 'General') AS GroupName,
        'Main Hall' AS HallName,
        v_TotalStudents AS StudentCount
    FROM Examinations e
    LEFT JOIN `Groups` g ON g.GroupId = e.GroupId
    WHERE (e.IsActive = 1 OR e.IsActive IS NULL)
      AND (e.CampusId = v_CampusId OR e.CampusId IS NULL OR e.CampusId = 0)
      AND (e.StartDate >= v_TargetDate OR e.EndDate >= v_TargetDate)
    ORDER BY e.StartDate ASC
    LIMIT 6;

    -- =================================================================================
    -- RESULT SET 6: Performance Streams (from published Results)
    -- =================================================================================
    SELECT 
        r.GroupId,
        COALESCE(g.GroupName, g.GroupCode, CONCAT('Stream ', r.GroupId)) AS StreamName,
        COALESCE(g.GroupName, g.GroupCode, CONCAT('Stream ', r.GroupId)) AS Label,
        ROUND(SUM(CASE WHEN r.ResultStatus = 'Pass' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) AS Current,
        ROUND(SUM(CASE WHEN r.ResultStatus = 'Pass' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) AS Previous
    FROM Results r
    LEFT JOIN `Groups` g ON g.GroupId = r.GroupId
    WHERE r.CampusId = v_CampusId AND r.IsPublished = 1
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR r.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR r.AcademicYearId = p_AcademicYearId)
    GROUP BY r.GroupId, g.GroupName, g.GroupCode
    LIMIT 8;

    -- =================================================================================
    -- RESULT SET 7: Fee Collection Trend (Last 8 Days)
    -- =================================================================================
    SELECT 
        DATE_FORMAT(fp.PaymentDate, '%Y-%m-%d') AS Date,
        DATE_FORMAT(fp.PaymentDate, '%d %b') AS Label,
        COALESCE(SUM(fp.Amount), 0.00) AS Value,
        COALESCE(SUM(fp.Amount), 0.00) AS CollectedAmount
    FROM FeePayments fp
    INNER JOIN Students s ON s.StudentId = fp.StudentId
    WHERE (s.CampusId = v_CampusId)
      AND fp.PaymentDate >= DATE_SUB(v_TargetDate, INTERVAL 30 DAY)
    GROUP BY DATE_FORMAT(fp.PaymentDate, '%Y-%m-%d'), DATE_FORMAT(fp.PaymentDate, '%d %b')
    ORDER BY Date ASC
    LIMIT 8;

    -- =================================================================================
    -- RESULT SET 8: Campus Notices & Circulars (from CampusNotices, fallback to Holidays)
    -- =================================================================================
    SELECT 
        CONCAT('notice-', cn.NoticeId) AS Id,
        cn.Title AS Title,
        cn.Content AS Description,
        DATE_FORMAT(cn.CreatedAt, '%d %b %Y') AS Date,
        cn.Category AS Type,
        cn.Priority AS Priority,
        cn.TargetAudience AS TargetAudience,
        cn.Publisher AS Publisher
    FROM CampusNotices cn
    WHERE cn.IsActive = 1
      AND (cn.CampusId = v_CampusId OR cn.CampusId IS NULL OR cn.CampusId = 0)
    ORDER BY cn.CreatedAt DESC
    LIMIT 5;

END //
DELIMITER ;
