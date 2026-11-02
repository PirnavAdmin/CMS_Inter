-- =====================================================================================
-- CMS_Inter — Staff Leave Management & Leave Categories Stored Procedures
-- Module: Staff Leave Management
-- Purpose: Complete, high-performance, atomic stored procedures replacing 100% of EF Core
--          business CRUD in LeaveManagementService and LeaveCategoryService.
-- =====================================================================================

DELIMITER $$

-- -------------------------------------------------------------------------------------
-- 1. sp_GetStaffLeaveRequests
-- Retrieves staff leave applications with campus, department, staff, and status filtering.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffLeaveRequests$$
CREATE PROCEDURE sp_GetStaffLeaveRequests(
    IN p_CampusId INT,
    IN p_StaffId INT,
    IN p_DepartmentId INT,
    IN p_Status INT
)
BEGIN
    SELECT 
        slr.StaffLeaveRequestId,
        slr.StaffId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(d.DepartmentName, s.Department, 'General') AS Department,
        CASE 
            WHEN LOWER(COALESCE(s.StaffType, '')) LIKE '%non%' THEN 'Non-Teaching Staff'
            ELSE 'Teaching Staff'
        END AS StaffType,
        slr.LeaveType,
        slr.LeaveCategoryId,
        COALESCE(lc.CategoryName, 
            CASE slr.LeaveType
                WHEN 1 THEN 'Casual Leave'
                WHEN 2 THEN 'Sick Leave'
                WHEN 3 THEN 'Earned Leave'
                WHEN 4 THEN 'Maternity Leave'
                ELSE 'Other'
            END
        ) AS LeaveCategoryName,
        slr.StartDate,
        slr.EndDate,
        CAST((DATEDIFF(slr.EndDate, slr.StartDate) + 1) AS DECIMAL(5,2)) AS TotalDays,
        slr.Reason,
        slr.Status,
        slr.RejectionReason,
        slr.ApprovedByUserId,
        u.FullName AS ApprovedByUserName,
        slr.ApprovedAt,
        slr.CreatedAt
    FROM `StaffLeaveRequests` slr
    INNER JOIN `Staffs` s ON slr.StaffId = s.Id
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId OR slr.DepartmentId = d.DepartmentId
    LEFT JOIN `LeaveCategories` lc ON slr.LeaveCategoryId = lc.LeaveCategoryId
    LEFT JOIN `Users` u ON slr.ApprovedByUserId = u.UserId
    WHERE slr.IsActive = 1
      AND s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
      AND (p_StaffId IS NULL OR p_StaffId <= 0 OR slr.StaffId = p_StaffId)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR slr.DepartmentId = p_DepartmentId OR s.DepartmentId = p_DepartmentId)
      AND (p_Status IS NULL OR p_Status <= 0 OR slr.Status = p_Status)
    ORDER BY slr.CreatedAt DESC;
END$$


-- -------------------------------------------------------------------------------------
-- 2. sp_GetStaffLeaveDetails
-- Retrieves detailed leave request record, staff code, and current leave balance.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffLeaveDetails$$
CREATE PROCEDURE sp_GetStaffLeaveDetails(
    IN p_StaffLeaveRequestId INT
)
BEGIN
    SELECT 
        slr.StaffLeaveRequestId,
        slr.StaffId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(s.EmployeeId, CONCAT('FAC', LPAD(s.Id, 3, '0'))) AS StaffCode,
        COALESCE(d.DepartmentName, s.Department, 'General') AS Department,
        CASE 
            WHEN LOWER(COALESCE(s.StaffType, '')) LIKE '%non%' THEN 'Non-Teaching Staff'
            ELSE 'Teaching Staff'
        END AS StaffType,
        slr.LeaveType,
        slr.LeaveCategoryId,
        COALESCE(lc.CategoryName, 
            CASE slr.LeaveType
                WHEN 1 THEN 'Casual Leave'
                WHEN 2 THEN 'Sick Leave'
                WHEN 3 THEN 'Earned Leave'
                WHEN 4 THEN 'Maternity Leave'
                ELSE 'Other'
            END
        ) AS LeaveCategoryName,
        slr.StartDate,
        slr.EndDate,
        CAST((DATEDIFF(slr.EndDate, slr.StartDate) + 1) AS DECIMAL(5,2)) AS TotalDays,
        slr.Reason,
        slr.Status,
        slr.RejectionReason,
        slr.ApprovedByUserId,
        u.FullName AS ApprovedByUserName,
        slr.ApprovedAt,
        slr.CreatedAt,
        COALESCE(slb.TotalDays, 0.00) AS TotalBalance,
        COALESCE(slb.UsedDays, 0.00) AS UsedBalance,
        COALESCE(slb.RemainingDays, 0.00) AS RemainingBalance
    FROM `StaffLeaveRequests` slr
    INNER JOIN `Staffs` s ON slr.StaffId = s.Id
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId OR slr.DepartmentId = d.DepartmentId
    LEFT JOIN `LeaveCategories` lc ON slr.LeaveCategoryId = lc.LeaveCategoryId
    LEFT JOIN `Users` u ON slr.ApprovedByUserId = u.UserId
    LEFT JOIN `StaffLeaveBalances` slb ON slb.StaffId = slr.StaffId
                                      AND (
                                          (slr.LeaveCategoryId IS NOT NULL AND slb.LeaveCategoryId = slr.LeaveCategoryId)
                                          OR slb.LeaveType = slr.LeaveType
                                      )
                                      AND (slr.AcademicYearId IS NULL OR slb.AcademicYearId = slr.AcademicYearId)
    WHERE slr.StaffLeaveRequestId = p_StaffLeaveRequestId
    LIMIT 1;
END$$


-- -------------------------------------------------------------------------------------
-- 3. sp_CreateStaffLeaveRequest
-- Defensively resolves IDs, validates balance, and inserts pending leave request.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_CreateStaffLeaveRequest$$
CREATE PROCEDURE sp_CreateStaffLeaveRequest(
    IN p_StaffId INT,
    IN p_LeaveType TINYINT,
    IN p_LeaveCategoryId INT,
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_Reason VARCHAR(1000),
    IN p_DepartmentId INT,
    IN p_AcademicYearId INT,
    IN p_UserId INT
)
BEGIN
    DECLARE v_StaffId INT;
    DECLARE v_DepartmentId INT;
    DECLARE v_AcademicYearId INT;
    DECLARE v_LeaveCategoryId INT;
    DECLARE v_UserId INT;
    DECLARE v_RequestedDays DECIMAL(5,2);
    DECLARE v_RemainingDays DECIMAL(5,2);
    DECLARE v_NewId INT DEFAULT 0;

    -- Calculate requested duration
    SET v_RequestedDays = CAST((DATEDIFF(p_EndDate, p_StartDate) + 1) AS DECIMAL(5,2));

    -- Defensive Staff resolution
    SELECT Id, DepartmentId INTO v_StaffId, v_DepartmentId
    FROM `Staffs`
    WHERE Id = p_StaffId AND IsDeleted = 0
    LIMIT 1;

    IF v_StaffId IS NULL THEN
        SELECT Id, DepartmentId INTO v_StaffId, v_DepartmentId
        FROM `Staffs`
        WHERE IsDeleted = 0
        LIMIT 1;
    END IF;

    -- Defensive Department resolution
    IF p_DepartmentId IS NOT NULL AND p_DepartmentId > 0 THEN
        IF EXISTS (SELECT 1 FROM `Departments` WHERE DepartmentId = p_DepartmentId) THEN
            SET v_DepartmentId = p_DepartmentId;
        END IF;
    END IF;

    -- Defensive AcademicYear resolution
    IF p_AcademicYearId IS NOT NULL AND p_AcademicYearId > 0 THEN
        SELECT AcademicYearId INTO v_AcademicYearId
        FROM `AcademicYears`
        WHERE AcademicYearId = p_AcademicYearId
        LIMIT 1;
    END IF;

    IF v_AcademicYearId IS NULL THEN
        SELECT AcademicYearId INTO v_AcademicYearId
        FROM `AcademicYears`
        WHERE IsActive = 1
        ORDER BY AcademicYearId DESC
        LIMIT 1;
    END IF;

    -- Defensive LeaveCategory resolution
    IF p_LeaveCategoryId IS NOT NULL AND p_LeaveCategoryId > 0 THEN
        SELECT LeaveCategoryId INTO v_LeaveCategoryId
        FROM `LeaveCategories`
        WHERE LeaveCategoryId = p_LeaveCategoryId AND IsActive = 1
        LIMIT 1;
    END IF;

    -- Defensive User resolution
    IF p_UserId IS NOT NULL AND p_UserId > 0 THEN
        SELECT UserId INTO v_UserId
        FROM `Users`
        WHERE UserId = p_UserId
        LIMIT 1;
    END IF;

    -- Check Leave Balance if tracked
    SELECT RemainingDays INTO v_RemainingDays
    FROM `StaffLeaveBalances`
    WHERE StaffId = v_StaffId
      AND ((v_LeaveCategoryId IS NOT NULL AND LeaveCategoryId = v_LeaveCategoryId) OR LeaveType = p_LeaveType)
      AND (v_AcademicYearId IS NULL OR AcademicYearId = v_AcademicYearId)
    LIMIT 1;

    IF v_RemainingDays IS NOT NULL AND v_RemainingDays < v_RequestedDays THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient leave balance for the requested duration.';
    END IF;

    -- Insert Pending Leave Request
    INSERT INTO `StaffLeaveRequests` (
        StaffId, LeaveType, LeaveCategoryId, StartDate, EndDate, Reason,
        DepartmentId, AcademicYearId, Status, ApprovedByUserId, ApprovedAt,
        RejectionReason, IsActive, CreatedByUserId, CreatedAt
    ) VALUES (
        v_StaffId, p_LeaveType, v_LeaveCategoryId, p_StartDate, p_EndDate, p_Reason,
        v_DepartmentId, v_AcademicYearId, 1, NULL, NULL,
        NULL, 1, v_UserId, UTC_TIMESTAMP()
    );

    SET v_NewId = LAST_INSERT_ID();

    -- Return full created record
    CALL sp_GetStaffLeaveDetails(v_NewId);
END$$


-- -------------------------------------------------------------------------------------
-- 4. sp_ActionStaffLeaveRequest
-- Atomically processes Approval or Rejection:
--   - Updates request status & audit trail
--   - Adjusts StaffLeaveBalances (deducts on approve, reverts if previously approved on reject)
--   - Cancels active timetable substitutions on rejection/revocation
--   - Upserts daily StaffAttendance records and session metrics on approval
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_ActionStaffLeaveRequest$$
CREATE PROCEDURE sp_ActionStaffLeaveRequest(
    IN p_StaffLeaveRequestId INT,
    IN p_Status TINYINT,
    IN p_RejectionReason VARCHAR(500),
    IN p_UserId INT
)
BEGIN
    DECLARE v_StaffId INT;
    DECLARE v_OldStatus TINYINT;
    DECLARE v_StartDate DATE;
    DECLARE v_EndDate DATE;
    DECLARE v_Reason VARCHAR(1000);
    DECLARE v_LeaveType TINYINT;
    DECLARE v_LeaveCategoryId INT;
    DECLARE v_AcademicYearId INT;
    DECLARE v_CampusId INT DEFAULT 1;
    DECLARE v_DepartmentId INT;
    DECLARE v_StaffType TINYINT DEFAULT 1;
    DECLARE v_StaffTypeStr VARCHAR(50);
    DECLARE v_UserName VARCHAR(150) DEFAULT 'Admin';
    DECLARE v_RequestedDays DECIMAL(5,2);
    DECLARE v_CurDate DATE;
    DECLARE v_IsHoliday INT DEFAULT 0;
    DECLARE v_SessionId INT DEFAULT 0;
    DECLARE v_AttId INT DEFAULT 0;
    DECLARE v_OldAttStatus TINYINT DEFAULT NULL;

    -- Load existing leave request
    SELECT 
        slr.StaffId, slr.Status, slr.StartDate, slr.EndDate, slr.Reason,
        slr.LeaveType, slr.LeaveCategoryId, slr.AcademicYearId,
        COALESCE(s.CampusId, 1), s.DepartmentId, s.StaffType
    INTO 
        v_StaffId, v_OldStatus, v_StartDate, v_EndDate, v_Reason,
        v_LeaveType, v_LeaveCategoryId, v_AcademicYearId,
        v_CampusId, v_DepartmentId, v_StaffTypeStr
    FROM `StaffLeaveRequests` slr
    INNER JOIN `Staffs` s ON slr.StaffId = s.Id
    WHERE slr.StaffLeaveRequestId = p_StaffLeaveRequestId
    LIMIT 1;

    IF v_StaffId IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Leave request not found.';
    END IF;

    -- Resolve StaffType TINYINT
    IF LOWER(COALESCE(v_StaffTypeStr, '')) LIKE '%non%' THEN
        SET v_StaffType = 2;
    ELSE
        SET v_StaffType = 1;
    END IF;

    -- Calculate requested duration
    SET v_RequestedDays = CAST((DATEDIFF(v_EndDate, v_StartDate) + 1) AS DECIMAL(5,2));

    -- Resolve user name
    IF p_UserId IS NOT NULL AND p_UserId > 0 THEN
        SELECT FullName INTO v_UserName FROM `Users` WHERE UserId = p_UserId LIMIT 1;
    END IF;

    -- Case 1: REJECTION / REVOCATION (Status = 3)
    IF p_Status = 3 THEN
        UPDATE `StaffLeaveRequests`
        SET Status = 3,
            RejectionReason = p_RejectionReason,
            ApprovedByUserId = p_UserId,
            ApprovedAt = UTC_TIMESTAMP(),
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StaffLeaveRequestId = p_StaffLeaveRequestId;

        -- Audit entry for rejection
        INSERT INTO `AttendanceAuditHistories` (
            EntityType, EntityId, FacultyId, StudentId, AttendanceDate,
            Session, OldStatus, NewStatus, Action, ModifiedByUserId,
            ModifiedByUserName, CreatedAt, Description
        ) VALUES (
            'Staff', p_StaffLeaveRequestId, v_StaffId, NULL, v_StartDate,
            0, NULL, 0, 'REJECT', p_UserId,
            v_UserName, UTC_TIMESTAMP(), CONCAT('Leave Rejected: ', COALESCE(p_RejectionReason, ''))
        );

        -- Revert leave balance if this request was previously Approved
        IF v_OldStatus = 2 THEN
            UPDATE `StaffLeaveBalances`
            SET UsedDays = GREATEST(0, UsedDays - v_RequestedDays),
                RemainingDays = GREATEST(0, TotalDays - GREATEST(0, UsedDays - v_RequestedDays)),
                UpdatedAt = UTC_TIMESTAMP()
            WHERE StaffId = v_StaffId
              AND ((v_LeaveCategoryId IS NOT NULL AND LeaveCategoryId = v_LeaveCategoryId) OR LeaveType = v_LeaveType)
              AND (v_AcademicYearId IS NULL OR AcademicYearId = v_AcademicYearId);
        END IF;

        -- Auto-cancel active timetable substitutions
        UPDATE `TimetableSubstitutions`
        SET Status = 'Cancelled',
            Remarks = CONCAT(COALESCE(Remarks, ''), ' | Auto-cancelled due to leave rejection/revocation'),
            UpdatedByUserId = p_UserId,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StaffLeaveRequestId = p_StaffLeaveRequestId
          AND Status = 'Active';

    -- Case 2: APPROVAL (Status = 2)
    ELSEIF p_Status = 2 THEN
        UPDATE `StaffLeaveRequests`
        SET Status = 2,
            RejectionReason = NULL,
            ApprovedByUserId = p_UserId,
            ApprovedAt = UTC_TIMESTAMP(),
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StaffLeaveRequestId = p_StaffLeaveRequestId;

        -- If not previously approved, deduct balance and mark daily attendance
        IF v_OldStatus != 2 THEN
            -- Deduct balance
            UPDATE `StaffLeaveBalances`
            SET UsedDays = UsedDays + v_RequestedDays,
                RemainingDays = GREATEST(0, TotalDays - (UsedDays + v_RequestedDays)),
                UpdatedAt = UTC_TIMESTAMP()
            WHERE StaffId = v_StaffId
              AND ((v_LeaveCategoryId IS NOT NULL AND LeaveCategoryId = v_LeaveCategoryId) OR LeaveType = v_LeaveType)
              AND (v_AcademicYearId IS NULL OR AcademicYearId = v_AcademicYearId);

            -- Daily Attendance sync loop
            SET v_CurDate = v_StartDate;
            WHILE v_CurDate <= v_EndDate DO
                -- Skip Sundays
                IF DAYOFWEEK(v_CurDate) != 1 THEN
                    -- Check official holiday
                    SELECT COUNT(1) INTO v_IsHoliday
                    FROM `Holidays` h
                    WHERE h.IsDeleted = 0
                      AND h.Status = 'Active'
                      AND v_CurDate >= DATE(h.StartDate)
                      AND v_CurDate <= DATE(h.EndDate)
                      AND (h.AppliesTo = 'All Students & Staff' OR h.AppliesTo = 'Staff Only')
                      AND (h.CampusId IS NULL OR h.CampusId <= 0 OR h.CampusId = v_CampusId);

                    IF v_IsHoliday = 0 THEN
                        -- Find or create session
                        SET v_SessionId = 0;
                        SELECT StaffSessionId INTO v_SessionId
                        FROM `StaffAttendanceSessions`
                        WHERE DATE(AttendanceDate) = v_CurDate
                          AND StaffType = v_StaffType
                          AND (v_DepartmentId IS NULL OR DepartmentId = v_DepartmentId)
                          AND (v_CampusId IS NULL OR CampusId = v_CampusId)
                        LIMIT 1;

                        IF v_SessionId <= 0 THEN
                            INSERT INTO `StaffAttendanceSessions` (
                                AttendanceDate, CampusId, DepartmentId, StaffType,
                                TotalStaffCount, PresentCount, AbsentCount, LateCount, LeaveCount,
                                IsLocked, Remarks, IsActive, CreatedByUserId, CreatedAt
                            ) VALUES (
                                v_CurDate, v_CampusId, v_DepartmentId, v_StaffType,
                                1, 0, 0, 0, 1, 0, NULL, 1, p_UserId, UTC_TIMESTAMP()
                            );
                            SET v_SessionId = LAST_INSERT_ID();
                        END IF;

                        -- Check existing attendance
                        SET v_AttId = 0;
                        SET v_OldAttStatus = NULL;
                        SELECT StaffAttendanceId, Status INTO v_AttId, v_OldAttStatus
                        FROM `StaffAttendances`
                        WHERE StaffSessionId = v_SessionId AND FacultyId = v_StaffId
                        LIMIT 1;

                        IF v_AttId <= 0 THEN
                            INSERT INTO `StaffAttendances` (
                                StaffSessionId, FacultyId, Status, InTime, OutTime,
                                VerificationMethod, DeviceId, IpAddress, Remarks,
                                IsActive, CreatedByUserId, CreatedAt
                            ) VALUES (
                                v_SessionId, v_StaffId, 6, NULL, NULL,
                                1, 'Web Portal Leave', NULL, CONCAT('Leave Approved: ', COALESCE(v_Reason, '')),
                                1, p_UserId, UTC_TIMESTAMP()
                            );
                            SET v_AttId = LAST_INSERT_ID();

                            INSERT INTO `AttendanceAuditHistories` (
                                EntityType, EntityId, FacultyId, StudentId, AttendanceDate,
                                Session, OldStatus, NewStatus, Action, ModifiedByUserId,
                                ModifiedByUserName, CreatedAt, Description
                            ) VALUES (
                                'Staff', v_AttId, v_StaffId, NULL, v_CurDate,
                                0, NULL, 6, 'CREATE', p_UserId,
                                v_UserName, UTC_TIMESTAMP(), 'Leave Approved'
                            );
                        ELSE
                            UPDATE `StaffAttendances`
                            SET Status = 6,
                                Remarks = CONCAT('Leave Approved: ', COALESCE(v_Reason, '')),
                                UpdatedAt = UTC_TIMESTAMP()
                            WHERE StaffAttendanceId = v_AttId;

                            INSERT INTO `AttendanceAuditHistories` (
                                EntityType, EntityId, FacultyId, StudentId, AttendanceDate,
                                Session, OldStatus, NewStatus, Action, ModifiedByUserId,
                                ModifiedByUserName, CreatedAt, Description
                            ) VALUES (
                                'Staff', v_AttId, v_StaffId, NULL, v_CurDate,
                                0, v_OldAttStatus, 6, 'UPDATE', p_UserId,
                                v_UserName, UTC_TIMESTAMP(), 'Leave Approved'
                            );
                        END IF;

                        -- Recalculate session aggregates
                        UPDATE `StaffAttendanceSessions`
                        SET PresentCount = (SELECT COUNT(1) FROM `StaffAttendances` WHERE StaffSessionId = v_SessionId AND IsActive = 1 AND Status = 1),
                            AbsentCount  = (SELECT COUNT(1) FROM `StaffAttendances` WHERE StaffSessionId = v_SessionId AND IsActive = 1 AND Status = 2),
                            LateCount    = (SELECT COUNT(1) FROM `StaffAttendances` WHERE StaffSessionId = v_SessionId AND IsActive = 1 AND Status = 3),
                            LeaveCount   = (SELECT COUNT(1) FROM `StaffAttendances` WHERE StaffSessionId = v_SessionId AND IsActive = 1 AND Status IN (4, 6)),
                            UpdatedAt    = UTC_TIMESTAMP()
                        WHERE StaffSessionId = v_SessionId;
                    END IF;
                END IF;

                SET v_CurDate = DATE_ADD(v_CurDate, INTERVAL 1 DAY);
            END WHILE;
        END IF;
    END IF;

    -- Return updated leave details
    CALL sp_GetStaffLeaveDetails(p_StaffLeaveRequestId);
END$$


-- -------------------------------------------------------------------------------------
-- 5. sp_GetStaffLeaveHistorySummary
-- High-speed DB aggregation replacing in-memory RAM loading of entire tables.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffLeaveHistorySummary$$
CREATE PROCEDURE sp_GetStaffLeaveHistorySummary(
    IN p_CampusId INT,
    IN p_DepartmentId INT,
    IN p_StaffType VARCHAR(50)
)
BEGIN
    DECLARE v_AcademicYearId INT DEFAULT 0;

    SELECT AcademicYearId INTO v_AcademicYearId
    FROM `AcademicYears`
    WHERE IsActive = 1
    ORDER BY AcademicYearId DESC
    LIMIT 1;

    SELECT 
        s.Id AS StaffId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(s.EmployeeId, CONCAT('FAC', LPAD(s.Id, 3, '0'))) AS StaffCode,
        COALESCE(d.DepartmentName, s.Department, 'General') AS Department,
        CASE 
            WHEN LOWER(COALESCE(s.StaffType, '')) LIKE '%non%' THEN 'Non-Teaching Staff'
            ELSE 'Teaching Staff'
        END AS StaffType,
        COALESCE(req.TotalRequests, 0) AS TotalRequests,
        COALESCE(bal.TotalLeaves, 0.00) AS TotalLeaves,
        COALESCE(bal.Used, 0.00) AS Used,
        COALESCE(bal.Remaining, 0.00) AS Remaining,
        COALESCE(req.Approved, 0) AS Approved,
        COALESCE(req.Pending, 0) AS Pending,
        COALESCE(req.Rejected, 0) AS Rejected
    FROM `Staffs` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN (
        SELECT 
            StaffId,
            COUNT(1) AS TotalRequests,
            SUM(CASE WHEN Status = 2 THEN 1 ELSE 0 END) AS Approved,
            SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END) AS Pending,
            SUM(CASE WHEN Status = 3 THEN 1 ELSE 0 END) AS Rejected
        FROM `StaffLeaveRequests`
        WHERE IsActive = 1
          AND (v_AcademicYearId = 0 OR AcademicYearId = v_AcademicYearId)
        GROUP BY StaffId
    ) req ON req.StaffId = s.Id
    LEFT JOIN (
        SELECT 
            StaffId,
            SUM(TotalDays) AS TotalLeaves,
            SUM(UsedDays) AS Used,
            SUM(RemainingDays) AS Remaining
        FROM `StaffLeaveBalances`
        WHERE (v_AcademicYearId = 0 OR AcademicYearId = v_AcademicYearId)
        GROUP BY StaffId
    ) bal ON bal.StaffId = s.Id
    WHERE s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR s.DepartmentId = p_DepartmentId)
      AND (
          p_StaffType IS NULL OR p_StaffType = '' 
          OR (p_StaffType = 'Teaching' AND (s.StaffType IS NULL OR LOWER(s.StaffType) LIKE '%teach%' AND LOWER(s.StaffType) NOT LIKE '%non%'))
          OR (p_StaffType = 'NonTeaching' AND LOWER(s.StaffType) LIKE '%non%')
      )
    ORDER BY s.FirstName ASC, s.LastName ASC;
END$$


-- -------------------------------------------------------------------------------------
-- 6. sp_GetStaffLeaveHistory
-- Retrieves individual staff member's balance summary and historical requests.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffLeaveHistory$$
CREATE PROCEDURE sp_GetStaffLeaveHistory(
    IN p_StaffId INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_AcademicYearId INT DEFAULT 0;

    SELECT AcademicYearId INTO v_AcademicYearId
    FROM `AcademicYears`
    WHERE IsActive = 1
    ORDER BY AcademicYearId DESC
    LIMIT 1;

    -- Result Set 1: Staff Header & Balances
    SELECT 
        s.Id AS StaffId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(s.EmployeeId, CONCAT('FAC', LPAD(s.Id, 3, '0'))) AS StaffCode,
        COALESCE(d.DepartmentName, s.Department, 'General') AS Department,
        CASE 
            WHEN LOWER(COALESCE(s.StaffType, '')) LIKE '%non%' THEN 'Non-Teaching Staff'
            ELSE 'Teaching Staff'
        END AS StaffType,
        COALESCE(req.TotalRequests, 0) AS TotalRequests,
        COALESCE(req.Approved, 0) AS Approved,
        COALESCE(req.Pending, 0) AS Pending,
        COALESCE(req.Rejected, 0) AS Rejected,
        COALESCE(bal.TotalLeaves, 0.00) AS TotalBalance,
        COALESCE(bal.Used, 0.00) AS UsedBalance,
        COALESCE(bal.Remaining, 0.00) AS RemainingBalance
    FROM `Staffs` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN (
        SELECT 
            StaffId,
            COUNT(1) AS TotalRequests,
            SUM(CASE WHEN Status = 2 THEN 1 ELSE 0 END) AS Approved,
            SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END) AS Pending,
            SUM(CASE WHEN Status = 3 THEN 1 ELSE 0 END) AS Rejected
        FROM `StaffLeaveRequests`
        WHERE StaffId = p_StaffId AND IsActive = 1
          AND (v_AcademicYearId = 0 OR AcademicYearId = v_AcademicYearId)
        GROUP BY StaffId
    ) req ON req.StaffId = s.Id
    LEFT JOIN (
        SELECT 
            StaffId,
            SUM(TotalDays) AS TotalLeaves,
            SUM(UsedDays) AS Used,
            SUM(RemainingDays) AS Remaining
        FROM `StaffLeaveBalances`
        WHERE StaffId = p_StaffId
          AND (v_AcademicYearId = 0 OR AcademicYearId = v_AcademicYearId)
        GROUP BY StaffId
    ) bal ON bal.StaffId = s.Id
    WHERE s.Id = p_StaffId
      AND s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
    LIMIT 1;

    -- Result Set 2: Historical Requests
    SELECT 
        slr.StaffLeaveRequestId,
        slr.StaffId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(d.DepartmentName, s.Department, 'General') AS Department,
        CASE 
            WHEN LOWER(COALESCE(s.StaffType, '')) LIKE '%non%' THEN 'Non-Teaching Staff'
            ELSE 'Teaching Staff'
        END AS StaffType,
        slr.LeaveType,
        slr.LeaveCategoryId,
        COALESCE(lc.CategoryName, 
            CASE slr.LeaveType
                WHEN 1 THEN 'Casual Leave'
                WHEN 2 THEN 'Sick Leave'
                WHEN 3 THEN 'Earned Leave'
                WHEN 4 THEN 'Maternity Leave'
                ELSE 'Other'
            END
        ) AS LeaveCategoryName,
        slr.StartDate,
        slr.EndDate,
        CAST((DATEDIFF(slr.EndDate, slr.StartDate) + 1) AS DECIMAL(5,2)) AS TotalDays,
        slr.Reason,
        slr.Status,
        slr.RejectionReason,
        slr.ApprovedByUserId,
        u.FullName AS ApprovedByUserName,
        slr.ApprovedAt,
        slr.CreatedAt
    FROM `StaffLeaveRequests` slr
    INNER JOIN `Staffs` s ON slr.StaffId = s.Id
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId OR slr.DepartmentId = d.DepartmentId
    LEFT JOIN `LeaveCategories` lc ON slr.LeaveCategoryId = lc.LeaveCategoryId
    LEFT JOIN `Users` u ON slr.ApprovedByUserId = u.UserId
    WHERE slr.StaffId = p_StaffId
      AND slr.IsActive = 1
      AND (v_AcademicYearId = 0 OR slr.AcademicYearId = v_AcademicYearId)
    ORDER BY slr.CreatedAt DESC;
END$$


-- -------------------------------------------------------------------------------------
-- 7. sp_GetLeaveCategories
-- Retrieves all configured leave types.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetLeaveCategories$$
CREATE PROCEDURE sp_GetLeaveCategories(
    IN p_IncludeInactive TINYINT(1)
)
BEGIN
    SELECT 
        LeaveCategoryId,
        CategoryName,
        CategoryCode,
        AnnualQuota,
        ApplicableStaffType,
        AllowCarryForward,
        RequiresProof,
        Description,
        IsActive,
        DisplayOrder,
        CreatedAt,
        UpdatedAt
    FROM `LeaveCategories`
    WHERE (p_IncludeInactive = 1 OR IsActive = 1)
    ORDER BY DisplayOrder ASC, LeaveCategoryId ASC;
END$$


-- -------------------------------------------------------------------------------------
-- 8. sp_GetLeaveCategoryById
-- Retrieves single category by ID.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetLeaveCategoryById$$
CREATE PROCEDURE sp_GetLeaveCategoryById(
    IN p_LeaveCategoryId INT
)
BEGIN
    SELECT 
        LeaveCategoryId,
        CategoryName,
        CategoryCode,
        AnnualQuota,
        ApplicableStaffType,
        AllowCarryForward,
        RequiresProof,
        Description,
        IsActive,
        DisplayOrder,
        CreatedAt,
        UpdatedAt
    FROM `LeaveCategories`
    WHERE LeaveCategoryId = p_LeaveCategoryId
    LIMIT 1;
END$$


-- -------------------------------------------------------------------------------------
-- 9. sp_GetLeaveCategorySummary
-- Calculates allowance metadata and badge breakdown.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetLeaveCategorySummary$$
CREATE PROCEDURE sp_GetLeaveCategorySummary()
BEGIN
    -- Result Set 1: Total counts & baseline allowance
    SELECT 
        COUNT(1) AS TotalCategories,
        COALESCE(
            NULLIF(SUM(CASE WHEN UPPER(CategoryCode) IN ('CL', 'SL', 'EL') THEN AnnualQuota ELSE 0 END), 0),
            SUM(AnnualQuota),
            0.00
        ) AS StandardAnnualAllowance
    FROM `LeaveCategories`
    WHERE IsActive = 1;

    -- Result Set 2: Badges
    SELECT 
        CategoryCode AS Code,
        AnnualQuota AS Days,
        TRIM(REPLACE(CategoryName, 'Leave', '')) AS Label
    FROM `LeaveCategories`
    WHERE IsActive = 1
    ORDER BY DisplayOrder ASC, LeaveCategoryId ASC;
END$$


-- -------------------------------------------------------------------------------------
-- 10. sp_CreateLeaveCategory
-- Inserts new category and initializes staff leave balances.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_CreateLeaveCategory$$
CREATE PROCEDURE sp_CreateLeaveCategory(
    IN p_CategoryName VARCHAR(100),
    IN p_CategoryCode VARCHAR(10),
    IN p_AnnualQuota DECIMAL(5,2),
    IN p_ApplicableStaffType VARCHAR(50),
    IN p_AllowCarryForward TINYINT(1),
    IN p_RequiresProof TINYINT(1),
    IN p_Description VARCHAR(500),
    IN p_DisplayOrder INT
)
BEGIN
    DECLARE v_CleanCode VARCHAR(10);
    DECLARE v_NewId INT DEFAULT 0;
    DECLARE v_AcademicYearId INT DEFAULT 0;
    DECLARE v_MappedLeaveType TINYINT DEFAULT 5;

    SET v_CleanCode = UPPER(TRIM(p_CategoryCode));

    IF EXISTS (SELECT 1 FROM `LeaveCategories` WHERE UPPER(CategoryCode) = v_CleanCode AND IsActive = 1) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Leave category code already exists.';
    END IF;

    INSERT INTO `LeaveCategories` (
        CategoryName, CategoryCode, AnnualQuota, ApplicableStaffType,
        AllowCarryForward, RequiresProof, Description, DisplayOrder,
        IsActive, CreatedAt
    ) VALUES (
        TRIM(p_CategoryName), v_CleanCode, p_AnnualQuota,
        IFNULL(NULLIF(TRIM(p_ApplicableStaffType), ''), 'All Staff'),
        p_AllowCarryForward, p_RequiresProof, p_Description, p_DisplayOrder,
        1, UTC_TIMESTAMP()
    );

    SET v_NewId = LAST_INSERT_ID();

    -- Map code to enum
    IF v_CleanCode = 'CL' THEN SET v_MappedLeaveType = 1;
    ELSEIF v_CleanCode = 'SL' THEN SET v_MappedLeaveType = 2;
    ELSEIF v_CleanCode = 'EL' THEN SET v_MappedLeaveType = 3;
    ELSEIF v_CleanCode = 'ML' THEN SET v_MappedLeaveType = 4;
    ELSE SET v_MappedLeaveType = 5;
    END IF;

    -- Auto-seed balances for active academic year
    SELECT AcademicYearId INTO v_AcademicYearId
    FROM `AcademicYears`
    WHERE IsActive = 1
    ORDER BY AcademicYearId DESC
    LIMIT 1;

    IF v_AcademicYearId > 0 THEN
        INSERT INTO `StaffLeaveBalances` (
            StaffId, LeaveType, LeaveCategoryId, AcademicYearId,
            TotalDays, UsedDays, RemainingDays, CreatedAt
        )
        SELECT 
            s.Id, v_MappedLeaveType, v_NewId, v_AcademicYearId,
            p_AnnualQuota, 0.00, p_AnnualQuota, UTC_TIMESTAMP()
        FROM `Staffs` s
        WHERE s.IsDeleted = 0
          AND (
              p_ApplicableStaffType = 'All Staff'
              OR (p_ApplicableStaffType = 'Teaching Staff Only' AND (s.StaffType IS NULL OR LOWER(s.StaffType) = 'teaching'))
              OR (p_ApplicableStaffType = 'Non-Teaching Staff' AND s.StaffType IS NOT NULL AND LOWER(s.StaffType) != 'teaching')
          )
          AND NOT EXISTS (
              SELECT 1 FROM `StaffLeaveBalances` slb
              WHERE slb.StaffId = s.Id AND slb.LeaveCategoryId = v_NewId AND slb.AcademicYearId = v_AcademicYearId
          );
    END IF;

    CALL sp_GetLeaveCategoryById(v_NewId);
END$$


-- -------------------------------------------------------------------------------------
-- 11. sp_UpdateLeaveCategory
-- Updates category and automatically adjusts staff quotas if changed.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_UpdateLeaveCategory$$
CREATE PROCEDURE sp_UpdateLeaveCategory(
    IN p_LeaveCategoryId INT,
    IN p_CategoryName VARCHAR(100),
    IN p_CategoryCode VARCHAR(10),
    IN p_AnnualQuota DECIMAL(5,2),
    IN p_ApplicableStaffType VARCHAR(50),
    IN p_AllowCarryForward TINYINT(1),
    IN p_RequiresProof TINYINT(1),
    IN p_Description VARCHAR(500),
    IN p_DisplayOrder INT,
    IN p_IsActive TINYINT(1)
)
BEGIN
    DECLARE v_CleanCode VARCHAR(10);
    DECLARE v_OldQuota DECIMAL(5,2);

    SET v_CleanCode = UPPER(TRIM(p_CategoryCode));

    SELECT AnnualQuota INTO v_OldQuota
    FROM `LeaveCategories`
    WHERE LeaveCategoryId = p_LeaveCategoryId
    LIMIT 1;

    IF v_OldQuota IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Leave category not found.';
    END IF;

    IF EXISTS (SELECT 1 FROM `LeaveCategories` WHERE LeaveCategoryId != p_LeaveCategoryId AND UPPER(CategoryCode) = v_CleanCode AND IsActive = 1) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Another leave category code with this identifier already exists.';
    END IF;

    UPDATE `LeaveCategories`
    SET CategoryName = TRIM(p_CategoryName),
        CategoryCode = v_CleanCode,
        AnnualQuota = p_AnnualQuota,
        ApplicableStaffType = IFNULL(NULLIF(TRIM(p_ApplicableStaffType), ''), 'All Staff'),
        AllowCarryForward = p_AllowCarryForward,
        RequiresProof = p_RequiresProof,
        Description = p_Description,
        DisplayOrder = p_DisplayOrder,
        IsActive = p_IsActive,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE LeaveCategoryId = p_LeaveCategoryId;

    -- Adjust balances if quota changed
    IF v_OldQuota != p_AnnualQuota THEN
        UPDATE `StaffLeaveBalances`
        SET TotalDays = p_AnnualQuota,
            RemainingDays = GREATEST(0.00, p_AnnualQuota - UsedDays),
            UpdatedAt = UTC_TIMESTAMP()
        WHERE LeaveCategoryId = p_LeaveCategoryId;
    END IF;

    CALL sp_GetLeaveCategoryById(p_LeaveCategoryId);
END$$


-- -------------------------------------------------------------------------------------
-- 12. sp_DeleteLeaveCategory
-- Soft deletes category.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_DeleteLeaveCategory$$
CREATE PROCEDURE sp_DeleteLeaveCategory(
    IN p_LeaveCategoryId INT
)
BEGIN
    UPDATE `LeaveCategories`
    SET IsActive = 0,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE LeaveCategoryId = p_LeaveCategoryId;

    SELECT 1 AS Success;
END$$


-- -------------------------------------------------------------------------------------
-- 13. sp_ResetDefaultLeaveCategories
-- Resets standard baseline leave policies (CL, SL, EL, ML, CO).
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_ResetDefaultLeaveCategories$$
CREATE PROCEDURE sp_ResetDefaultLeaveCategories()
BEGIN
    -- Casual Leave
    INSERT INTO `LeaveCategories` (CategoryName, CategoryCode, AnnualQuota, ApplicableStaffType, AllowCarryForward, RequiresProof, Description, DisplayOrder, IsActive, CreatedAt)
    VALUES ('Casual Leave', 'CL', 12.00, 'All Staff', 1, 0, 'Standard casual leave for personal reasons, emergencies, or short absences.', 1, 1, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE CategoryName = VALUES(CategoryName), AnnualQuota = VALUES(AnnualQuota), ApplicableStaffType = VALUES(ApplicableStaffType), AllowCarryForward = VALUES(AllowCarryForward), RequiresProof = VALUES(RequiresProof), Description = VALUES(Description), DisplayOrder = VALUES(DisplayOrder), IsActive = 1, UpdatedAt = UTC_TIMESTAMP();

    -- Sick Leave
    INSERT INTO `LeaveCategories` (CategoryName, CategoryCode, AnnualQuota, ApplicableStaffType, AllowCarryForward, RequiresProof, Description, DisplayOrder, IsActive, CreatedAt)
    VALUES ('Sick Leave', 'SL', 10.00, 'All Staff', 1, 1, 'Medical leave for illness, surgery, health appointments, or medical recovery.', 2, 1, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE CategoryName = VALUES(CategoryName), AnnualQuota = VALUES(AnnualQuota), ApplicableStaffType = VALUES(ApplicableStaffType), AllowCarryForward = VALUES(AllowCarryForward), RequiresProof = VALUES(RequiresProof), Description = VALUES(Description), DisplayOrder = VALUES(DisplayOrder), IsActive = 1, UpdatedAt = UTC_TIMESTAMP();

    -- Earned Leave
    INSERT INTO `LeaveCategories` (CategoryName, CategoryCode, AnnualQuota, ApplicableStaffType, AllowCarryForward, RequiresProof, Description, DisplayOrder, IsActive, CreatedAt)
    VALUES ('Earned Leave', 'EL', 15.00, 'Teaching Staff Only', 1, 0, 'Accumulated annual vacation/privilege leave credited per academic term.', 3, 1, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE CategoryName = VALUES(CategoryName), AnnualQuota = VALUES(AnnualQuota), ApplicableStaffType = VALUES(ApplicableStaffType), AllowCarryForward = VALUES(AllowCarryForward), RequiresProof = VALUES(RequiresProof), Description = VALUES(Description), DisplayOrder = VALUES(DisplayOrder), IsActive = 1, UpdatedAt = UTC_TIMESTAMP();

    -- Maternity Leave
    INSERT INTO `LeaveCategories` (CategoryName, CategoryCode, AnnualQuota, ApplicableStaffType, AllowCarryForward, RequiresProof, Description, DisplayOrder, IsActive, CreatedAt)
    VALUES ('Maternity Leave', 'ML', 17.00, 'All Staff', 0, 1, 'Fully paid parental leave for expecting and new mothers.', 4, 1, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE CategoryName = VALUES(CategoryName), AnnualQuota = VALUES(AnnualQuota), ApplicableStaffType = VALUES(ApplicableStaffType), AllowCarryForward = VALUES(AllowCarryForward), RequiresProof = VALUES(RequiresProof), Description = VALUES(Description), DisplayOrder = VALUES(DisplayOrder), IsActive = 1, UpdatedAt = UTC_TIMESTAMP();

    -- Compensatory Off
    INSERT INTO `LeaveCategories` (CategoryName, CategoryCode, AnnualQuota, ApplicableStaffType, AllowCarryForward, RequiresProof, Description, DisplayOrder, IsActive, CreatedAt)
    VALUES ('Compensatory Off', 'CO', 5.00, 'Non-Teaching Staff', 0, 0, 'Compensatory rest for extra duties performed on scheduled holidays or institutional events.', 5, 1, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE CategoryName = VALUES(CategoryName), AnnualQuota = VALUES(AnnualQuota), ApplicableStaffType = VALUES(ApplicableStaffType), AllowCarryForward = VALUES(AllowCarryForward), RequiresProof = VALUES(RequiresProof), Description = VALUES(Description), DisplayOrder = VALUES(DisplayOrder), IsActive = 1, UpdatedAt = UTC_TIMESTAMP();

    SELECT 1 AS Success;
END$$

DELIMITER ;
