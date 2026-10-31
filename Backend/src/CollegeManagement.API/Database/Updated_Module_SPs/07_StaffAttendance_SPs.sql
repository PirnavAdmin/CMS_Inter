-- =====================================================================================
-- CMS_Inter — Staff Attendance Module Stored Procedures
-- File: 07_StaffAttendance_SPs.sql
-- Covers: Administrative Loading, Bulk Save, Single Update, Monthly Matrix Reports,
--         Biometric Self-Service Punch-In/Out, History Analytics, Regularization Review,
--         Yearly Academic Overview, and Staff Resolution.
-- Architecture: MySQL 8.0+ Stored Procedures with Dapper Execution & Campus Multi-Tenancy
-- =====================================================================================

DELIMITER $$

-- -------------------------------------------------------------------------------------
-- 1. sp_LoadStaffAttendance
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_LoadStaffAttendance$$
CREATE PROCEDURE sp_LoadStaffAttendance(
    IN p_AttendanceDate DATETIME,
    IN p_StaffType TINYINT,       -- 1 = Teaching, 2 = Non-Teaching, NULL = All
    IN p_DepartmentId INT,        -- NULL or 0 = All
    IN p_BoardId INT,             -- NULL or 0 = All
    IN p_FacultyId INT,           -- NULL or 0 = Specific staff
    IN p_Status TINYINT,          -- NULL = All statuses
    IN p_CampusId INT             -- NULL or 0 = All campuses
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_NextDate DATE;
    DECLARE v_IsHoliday INT DEFAULT 0;

    SET v_TargetDate = DATE(p_AttendanceDate);
    SET v_NextDate = DATE_ADD(v_TargetDate, INTERVAL 1 DAY);

    -- Check if target date is an official holiday for staff
    SELECT COUNT(1) INTO v_IsHoliday
    FROM `Holidays` h
    WHERE h.IsDeleted = 0
      AND h.Status = 'Active'
      AND v_TargetDate >= DATE(h.StartDate)
      AND v_TargetDate <= DATE(h.EndDate)
      AND (h.AppliesTo = 'All Students & Staff' OR h.AppliesTo = 'Staff Only')
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR h.CampusId = p_CampusId);

    -- Main query with index seeks and clean left joins
    SELECT 
        s.Id AS FacultyId,
        COALESCE(NULLIF(s.EmployeeId, ''), CONCAT(IF(p_StaffType = 2 OR LOWER(s.StaffType) LIKE '%non%', 'NTS', 'FAC'), LPAD(s.Id, 3, '0'))) AS EmployeeId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        s.DepartmentId,
        COALESCE(d.DepartmentName, NULLIF(s.Department, ''), 'General') AS DepartmentName,
        COALESCE(des.Name, NULLIF(s.Designation, ''), 'Staff') AS DesignationName,
        CASE 
            WHEN LOWER(s.StaffType) LIKE '%non%' THEN 2 
            ELSE 1 
        END AS StaffType,
        CASE 
            WHEN sa.StaffAttendanceId IS NOT NULL THEN sa.Status
            WHEN lr.LeaveRequestId IS NOT NULL THEN 6  -- Leave
            WHEN v_IsHoliday > 0 THEN 5              -- Holiday
            ELSE NULL
        END AS Status,
        CASE 
            WHEN sa.StaffAttendanceId IS NOT NULL OR lr.LeaveRequestId IS NOT NULL OR v_IsHoliday > 0 THEN 1 
            ELSE 0 
        END AS IsAttendanceMarked,
        sa.InTime,
        sa.OutTime,
        COALESCE(sa.VerificationMethod, 1) AS VerificationMethod,
        CASE 
            WHEN sa.Remarks IS NOT NULL AND sa.Remarks != '' THEN sa.Remarks
            WHEN lr.LeaveRequestId IS NOT NULL THEN CONCAT('Approved Leave: ', COALESCE(lr.Reason, ''))
            WHEN v_IsHoliday > 0 THEN 'Official Holiday'
            ELSE NULL
        END AS Remarks,
        CASE 
            WHEN sa.Status = 3 THEN 1
            WHEN tc.Id IS NOT NULL AND sa.InTime IS NOT NULL AND sa.InTime > COALESCE(NULLIF(tc.LateThreshold, '00:00:00'), ADDTIME(tc.WorkStartTime, SEC_TO_TIME(tc.GracePeriodMinutes * 60))) THEN 1
            ELSE 0
        END AS IsLate,
        CASE 
            WHEN tc.Id IS NOT NULL AND sa.OutTime IS NOT NULL AND sa.OutTime < tc.EarlyCheckoutThreshold THEN 1
            ELSE 0
        END AS IsEarlyCheckout
    FROM `Staffs` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN `Designations` des ON s.DesignationId = des.Id
    LEFT JOIN `StaffAttendanceSessions` sas ON sas.AttendanceDate >= v_TargetDate 
                                          AND sas.AttendanceDate < v_NextDate
                                          AND (p_CampusId IS NULL OR p_CampusId <= 0 OR sas.CampusId = p_CampusId)
                                          AND (p_StaffType IS NULL OR p_StaffType <= 0 OR sas.StaffType = p_StaffType)
    LEFT JOIN `StaffAttendances` sa ON sa.StaffSessionId = sas.StaffSessionId 
                                   AND sa.FacultyId = s.Id 
                                   AND sa.IsActive = 1
    LEFT JOIN `StaffLeaveRequests` lr ON lr.StaffId = s.Id 
                                     AND lr.IsActive = 1 
                                     AND lr.Status = 2  -- Approved
                                     AND v_TargetDate >= DATE(lr.StartDate) 
                                     AND v_TargetDate <= DATE(lr.EndDate)
    LEFT JOIN `AttendanceTimingConfigs` tc ON tc.IsActive = 1 
                                         AND (tc.StaffType IS NULL OR tc.StaffType = p_StaffType)
                                         AND (tc.DepartmentId IS NULL OR tc.DepartmentId = s.DepartmentId)
    WHERE s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR s.BoardId = p_BoardId OR s.BoardId IS NULL OR s.BoardId = 0)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR s.DepartmentId = p_DepartmentId)
      AND (p_FacultyId IS NULL OR p_FacultyId <= 0 OR s.Id = p_FacultyId)
      AND (p_StaffType IS NULL OR p_StaffType <= 0 
           OR (p_StaffType = 1 AND (s.StaffType IS NULL OR LOWER(s.StaffType) = 'teaching'))
           OR (p_StaffType = 2 AND s.StaffType IS NOT NULL AND LOWER(s.StaffType) != 'teaching'))
      AND (p_Status IS NULL OR p_Status <= 0 
           OR (p_Status = 1 AND sa.Status = 1)
           OR (p_Status = 2 AND (sa.Status = 2 OR (sa.StaffAttendanceId IS NULL AND lr.LeaveRequestId IS NULL AND v_IsHoliday = 0)))
           OR (p_Status = 3 AND sa.Status = 3)
           OR (p_Status = 5 AND (sa.Status = 5 OR v_IsHoliday > 0))
           OR (p_Status = 6 AND (sa.Status = 6 OR lr.LeaveRequestId IS NOT NULL)))
    ORDER BY s.FirstName ASC, s.LastName ASC;
END$$


-- -------------------------------------------------------------------------------------
-- 2. sp_BulkSaveStaffAttendanceSession
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_BulkSaveStaffAttendanceSession$$
CREATE PROCEDURE sp_BulkSaveStaffAttendanceSession(
    IN p_AttendanceDate DATETIME,
    IN p_StaffType TINYINT,
    IN p_DepartmentId INT,
    IN p_CampusId INT,
    IN p_TotalStaffCount INT,
    IN p_PresentCount INT,
    IN p_AbsentCount INT,
    IN p_LateCount INT,
    IN p_LeaveCount INT,
    IN p_Remarks VARCHAR(500),
    IN p_CreatedByUserId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_SessionId INT DEFAULT 0;

    SET v_TargetDate = DATE(p_AttendanceDate);

    SELECT StaffSessionId INTO v_SessionId
    FROM `StaffAttendanceSessions`
    WHERE DATE(AttendanceDate) = v_TargetDate
      AND StaffType = p_StaffType
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR DepartmentId = p_DepartmentId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId)
    LIMIT 1;

    IF v_SessionId > 0 THEN
        UPDATE `StaffAttendanceSessions`
        SET TotalStaffCount = p_TotalStaffCount,
            PresentCount = p_PresentCount,
            AbsentCount = p_AbsentCount,
            LateCount = p_LateCount,
            LeaveCount = p_LeaveCount,
            Remarks = COALESCE(p_Remarks, Remarks),
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StaffSessionId = v_SessionId;
    ELSE
        INSERT INTO `StaffAttendanceSessions` (
            AttendanceDate, CampusId, DepartmentId, StaffType,
            TotalStaffCount, PresentCount, AbsentCount, LateCount, LeaveCount,
            IsLocked, Remarks, IsActive, CreatedByUserId, CreatedAt
        ) VALUES (
            p_AttendanceDate, 
            IF(p_CampusId > 0, p_CampusId, NULL),
            IF(p_DepartmentId > 0, p_DepartmentId, NULL),
            p_StaffType,
            p_TotalStaffCount, p_PresentCount, p_AbsentCount, p_LateCount, p_LeaveCount,
            0, p_Remarks, 1, p_CreatedByUserId, UTC_TIMESTAMP()
        );
        SET v_SessionId = LAST_INSERT_ID();
    END IF;

    SELECT v_SessionId AS StaffSessionId;
END$$


-- -------------------------------------------------------------------------------------
-- 3. sp_SaveStaffAttendanceEntry
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_SaveStaffAttendanceEntry$$
CREATE PROCEDURE sp_SaveStaffAttendanceEntry(
    IN p_StaffSessionId INT,
    IN p_FacultyId INT,
    IN p_Status TINYINT,
    IN p_InTime TIME,
    IN p_OutTime TIME,
    IN p_VerificationMethod TINYINT,
    IN p_DeviceId VARCHAR(100),
    IN p_IpAddress VARCHAR(45),
    IN p_Remarks VARCHAR(500),
    IN p_CreatedByUserId INT
)
BEGIN
    DECLARE v_AttendanceId INT DEFAULT 0;

    SELECT StaffAttendanceId INTO v_AttendanceId
    FROM `StaffAttendances`
    WHERE StaffSessionId = p_StaffSessionId
      AND FacultyId = p_FacultyId
    LIMIT 1;

    IF v_AttendanceId > 0 THEN
        UPDATE `StaffAttendances`
        SET Status = p_Status,
            InTime = p_InTime,
            OutTime = p_OutTime,
            VerificationMethod = p_VerificationMethod,
            DeviceId = COALESCE(p_DeviceId, DeviceId),
            IpAddress = COALESCE(p_IpAddress, IpAddress),
            Remarks = p_Remarks,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StaffAttendanceId = v_AttendanceId;
    ELSE
        INSERT INTO `StaffAttendances` (
            StaffSessionId, FacultyId, Status, InTime, OutTime,
            VerificationMethod, DeviceId, IpAddress, Remarks,
            IsActive, CreatedByUserId, CreatedAt
        ) VALUES (
            p_StaffSessionId, p_FacultyId, p_Status, p_InTime, p_OutTime,
            p_VerificationMethod, p_DeviceId, p_IpAddress, p_Remarks,
            1, p_CreatedByUserId, UTC_TIMESTAMP()
        );
    END IF;
END$$


-- -------------------------------------------------------------------------------------
-- 4. sp_UpdateStaffAttendanceSingle
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_UpdateStaffAttendanceSingle$$
CREATE PROCEDURE sp_UpdateStaffAttendanceSingle(
    IN p_FacultyId INT,
    IN p_AttendanceDate DATETIME,
    IN p_StaffType TINYINT,
    IN p_Status TINYINT,
    IN p_InTime TIME,
    IN p_OutTime TIME,
    IN p_Remarks VARCHAR(500),
    IN p_DepartmentId INT,
    IN p_CampusId INT,
    IN p_CurrentUserId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_SessionId INT DEFAULT 0;
    DECLARE v_OldStatus TINYINT DEFAULT NULL;
    DECLARE v_UserFullName VARCHAR(150) DEFAULT NULL;

    SET v_TargetDate = DATE(p_AttendanceDate);

    -- Find session
    SELECT StaffSessionId INTO v_SessionId
    FROM `StaffAttendanceSessions`
    WHERE DATE(AttendanceDate) = v_TargetDate
      AND StaffType = p_StaffType
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId)
    LIMIT 1;

    IF v_SessionId <= 0 THEN
        INSERT INTO `StaffAttendanceSessions` (
            AttendanceDate, CampusId, DepartmentId, StaffType,
            TotalStaffCount, PresentCount, AbsentCount, LateCount, LeaveCount,
            IsLocked, Remarks, IsActive, CreatedByUserId, CreatedAt
        ) VALUES (
            p_AttendanceDate, 
            IF(p_CampusId > 0, p_CampusId, NULL),
            IF(p_DepartmentId > 0, p_DepartmentId, NULL),
            p_StaffType, 1, 0, 0, 0, 0, 0, NULL, 1, p_CurrentUserId, UTC_TIMESTAMP()
        );
        SET v_SessionId = LAST_INSERT_ID();
    END IF;

    -- Check old status
    SELECT Status INTO v_OldStatus
    FROM `StaffAttendances`
    WHERE StaffSessionId = v_SessionId AND FacultyId = p_FacultyId
    LIMIT 1;

    -- Upsert attendance record
    CALL sp_SaveStaffAttendanceEntry(
        v_SessionId, p_FacultyId, p_Status, p_InTime, p_OutTime,
        1, 'Web Portal Admin', NULL, p_Remarks, p_CurrentUserId
    );

    -- Recalculate session aggregates
    UPDATE `StaffAttendanceSessions`
    SET PresentCount = (SELECT COUNT(1) FROM `StaffAttendances` WHERE StaffSessionId = v_SessionId AND IsActive = 1 AND Status = 1),
        AbsentCount  = (SELECT COUNT(1) FROM `StaffAttendances` WHERE StaffSessionId = v_SessionId AND IsActive = 1 AND Status = 2),
        LateCount    = (SELECT COUNT(1) FROM `StaffAttendances` WHERE StaffSessionId = v_SessionId AND IsActive = 1 AND Status = 3),
        LeaveCount   = (SELECT COUNT(1) FROM `StaffAttendances` WHERE StaffSessionId = v_SessionId AND IsActive = 1 AND Status IN (4, 6)),
        UpdatedAt    = UTC_TIMESTAMP()
    WHERE StaffSessionId = v_SessionId;

    -- Audit trail
    IF p_CurrentUserId IS NOT NULL AND p_CurrentUserId > 0 THEN
        SELECT FullName INTO v_UserFullName FROM `Users` WHERE UserId = p_CurrentUserId LIMIT 1;
    END IF;

    INSERT INTO `AttendanceAuditHistories` (
        EntityType, EntityId, FacultyId, StudentId, AttendanceDate,
        Session, OldStatus, NewStatus, Action, ModifiedByUserId,
        ModifiedByUserName, CreatedAt, Description
    ) VALUES (
        'Staff', p_FacultyId, p_FacultyId, NULL, p_AttendanceDate,
        0, v_OldStatus, p_Status, IF(v_OldStatus IS NULL, 'Created', 'Updated'),
        p_CurrentUserId, v_UserFullName, UTC_TIMESTAMP(),
        COALESCE(p_Remarks, IF(v_OldStatus IS NULL, 'Created via Admin UI', 'Updated via Admin UI'))
    );

    SELECT 1 AS Success;
END$$


-- -------------------------------------------------------------------------------------
-- 5. sp_GetStaffAttendanceDetails
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffAttendanceDetails$$
CREATE PROCEDURE sp_GetStaffAttendanceDetails(
    IN p_FacultyId INT,
    IN p_AttendanceDate DATETIME,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_MonthStart DATE;
    DECLARE v_MonthEnd DATE;

    SET v_TargetDate = DATE(p_AttendanceDate);
    SET v_MonthStart = DATE_SUB(v_TargetDate, INTERVAL DAY(v_TargetDate) - 1 DAY);
    SET v_MonthEnd = LAST_DAY(v_TargetDate);

    SELECT 
        s.Id AS FacultyId,
        COALESCE(NULLIF(s.EmployeeId, ''), CONCAT('STF', LPAD(s.Id, 3, '0'))) AS EmployeeId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(d.DepartmentName, s.Department, 'General') AS DepartmentName,
        COALESCE(des.Name, s.Designation, 'Staff') AS DesignationName,
        sa.InTime,
        sa.OutTime,
        sa.Status,
        sa.VerificationMethod,
        sa.DeviceId,
        sa.Remarks,
        -- Monthly aggregated stats for this faculty member
        (SELECT COUNT(1) FROM `StaffAttendances` a 
         JOIN `StaffAttendanceSessions` sess ON a.StaffSessionId = sess.StaffSessionId
         WHERE a.FacultyId = s.Id AND a.IsActive = 1 AND a.Status = 1 
           AND DATE(sess.AttendanceDate) >= v_MonthStart AND DATE(sess.AttendanceDate) <= v_MonthEnd) AS MonthPresentCount,
        (SELECT COUNT(1) FROM `StaffAttendances` a 
         JOIN `StaffAttendanceSessions` sess ON a.StaffSessionId = sess.StaffSessionId
         WHERE a.FacultyId = s.Id AND a.IsActive = 1 AND a.Status = 2 
           AND DATE(sess.AttendanceDate) >= v_MonthStart AND DATE(sess.AttendanceDate) <= v_MonthEnd) AS MonthAbsentCount,
        (SELECT COUNT(1) FROM `StaffAttendances` a 
         JOIN `StaffAttendanceSessions` sess ON a.StaffSessionId = sess.StaffSessionId
         WHERE a.FacultyId = s.Id AND a.IsActive = 1 AND a.Status = 3 
           AND DATE(sess.AttendanceDate) >= v_MonthStart AND DATE(sess.AttendanceDate) <= v_MonthEnd) AS MonthLateCount
    FROM `Staffs` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN `Designations` des ON s.DesignationId = des.Id
    LEFT JOIN `StaffAttendanceSessions` sas ON DATE(sas.AttendanceDate) = v_TargetDate
    LEFT JOIN `StaffAttendances` sa ON sa.StaffSessionId = sas.StaffSessionId AND sa.FacultyId = s.Id AND sa.IsActive = 1
    WHERE s.Id = p_FacultyId
      AND s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
    LIMIT 1;
END$$


-- -------------------------------------------------------------------------------------
-- 6. sp_GetStaffMonthlyAttendanceReport
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffMonthlyAttendanceReport$$
CREATE PROCEDURE sp_GetStaffMonthlyAttendanceReport(
    IN p_Month INT,
    IN p_Year INT,
    IN p_StaffType TINYINT,
    IN p_DepartmentId INT,
    IN p_BoardId INT,
    IN p_FacultyId INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_MonthStart DATE;
    DECLARE v_MonthEnd DATE;

    SET v_MonthStart = STR_TO_DATE(CONCAT(p_Year, '-', LPAD(p_Month, 2, '00'), '-01'), '%Y-%m-%d');
    SET v_MonthEnd = LAST_DAY(v_MonthStart);

    -- Result Set 1: Filtered Staff List
    SELECT 
        s.Id AS FacultyId,
        COALESCE(NULLIF(s.EmployeeId, ''), CONCAT(IF(p_StaffType = 2 OR LOWER(s.StaffType) LIKE '%non%', 'NTS', 'FAC'), LPAD(s.Id, 3, '0'))) AS EmployeeId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(d.DepartmentName, NULLIF(s.Department, ''), 'General') AS DepartmentName
    FROM `Staffs` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId
    WHERE s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR s.BoardId = p_BoardId OR s.BoardId IS NULL OR s.BoardId = 0)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR s.DepartmentId = p_DepartmentId)
      AND (p_FacultyId IS NULL OR p_FacultyId <= 0 OR s.Id = p_FacultyId)
      AND (p_StaffType IS NULL OR p_StaffType <= 0 
           OR (p_StaffType = 1 AND (s.StaffType IS NULL OR LOWER(s.StaffType) = 'teaching'))
           OR (p_StaffType = 2 AND s.StaffType IS NOT NULL AND LOWER(s.StaffType) != 'teaching'))
    ORDER BY s.FirstName ASC;

    -- Result Set 2: Attendances for the Month
    SELECT 
        sa.FacultyId,
        DAY(sas.AttendanceDate) AS DayNumber,
        sa.Status,
        sa.InTime,
        sa.OutTime
    FROM `StaffAttendances` sa
    JOIN `StaffAttendanceSessions` sas ON sa.StaffSessionId = sas.StaffSessionId
    WHERE sas.AttendanceDate >= v_MonthStart 
      AND sas.AttendanceDate <= v_MonthEnd
      AND sa.IsActive = 1
      AND (p_StaffType IS NULL OR p_StaffType <= 0 OR sas.StaffType = p_StaffType)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR sas.CampusId = p_CampusId);

    -- Result Set 3: Official Holidays in Month
    SELECT 
        HolidayName,
        DATE(StartDate) AS StartDate,
        DATE(EndDate) AS EndDate
    FROM `Holidays`
    WHERE IsDeleted = 0 
      AND Status = 'Active'
      AND StartDate <= v_MonthEnd 
      AND EndDate >= v_MonthStart
      AND (AppliesTo = 'All Students & Staff' OR AppliesTo = 'Staff Only')
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId);
END$$


-- -------------------------------------------------------------------------------------
-- 7. sp_GetStaffTodayAttendance
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffTodayAttendance$$
CREATE PROCEDURE sp_GetStaffTodayAttendance(
    IN p_FacultyId INT,
    IN p_TargetDate DATETIME,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_NextDate DATE;

    SET v_TargetDate = DATE(p_TargetDate);
    SET v_NextDate = DATE_ADD(v_TargetDate, INTERVAL 1 DAY);

    -- Result Set 1: Staff Details & Effective Shift Timing
    SELECT 
        s.Id AS FacultyId,
        s.CampusId,
        s.DepartmentId,
        CASE WHEN LOWER(s.StaffType) LIKE '%non%' THEN 2 ELSE 1 END AS StaffType,
        COALESCE(tc.WorkStartTime, '09:00:00') AS WorkStartTime,
        COALESCE(tc.WorkEndTime, '16:30:00') AS WorkEndTime,
        COALESCE(tc.LateThreshold, '09:15:00') AS LateThreshold,
        COALESCE(tc.EarlyCheckoutThreshold, '16:30:00') AS EarlyCheckoutThreshold,
        COALESCE(tc.GracePeriodMinutes, 15) AS GracePeriodMinutes
    FROM `Staffs` s
    LEFT JOIN `AttendanceTimingConfigs` tc ON tc.IsActive = 1 
                                         AND (tc.StaffType IS NULL OR tc.StaffType = IF(LOWER(s.StaffType) LIKE '%non%', 2, 1))
                                         AND (tc.DepartmentId IS NULL OR tc.DepartmentId = s.DepartmentId)
    WHERE s.Id = p_FacultyId AND s.IsDeleted = 0
    ORDER BY (tc.DepartmentId IS NOT NULL) DESC, (tc.StaffType IS NOT NULL) DESC
    LIMIT 1;

    -- Result Set 2: Today's Attendance Record
    SELECT 
        sa.StaffAttendanceId,
        sa.Status,
        sa.InTime,
        sa.OutTime,
        sa.VerificationMethod,
        sa.DeviceId,
        sa.Remarks
    FROM `StaffAttendances` sa
    JOIN `StaffAttendanceSessions` sas ON sa.StaffSessionId = sas.StaffSessionId
    WHERE sa.FacultyId = p_FacultyId
      AND sas.AttendanceDate >= v_TargetDate 
      AND sas.AttendanceDate < v_NextDate
      AND sa.IsActive = 1
    ORDER BY sa.StaffAttendanceId DESC
    LIMIT 1;

    -- Result Set 3: Official Holiday Check
    SELECT COUNT(1) AS IsHoliday, MAX(HolidayName) AS HolidayName
    FROM `Holidays`
    WHERE IsDeleted = 0 AND Status = 'Active'
      AND v_TargetDate >= DATE(StartDate) AND v_TargetDate <= DATE(EndDate)
      AND (AppliesTo = 'All Students & Staff' OR AppliesTo = 'Staff Only');

    -- Result Set 4: Approved Leave Check
    SELECT COUNT(1) AS IsLeave, MAX(Reason) AS LeaveReason
    FROM `StaffLeaveRequests`
    WHERE StaffId = p_FacultyId AND IsActive = 1 AND Status = 2
      AND v_TargetDate >= DATE(StartDate) AND v_TargetDate <= DATE(EndDate);

    -- Result Set 5: Regularization Request Check
    SELECT RegularizationId, Status, RequestedInTime, RequestedOutTime
    FROM `StaffAttendanceRegularizations`
    WHERE (FacultyId = p_FacultyId OR StaffId = p_FacultyId)
      AND AttendanceDate >= v_TargetDate AND AttendanceDate < v_NextDate
    ORDER BY RegularizationId DESC
    LIMIT 1;
END$$


-- -------------------------------------------------------------------------------------
-- 8. sp_PunchStaffAttendance
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_PunchStaffAttendance$$
CREATE PROCEDURE sp_PunchStaffAttendance(
    IN p_FacultyId INT,
    IN p_PunchType VARCHAR(10),     -- 'IN' or 'OUT'
    IN p_PunchTime TIME,
    IN p_VerificationMethod TINYINT,
    IN p_DeviceId VARCHAR(100),
    IN p_IpAddress VARCHAR(45),
    IN p_Remarks VARCHAR(500),
    IN p_UserId INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_NextDate DATE;
    DECLARE v_StaffType TINYINT DEFAULT 1;
    DECLARE v_DepartmentId INT DEFAULT NULL;
    DECLARE v_SessionId INT DEFAULT 0;
    DECLARE v_AttendanceId INT DEFAULT 0;
    DECLARE v_LateThreshold TIME DEFAULT '09:15:00';
    DECLARE v_EarlyThreshold TIME DEFAULT '16:30:00';
    DECLARE v_GraceMins INT DEFAULT 15;
    DECLARE v_Status TINYINT DEFAULT 1;

    SET v_TargetDate = CURRENT_DATE();
    SET v_NextDate = DATE_ADD(v_TargetDate, INTERVAL 1 DAY);

    -- Resolve Staff
    SELECT 
        IF(LOWER(StaffType) LIKE '%non%', 2, 1),
        DepartmentId,
        COALESCE(p_CampusId, CampusId, 1)
    INTO v_StaffType, v_DepartmentId, p_CampusId
    FROM `Staffs`
    WHERE Id = p_FacultyId AND IsDeleted = 0
    LIMIT 1;

    -- Resolve Timing Config
    SELECT 
        COALESCE(LateThreshold, '09:15:00'),
        COALESCE(EarlyCheckoutThreshold, '16:30:00'),
        COALESCE(GracePeriodMinutes, 15)
    INTO v_LateThreshold, v_EarlyThreshold, v_GraceMins
    FROM `AttendanceTimingConfigs`
    WHERE IsActive = 1
      AND (StaffType IS NULL OR StaffType = v_StaffType)
      AND (DepartmentId IS NULL OR DepartmentId = v_DepartmentId)
    ORDER BY (DepartmentId IS NOT NULL) DESC, (StaffType IS NOT NULL) DESC
    LIMIT 1;

    -- Atomic Find or Create Session Header
    SELECT StaffSessionId INTO v_SessionId
    FROM `StaffAttendanceSessions`
    WHERE AttendanceDate >= v_TargetDate AND AttendanceDate < v_NextDate
      AND StaffType = v_StaffType
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId)
    LIMIT 1;

    IF v_SessionId <= 0 THEN
        INSERT INTO `StaffAttendanceSessions` (
            AttendanceDate, CampusId, DepartmentId, StaffType,
            TotalStaffCount, PresentCount, AbsentCount, LateCount, LeaveCount,
            IsLocked, Remarks, IsActive, CreatedByUserId, CreatedAt
        ) VALUES (
            NOW(), p_CampusId, v_DepartmentId, v_StaffType,
            1, 0, 0, 0, 0, 0, 'Auto-created by punch system', 1, p_UserId, UTC_TIMESTAMP()
        );
        SET v_SessionId = LAST_INSERT_ID();
    END IF;

    -- Find Attendance Record
    SELECT StaffAttendanceId INTO v_AttendanceId
    FROM `StaffAttendances`
    WHERE StaffSessionId = v_SessionId AND FacultyId = p_FacultyId AND IsActive = 1
    LIMIT 1;

    IF UPPER(p_PunchType) = 'IN' THEN
        IF v_AttendanceId > 0 THEN
            -- Check if already punched in
            IF (SELECT InTime FROM `StaffAttendances` WHERE StaffAttendanceId = v_AttendanceId) IS NOT NULL THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Already checked in for today.';
            END IF;
        END IF;

        SET v_Status = IF(p_PunchTime > v_LateThreshold, 3, 1); -- 3 = Late, 1 = Present

        IF v_AttendanceId > 0 THEN
            UPDATE `StaffAttendances`
            SET InTime = p_PunchTime,
                Status = v_Status,
                VerificationMethod = p_VerificationMethod,
                DeviceId = COALESCE(p_DeviceId, DeviceId),
                IpAddress = COALESCE(p_IpAddress, IpAddress),
                Remarks = COALESCE(p_Remarks, Remarks),
                UpdatedAt = UTC_TIMESTAMP()
            WHERE StaffAttendanceId = v_AttendanceId;
        ELSE
            INSERT INTO `StaffAttendances` (
                StaffSessionId, FacultyId, Status, InTime, OutTime,
                VerificationMethod, DeviceId, IpAddress, Remarks,
                IsActive, CreatedByUserId, CreatedAt
            ) VALUES (
                v_SessionId, p_FacultyId, v_Status, p_PunchTime, NULL,
                p_VerificationMethod, p_DeviceId, p_IpAddress, p_Remarks,
                1, p_UserId, UTC_TIMESTAMP()
            );
        END IF;

    ELSEIF UPPER(p_PunchType) = 'OUT' THEN
        IF v_AttendanceId <= 0 OR (SELECT InTime FROM `StaffAttendances` WHERE StaffAttendanceId = v_AttendanceId) IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'You must check in before checking out.';
        END IF;

        IF (SELECT OutTime FROM `StaffAttendances` WHERE StaffAttendanceId = v_AttendanceId) IS NOT NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Already checked out for today.';
        END IF;

        UPDATE `StaffAttendances`
        SET OutTime = p_PunchTime,
            Remarks = CONCAT_WS(' | ', Remarks, IF(p_PunchTime < v_EarlyThreshold, 'Early checkout logged', 'Check-Out')),
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StaffAttendanceId = v_AttendanceId;
    END IF;

    SELECT 1 AS Success;
END$$


-- -------------------------------------------------------------------------------------
-- 9. sp_SubmitStaffRegularization
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_SubmitStaffRegularization$$
CREATE PROCEDURE sp_SubmitStaffRegularization(
    IN p_FacultyId INT,
    IN p_AttendanceDate DATETIME,
    IN p_RequestedInTime TIME,
    IN p_RequestedOutTime TIME,
    IN p_Reason VARCHAR(500),
    IN p_UserId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_RegId INT DEFAULT 0;

    SET v_TargetDate = DATE(p_AttendanceDate);

    SELECT RegularizationId INTO v_RegId
    FROM `StaffAttendanceRegularizations`
    WHERE (FacultyId = p_FacultyId OR StaffId = p_FacultyId)
      AND DATE(AttendanceDate) = v_TargetDate
    LIMIT 1;

    IF v_RegId > 0 THEN
        IF (SELECT Status FROM `StaffAttendanceRegularizations` WHERE RegularizationId = v_RegId) = 'Approved' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Attendance for this date has already been regularized and approved.';
        END IF;

        UPDATE `StaffAttendanceRegularizations`
        SET RequestedInTime = p_RequestedInTime,
            RequestedOutTime = p_RequestedOutTime,
            Reason = p_Reason,
            Status = 'Pending',
            UpdatedAt = UTC_TIMESTAMP()
        WHERE RegularizationId = v_RegId;
    ELSE
        INSERT INTO `StaffAttendanceRegularizations` (
            FacultyId, StaffId, AttendanceDate, RequestedInTime, RequestedOutTime,
            Reason, Status, CreatedAt
        ) VALUES (
            p_FacultyId, p_FacultyId, p_AttendanceDate, p_RequestedInTime, p_RequestedOutTime,
            p_Reason, 'Pending', UTC_TIMESTAMP()
        );
    END IF;

    SELECT 1 AS Success;
END$$


-- -------------------------------------------------------------------------------------
-- 10. sp_GetStaffRegularizations
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffRegularizations$$
CREATE PROCEDURE sp_GetStaffRegularizations(
    IN p_Status VARCHAR(50),
    IN p_DepartmentId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        r.RegularizationId,
        r.FacultyId,
        r.StaffId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(NULLIF(s.EmployeeId, ''), CONCAT('STF', LPAD(s.Id, 3, '0'))) AS EmployeeId,
        COALESCE(d.DepartmentName, 'General') AS DepartmentName,
        r.AttendanceDate,
        r.RequestedInTime,
        r.RequestedOutTime,
        r.Reason,
        r.Status,
        r.AdminRemarks,
        r.ReviewedAt,
        r.CreatedAt
    FROM `StaffAttendanceRegularizations` r
    LEFT JOIN `Staffs` s ON COALESCE(r.StaffId, r.FacultyId) = s.Id
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId
    WHERE (p_Status IS NULL OR p_Status = '' OR LOWER(r.Status) = LOWER(p_Status))
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR s.DepartmentId = p_DepartmentId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
    ORDER BY r.CreatedAt DESC;
END$$


-- -------------------------------------------------------------------------------------
-- 11. sp_ReviewStaffRegularization
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_ReviewStaffRegularization$$
CREATE PROCEDURE sp_ReviewStaffRegularization(
    IN p_RegularizationId INT,
    IN p_Status VARCHAR(50),      -- 'Approved' or 'Rejected'
    IN p_AdminRemarks VARCHAR(500),
    IN p_ReviewerUserId INT
)
BEGIN
    DECLARE v_FacultyId INT DEFAULT 0;
    DECLARE v_AttDate DATETIME;
    DECLARE v_ReqIn TIME;
    DECLARE v_ReqOut TIME;
    DECLARE v_Reason VARCHAR(500);

    SELECT 
        COALESCE(StaffId, FacultyId, 0),
        AttendanceDate,
        RequestedInTime,
        RequestedOutTime,
        Reason
    INTO v_FacultyId, v_AttDate, v_ReqIn, v_ReqOut, v_Reason
    FROM `StaffAttendanceRegularizations`
    WHERE RegularizationId = p_RegularizationId;

    IF v_FacultyId <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Regularization record not found.';
    END IF;

    UPDATE `StaffAttendanceRegularizations`
    SET Status = p_Status,
        AdminRemarks = p_AdminRemarks,
        ReviewedByUserId = p_ReviewerUserId,
        ReviewedAt = UTC_TIMESTAMP(),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE RegularizationId = p_RegularizationId;

    -- If approved, update underlying staff attendance record
    IF LOWER(p_Status) = 'approved' THEN
        CALL sp_UpdateStaffAttendanceSingle(
            v_FacultyId,
            v_AttDate,
            1, -- default teaching or staff type
            1, -- Present (status = 1)
            COALESCE(v_ReqIn, '09:00:00'),
            COALESCE(v_ReqOut, '16:30:00'),
            CONCAT('Regularized: ', COALESCE(v_Reason, 'Approved')),
            NULL, NULL, p_ReviewerUserId
        );
    END IF;

    SELECT 1 AS Success;
END$$


-- -------------------------------------------------------------------------------------
-- 12. sp_ResolveStaffByUserId
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_ResolveStaffByUserId$$
CREATE PROCEDURE sp_ResolveStaffByUserId(
    IN p_UserId INT
)
BEGIN
    SELECT 
        COALESCE(u.StaffId, s.Id, 0) AS StaffId,
        s.CampusId,
        s.DepartmentId,
        s.StaffType
    FROM `Users` u
    LEFT JOIN `Staffs` s ON (u.StaffId IS NOT NULL AND u.StaffId = s.Id)
                        OR (u.Email IS NOT NULL AND u.Email = s.Email AND s.IsDeleted = 0)
    WHERE u.UserId = p_UserId
    LIMIT 1;
END$$


-- -------------------------------------------------------------------------------------
-- 13. sp_GetStaffYearlyAttendanceOverview
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffYearlyAttendanceOverview$$
CREATE PROCEDURE sp_GetStaffYearlyAttendanceOverview(
    IN p_StaffId INT,
    IN p_AcademicYearId INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_StartDate DATE;
    DECLARE v_EndDate DATE;

    SELECT StartDate, EndDate INTO v_StartDate, v_EndDate
    FROM `AcademicYears`
    WHERE AcademicYearId = p_AcademicYearId
    LIMIT 1;

    IF v_StartDate IS NULL THEN
        SET v_StartDate = DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR);
        SET v_EndDate = CURRENT_DATE();
    END IF;

    SELECT 
        MONTH(sas.AttendanceDate) AS Month,
        YEAR(sas.AttendanceDate) AS Year,
        COUNT(CASE WHEN sa.Status = 1 THEN 1 END) AS PresentDays,
        COUNT(CASE WHEN sa.Status = 2 THEN 1 END) AS AbsentDays,
        COUNT(CASE WHEN sa.Status = 3 THEN 1 END) AS LateDays,
        COUNT(CASE WHEN sa.Status IN (4, 6) THEN 1 END) AS LeaveDays,
        COUNT(sa.StaffAttendanceId) AS TotalMarkedDays
    FROM `StaffAttendances` sa
    JOIN `StaffAttendanceSessions` sas ON sa.StaffSessionId = sas.StaffSessionId
    WHERE sa.FacultyId = p_StaffId
      AND sa.IsActive = 1
      AND sas.AttendanceDate >= v_StartDate
      AND sas.AttendanceDate <= v_EndDate
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR sas.CampusId = p_CampusId)
    GROUP BY YEAR(sas.AttendanceDate), MONTH(sas.AttendanceDate)
    ORDER BY Year ASC, Month ASC;
END$$


-- -------------------------------------------------------------------------------------
-- 14. sp_GetStaffImportContext
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffImportContext$$
CREATE PROCEDURE sp_GetStaffImportContext(
    IN p_CampusId INT
)
BEGIN
    -- 1. Active staff directory for mapping
    SELECT 
        s.Id AS FacultyId,
        COALESCE(s.EmployeeId, '') AS EmployeeId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS FullName,
        s.DepartmentId,
        s.CampusId,
        CASE WHEN LOWER(COALESCE(s.StaffType, '')) LIKE '%non%' THEN 2 ELSE 1 END AS StaffType
    FROM `Staffs` s
    WHERE s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId);

    -- 2. Existing attendance dates to prevent duplicate insertion
    SELECT 
        sa.FacultyId,
        DATE(sas.AttendanceDate) AS AttendanceDate
    FROM `StaffAttendances` sa
    JOIN `StaffAttendanceSessions` sas ON sa.StaffSessionId = sas.StaffSessionId
    WHERE sa.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR sas.CampusId = p_CampusId);
END$$

DELIMITER ;
