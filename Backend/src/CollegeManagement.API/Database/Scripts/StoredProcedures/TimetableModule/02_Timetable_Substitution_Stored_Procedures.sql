-- =============================================================================
-- MODULE: TIMETABLE SUBSTITUTION STORED PROCEDURES
-- DESCRIPTION: Procedures for managing faculty leave substitutions,
--              conflict resolution, and effective daily schedules.
-- =============================================================================

DELIMITER //

DROP PROCEDURE IF EXISTS `sp_GetAffectedTimetableSlotsForLeave` //
CREATE DEFINER="avnadmin"@"%" PROCEDURE "sp_GetAffectedTimetableSlotsForLeave"(
                IN p_StaffLeaveRequestId INT
            )
BEGIN
                DECLARE v_StaffId INT;
                DECLARE v_StartDate DATE;
                DECLARE v_EndDate DATE;
                DECLARE v_Status TINYINT;
                DECLARE v_AcademicYearId INT;
                DECLARE v_CurDate DATE;

                -- 1. Validate Leave Request
                SELECT StaffId, StartDate, EndDate, Status, AcademicYearId
                INTO v_StaffId, v_StartDate, v_EndDate, v_Status, v_AcademicYearId
                FROM StaffLeaveRequests
                WHERE StaffLeaveRequestId = p_StaffLeaveRequestId AND IsActive = 1
                LIMIT 1;

                IF v_StaffId IS NULL THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Staff leave request not found.';
                END IF;

                -- Only approved leave produces affected classes (Status 2 = Approved)
                IF v_Status <> 2 THEN
                    -- Return empty result set
                    SELECT 
                        0 AS LeaveRequestId, NULL AS SubstitutionDate, 0 AS TimetableId, 
                        0 AS OriginalStaffId, '' AS OriginalStaffName, 0 AS SubjectId, '' AS SubjectName,
                        '' AS BoardName, '' AS AcademicLevelName, '' AS GroupName, '' AS ProgramName,
                        0 AS SectionId, '' AS SectionName, 0 AS PeriodId, '' AS PeriodName, 0 AS PeriodNumber,
                        NULL AS StartTime, NULL AS EndTime, 0 AS RoomId, '' AS RoomNumber, '' AS RoomName,
                        '' AS CurrentSubstitutionStatus, NULL AS ExistingSubstituteStaffId, '' AS ExistingSubstituteStaffName,
                        NULL AS ExistingSubstitutionId
                    WHERE 1 = 0;
                ELSE
                    -- Temporary table for date expansion
                    CREATE TEMPORARY TABLE IF NOT EXISTS TempLeaveDates (
                        LeaveDate DATE NOT NULL,
                        DayOfWeekNumber INT NOT NULL,
                        PRIMARY KEY (LeaveDate)
                    );
                    TRUNCATE TABLE TempLeaveDates;

                    SET v_CurDate = v_StartDate;
                    WHILE v_CurDate <= v_EndDate DO
                        -- Skip Sunday (DAYOFWEEK = 1 in MySQL, in our Timetables Sunday is 7)
                        -- MySQL DAYOFWEEK: 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat
                        -- Our Timetables: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
                        IF DAYOFWEEK(v_CurDate) <> 1 THEN
                            INSERT INTO TempLeaveDates (LeaveDate, DayOfWeekNumber)
                            VALUES (
                                v_CurDate, 
                                CASE DAYOFWEEK(v_CurDate)
                                    WHEN 2 THEN 1 -- Monday
                                    WHEN 3 THEN 2 -- Tuesday
                                    WHEN 4 THEN 3 -- Wednesday
                                    WHEN 5 THEN 4 -- Thursday
                                    WHEN 6 THEN 5 -- Friday
                                    WHEN 7 THEN 6 -- Saturday
                                    WHEN 1 THEN 7 -- Sunday
                                END
                            );
                        END IF;
                        SET v_CurDate = DATE_ADD(v_CurDate, INTERVAL 1 DAY);
                    END WHILE;

                    SELECT 
                        p_StaffLeaveRequestId AS LeaveRequestId,
                        d.LeaveDate AS SubstitutionDate,
                        t.Id AS TimetableId,
                        t.StaffId AS OriginalStaffId,
                        TRIM(CONCAT(COALESCE(origSt.FirstName, ''), ' ', COALESCE(origSt.LastName, ''))) AS OriginalStaffName,
                        origSt.EmployeeId AS OriginalStaffEmployeeId,
                        t.SubjectId,
                        sub.SubjectName,
                        sub.SubjectCode,
                        b.BoardName,
                        al.LevelName AS AcademicLevelName,
                        g.GroupName,
                        p.ProgramName,
                        t.SectionId,
                        sec.SectionName,
                        t.PeriodId,
                        per.PeriodName,
                        COALESCE(per.DisplayOrder, per.PeriodId) AS PeriodNumber,
                        per.StartTime,
                        per.EndTime,
                        t.RoomId,
                        r.RoomNumber,
                        r.RoomName,
                        COALESCE(ts.Status, 'Pending') AS CurrentSubstitutionStatus,
                        ts.SubstituteStaffId AS ExistingSubstituteStaffId,
                        TRIM(CONCAT(COALESCE(subSt.FirstName, ''), ' ', COALESCE(subSt.LastName, ''))) AS ExistingSubstituteStaffName,
                        subSt.EmployeeId AS ExistingSubstituteStaffEmployeeId,
                        ts.Id AS ExistingSubstitutionId,
                        ts.Remarks AS ExistingSubstitutionRemarks
                    FROM TempLeaveDates d
                    INNER JOIN Timetables t ON t.StaffId = v_StaffId 
                                           AND t.DayOfWeek = d.DayOfWeekNumber
                                           AND (v_AcademicYearId IS NULL OR t.AcademicYearId = v_AcademicYearId)
                                           AND t.IsPublished = 1
                    INNER JOIN Staff origSt ON origSt.Id = t.StaffId
                    LEFT JOIN Subjects sub ON sub.SubjectId = t.SubjectId
                    LEFT JOIN Boards b ON b.BoardId = t.BoardId
                    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = t.AcademicLevelId
                    LEFT JOIN `Groups` g ON g.GroupId = t.GroupId
                    LEFT JOIN Programs p ON p.ProgramId = t.ProgramId
                    LEFT JOIN Sections sec ON sec.SectionId = t.SectionId
                    LEFT JOIN Periods per ON per.PeriodId = t.PeriodId
                    LEFT JOIN Rooms r ON r.RoomId = t.RoomId
                    LEFT JOIN TimetableSubstitutions ts ON ts.TimetableId = t.Id 
                                                       AND ts.SubstitutionDate = d.LeaveDate 
                                                       AND ts.Status = 'Active'
                    LEFT JOIN Staff subSt ON subSt.Id = ts.SubstituteStaffId
                    ORDER BY d.LeaveDate ASC, per.StartTime ASC;

                    DROP TEMPORARY TABLE IF EXISTS TempLeaveDates;
                END IF;
            END //

DROP PROCEDURE IF EXISTS `sp_GetEligibleSubstituteStaff` //
CREATE DEFINER="avnadmin"@"%" PROCEDURE "sp_GetEligibleSubstituteStaff"(
            IN p_TimetableId INT,
            IN p_SubstitutionDate DATE
        )
BEGIN
            DECLARE v_SubjectId INT;
            DECLARE v_PeriodId INT;
            DECLARE v_AcademicYearId INT;
            DECLARE v_DayOfWeek INT;
            DECLARE v_OriginalStaffId INT;
            DECLARE v_DayOfWeekNumber INT;

            -- 1. Fetch Timetable slot details
            SELECT SubjectId, PeriodId, AcademicYearId, DayOfWeek, StaffId
            INTO v_SubjectId, v_PeriodId, v_AcademicYearId, v_DayOfWeek, v_OriginalStaffId
            FROM Timetables
            WHERE Id = p_TimetableId
            LIMIT 1;

            IF v_SubjectId IS NULL THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Timetable slot not found.';
            END IF;

            -- Convert SubstitutionDate to DayOfWeekNumber
            SET v_DayOfWeekNumber = CASE DAYOFWEEK(p_SubstitutionDate)
                WHEN 2 THEN 1 -- Monday
                WHEN 3 THEN 2 -- Tuesday
                WHEN 4 THEN 3 -- Wednesday
                WHEN 5 THEN 4 -- Thursday
                WHEN 6 THEN 5 -- Friday
                WHEN 7 THEN 6 -- Saturday
                WHEN 1 THEN 7 -- Sunday
            END;

            -- 2. Query Candidate Staff with full conflict checks
            SELECT 
                s.Id AS StaffId,
                s.EmployeeId,
                TRIM(CONCAT(COALESCE(s.FirstName, ''), ' ', COALESCE(s.LastName, ''))) AS StaffName,
                s.Email,
                s.Mobile,
                s.DepartmentId,
                d.DepartmentName,
                s.DesignationId,
                IFNULL(des.Name, s.Designation) AS DesignationName,
                s.Qualification,
                s.Experience,
                -- Baseline weekly periods count
                (SELECT COUNT(*) 
                 FROM Timetables tt 
                 WHERE tt.StaffId = s.Id AND tt.AcademicYearId = v_AcademicYearId AND tt.IsPublished = 1) AS WeeklyLoadCount,
                -- Substitutions assigned on this date
                (SELECT COUNT(*) 
                 FROM TimetableSubstitutions tsub 
                 WHERE tsub.SubstituteStaffId = s.Id AND tsub.SubstitutionDate = p_SubstitutionDate AND tsub.Status = 'Active') AS DateSubstitutionCount
            FROM Staff s
            -- Must be allocated to the subject via StaffSubjectAllocations
            INNER JOIN StaffSubjectAllocations ssa ON ssa.StaffId = s.Id AND ssa.SubjectId = v_SubjectId
            LEFT JOIN Departments d ON d.DepartmentId = s.DepartmentId
            LEFT JOIN Designations des ON des.Id = s.DesignationId
            WHERE s.IsDeleted = 0
              AND s.Status = 'Active'
              AND s.StaffType = 'Teaching'
              -- 1. Exclude the original staff member on leave
              AND s.Id <> v_OriginalStaffId
              -- 2. Exclude if candidate is on approved leave on requested date
              AND NOT EXISTS (
                  SELECT 1 
                  FROM StaffLeaveRequests slr 
                  WHERE slr.StaffId = s.Id 
                    AND slr.Status = 2 -- Approved
                    AND slr.IsActive = 1
                    AND p_SubstitutionDate BETWEEN slr.StartDate AND slr.EndDate
              )
              -- 3. Exclude if candidate is teaching another baseline published slot at the same time
              AND NOT EXISTS (
                  SELECT 1 
                  FROM Timetables t2 
                  WHERE t2.StaffId = s.Id 
                    AND t2.AcademicYearId = v_AcademicYearId 
                    AND t2.DayOfWeek = v_DayOfWeekNumber 
                    AND t2.PeriodId = v_PeriodId 
                    AND t2.IsPublished = 1
              )
              -- 4. Exclude if candidate is already assigned as a substitute in another section in the same period on this date
              AND NOT EXISTS (
                  SELECT 1 
                  FROM TimetableSubstitutions ts2 
                  WHERE ts2.SubstituteStaffId = s.Id 
                    AND ts2.SubstitutionDate = p_SubstitutionDate 
                    AND ts2.PeriodId = v_PeriodId 
                    AND ts2.Status = 'Active'
              )
            ORDER BY StaffName ASC;
        END //

DROP PROCEDURE IF EXISTS `sp_CreateTimetableSubstitution` //
CREATE DEFINER="avnadmin"@"%" PROCEDURE "sp_CreateTimetableSubstitution"(
                IN p_TimetableId INT,
                IN p_StaffLeaveRequestId INT,
                IN p_SubstitutionDate DATE,
                IN p_SubstituteStaffId INT,
                IN p_Remarks VARCHAR(500),
                IN p_UserId INT
            )
BEGIN
                DECLARE v_SubjectId INT;
                DECLARE v_PeriodId INT;
                DECLARE v_SectionId INT;
                DECLARE v_AcademicYearId INT;
                DECLARE v_DayOfWeek INT;
                DECLARE v_OriginalStaffId INT;
                DECLARE v_LeaveStaffId INT;
                DECLARE v_LeaveStartDate DATE;
                DECLARE v_LeaveEndDate DATE;
                DECLARE v_LeaveStatus TINYINT;
                DECLARE v_DayOfWeekNumber INT;
                DECLARE v_SubstituteStaffType VARCHAR(20);
                DECLARE v_SubstituteStatus VARCHAR(20);
                DECLARE v_SubstituteIsDeleted TINYINT;

                -- 1. Validate Leave Request
                SELECT StaffId, StartDate, EndDate, Status
                INTO v_LeaveStaffId, v_LeaveStartDate, v_LeaveEndDate, v_LeaveStatus
                FROM StaffLeaveRequests
                WHERE StaffLeaveRequestId = p_StaffLeaveRequestId AND IsActive = 1
                LIMIT 1;

                IF v_LeaveStaffId IS NULL THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Staff leave request not found.';
                END IF;

                IF v_LeaveStatus <> 2 THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Leave request must be Approved before assigning substitution.';
                END IF;

                IF p_SubstitutionDate < v_LeaveStartDate OR p_SubstitutionDate > v_LeaveEndDate THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Substitution date is outside the approved leave date range.';
                END IF;

                -- 2. Validate Baseline Timetable slot
                SELECT Id, StaffId, SectionId, PeriodId, SubjectId, AcademicYearId, DayOfWeek
                INTO p_TimetableId, v_OriginalStaffId, v_SectionId, v_PeriodId, v_SubjectId, v_AcademicYearId, v_DayOfWeek
                FROM Timetables
                WHERE Id = p_TimetableId
                LIMIT 1;

                IF v_OriginalStaffId IS NULL THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Timetable slot not found.';
                END IF;

                IF v_OriginalStaffId <> v_LeaveStaffId THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Timetable slot does not belong to the staff member on leave.';
                END IF;

                -- 3. Calculate Day of Week
                SET v_DayOfWeekNumber = CASE DAYOFWEEK(p_SubstitutionDate)
                    WHEN 2 THEN 1 -- Monday
                    WHEN 3 THEN 2 -- Tuesday
                    WHEN 4 THEN 3 -- Wednesday
                    WHEN 5 THEN 4 -- Thursday
                    WHEN 6 THEN 5 -- Friday
                    WHEN 7 THEN 6 -- Saturday
                    WHEN 1 THEN 7 -- Sunday
                END;

                IF v_DayOfWeek <> v_DayOfWeekNumber THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Substitution date weekday does not match the timetable slot weekday.';
                END IF;

                -- 4. Check for existing ACTIVE substitution on TimetableId + SubstitutionDate
                IF EXISTS (
                    SELECT 1 
                    FROM TimetableSubstitutions 
                    WHERE TimetableId = p_TimetableId 
                      AND SubstitutionDate = p_SubstitutionDate 
                      AND Status = 'Active'
                ) THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An active substitution already exists for this timetable slot and date.';
                END IF;

                -- 5. Validate Substitute Staff
                SELECT StaffType, Status, IsDeleted
                INTO v_SubstituteStaffType, v_SubstituteStatus, v_SubstituteIsDeleted
                FROM Staff
                WHERE Id = p_SubstituteStaffId
                LIMIT 1;

                IF v_SubstituteStaffType IS NULL OR v_SubstituteIsDeleted = 1 OR v_SubstituteStatus <> 'Active' THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Active substitute staff member not found.';
                END IF;

                IF v_SubstituteStaffType <> 'Teaching' THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only teaching staff can be assigned as substitutes.';
                END IF;

                IF p_SubstituteStaffId = v_OriginalStaffId THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Substitute staff cannot be the original staff member on leave.';
                END IF;

                -- 6. Check Subject Allocation
                IF NOT EXISTS (
                    SELECT 1 
                    FROM StaffSubjectAllocations 
                    WHERE StaffId = p_SubstituteStaffId AND SubjectId = v_SubjectId
                ) THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Substitute staff is not allocated to teach this subject.';
                END IF;

                -- 7. Check if substitute is on approved leave
                IF EXISTS (
                    SELECT 1 
                    FROM StaffLeaveRequests 
                    WHERE StaffId = p_SubstituteStaffId 
                      AND Status = 2 
                      AND IsActive = 1
                      AND p_SubstitutionDate BETWEEN StartDate AND EndDate
                ) THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Substitute staff is on approved leave on the selected date.';
                END IF;

                -- 8. Check if substitute has a baseline timetable conflict
                IF EXISTS (
                    SELECT 1 
                    FROM Timetables 
                    WHERE StaffId = p_SubstituteStaffId 
                      AND AcademicYearId = v_AcademicYearId 
                      AND DayOfWeek = v_DayOfWeekNumber 
                      AND PeriodId = v_PeriodId 
                      AND IsPublished = 1
                ) THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Substitute staff is already teaching another section in this period on this day.';
                END IF;

                -- 9. Check if substitute has an active substitution conflict
                IF EXISTS (
                    SELECT 1 
                    FROM TimetableSubstitutions 
                    WHERE SubstituteStaffId = p_SubstituteStaffId 
                      AND SubstitutionDate = p_SubstitutionDate 
                      AND PeriodId = v_PeriodId 
                      AND Status = 'Active'
                ) THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Substitute staff is already assigned as a substitute for another section in this period.';
                END IF;

                -- 10. Insert Substitution (Baseline Timetables.StaffId is NOT altered)
                INSERT INTO `TimetableSubstitutions` (
                    `TimetableId`,
                    `StaffLeaveRequestId`,
                    `SubstitutionDate`,
                    `OriginalStaffId`,
                    `SubstituteStaffId`,
                    `SectionId`,
                    `PeriodId`,
                    `Status`,
                    `Remarks`,
                    `CreatedByUserId`,
                    `CreatedAt`
                )
                VALUES (
                    p_TimetableId,
                    p_StaffLeaveRequestId,
                    p_SubstitutionDate,
                    v_OriginalStaffId,
                    p_SubstituteStaffId,
                    v_SectionId,
                    v_PeriodId,
                    'Active',
                    p_Remarks,
                    p_UserId,
                    NOW(6)
                );

                SELECT LAST_INSERT_ID() AS NewSubstitutionId;
            END //

DROP PROCEDURE IF EXISTS `sp_GetTimetableSubstitutions` //
CREATE DEFINER="avnadmin"@"%" PROCEDURE "sp_GetTimetableSubstitutions"(
                IN p_SubstitutionDate DATE,
                IN p_SectionId INT,
                IN p_StaffId INT,
                IN p_AcademicYearId INT
            )
BEGIN
                SELECT 
                    ts.Id AS SubstitutionId,
                    ts.SubstitutionDate,
                    ts.TimetableId,
                    ts.StaffLeaveRequestId,
                    ts.OriginalStaffId,
                    TRIM(CONCAT(COALESCE(origSt.FirstName, ''), ' ', COALESCE(origSt.LastName, ''))) AS OriginalStaffName,
                    origSt.EmployeeId AS OriginalStaffEmployeeId,
                    ts.SubstituteStaffId,
                    TRIM(CONCAT(COALESCE(subSt.FirstName, ''), ' ', COALESCE(subSt.LastName, ''))) AS SubstituteStaffName,
                    subSt.EmployeeId AS SubstituteStaffEmployeeId,
                    t.SubjectId,
                    sub.SubjectName,
                    sub.SubjectCode,
                    b.BoardName,
                    al.LevelName AS AcademicLevelName,
                    g.GroupName,
                    p.ProgramName,
                    ts.SectionId,
                    sec.SectionName,
                    ts.PeriodId,
                    per.PeriodName,
                    COALESCE(per.DisplayOrder, per.PeriodId) AS PeriodNumber,
                    per.StartTime,
                    per.EndTime,
                    t.RoomId,
                    r.RoomNumber,
                    r.RoomName,
                    ts.Status,
                    ts.Remarks,
                    ts.CreatedAt,
                    ts.UpdatedAt
                FROM TimetableSubstitutions ts
                INNER JOIN Timetables t ON t.Id = ts.TimetableId
                INNER JOIN Staff origSt ON origSt.Id = ts.OriginalStaffId
                INNER JOIN Staff subSt ON subSt.Id = ts.SubstituteStaffId
                LEFT JOIN Subjects sub ON sub.SubjectId = t.SubjectId
                LEFT JOIN Boards b ON b.BoardId = t.BoardId
                LEFT JOIN AcademicLevels al ON al.AcademicLevelId = t.AcademicLevelId
                LEFT JOIN `Groups` g ON g.GroupId = t.GroupId
                LEFT JOIN Programs p ON p.ProgramId = t.ProgramId
                LEFT JOIN Sections sec ON sec.SectionId = ts.SectionId
                LEFT JOIN Periods per ON per.PeriodId = ts.PeriodId
                LEFT JOIN Rooms r ON r.RoomId = t.RoomId
                WHERE (p_SubstitutionDate IS NULL OR ts.SubstitutionDate = p_SubstitutionDate)
                  AND (p_SectionId IS NULL OR ts.SectionId = p_SectionId)
                  AND (p_StaffId IS NULL OR ts.OriginalStaffId = p_StaffId OR ts.SubstituteStaffId = p_StaffId)
                  AND (p_AcademicYearId IS NULL OR t.AcademicYearId = p_AcademicYearId)
                ORDER BY ts.SubstitutionDate DESC, per.StartTime ASC;
            END //

DROP PROCEDURE IF EXISTS `sp_GetTimetableSubstitutionById` //
CREATE DEFINER="avnadmin"@"%" PROCEDURE "sp_GetTimetableSubstitutionById"(
    IN p_Id INT
)
BEGIN
    SELECT 
        ts.Id AS SubstitutionId,
        ts.SubstitutionDate,
        ts.TimetableId,
        ts.StaffLeaveRequestId,
        ts.OriginalStaffId,
        TRIM(CONCAT(COALESCE(origSt.FirstName, ''), ' ', COALESCE(origSt.LastName, ''))) AS OriginalStaffName,
        origSt.EmployeeId AS OriginalStaffEmployeeId,
        ts.SubstituteStaffId,
        TRIM(CONCAT(COALESCE(subSt.FirstName, ''), ' ', COALESCE(subSt.LastName, ''))) AS SubstituteStaffName,
        subSt.EmployeeId AS SubstituteStaffEmployeeId,
        t.SubjectId,
        sub.SubjectName,
        sub.SubjectCode,
        b.BoardName,
        al.LevelName AS AcademicLevelName,
        g.GroupName,
        p.ProgramName,
        ts.SectionId,
        sec.SectionName,
        ts.PeriodId,
        per.PeriodName,
        COALESCE(per.DisplayOrder, per.PeriodId) AS PeriodNumber,
        per.StartTime,
        per.EndTime,
        t.RoomId,
        r.RoomNumber,
        r.RoomName,
        ts.Status,
        ts.Remarks,
        ts.CreatedAt,
        ts.UpdatedAt
    FROM TimetableSubstitutions ts
    INNER JOIN Timetables t ON t.Id = ts.TimetableId
    INNER JOIN Staff origSt ON origSt.Id = ts.OriginalStaffId
    INNER JOIN Staff subSt ON subSt.Id = ts.SubstituteStaffId
    LEFT JOIN Subjects sub ON sub.SubjectId = t.SubjectId
    LEFT JOIN Boards b ON b.BoardId = t.BoardId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = t.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = t.GroupId
    LEFT JOIN Programs p ON p.ProgramId = t.ProgramId
    LEFT JOIN Sections sec ON sec.SectionId = ts.SectionId
    LEFT JOIN Periods per ON per.PeriodId = ts.PeriodId
    LEFT JOIN Rooms r ON r.RoomId = t.RoomId
    WHERE ts.Id = p_Id
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CancelTimetableSubstitution` //
CREATE DEFINER="avnadmin"@"%" PROCEDURE "sp_CancelTimetableSubstitution"(
                IN p_SubstitutionId INT,
                IN p_UserId INT,
                IN p_Reason VARCHAR(500)
            )
BEGIN
                IF NOT EXISTS (SELECT 1 FROM TimetableSubstitutions WHERE Id = p_SubstitutionId) THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Timetable substitution record not found.';
                END IF;

                UPDATE TimetableSubstitutions
                SET Status = 'Cancelled',
                    Remarks = CASE 
                        WHEN p_Reason IS NOT NULL AND p_Reason <> '' THEN CONCAT(COALESCE(Remarks, ''), ' | Cancelled: ', p_Reason)
                        ELSE Remarks 
                    END,
                    UpdatedByUserId = p_UserId,
                    UpdatedAt = NOW(6)
                WHERE Id = p_SubstitutionId;

                SELECT ROW_COUNT() AS RowsAffected;
            END //

DROP PROCEDURE IF EXISTS `sp_CancelSubstitutionsByLeaveRequestId` //
CREATE DEFINER="avnadmin"@"%" PROCEDURE "sp_CancelSubstitutionsByLeaveRequestId"(
                IN p_StaffLeaveRequestId INT,
                IN p_UserId INT
            )
BEGIN
                UPDATE TimetableSubstitutions
                SET Status = 'Cancelled',
                    Remarks = CONCAT(COALESCE(Remarks, ''), ' | Auto-cancelled due to leave revocation/rejection'),
                    UpdatedByUserId = p_UserId,
                    UpdatedAt = NOW(6)
                WHERE StaffLeaveRequestId = p_StaffLeaveRequestId
                  AND Status = 'Active';

                SELECT ROW_COUNT() AS RowsAffected;
            END //

DROP PROCEDURE IF EXISTS `sp_GetEffectiveTimetableByDate` //
CREATE DEFINER="avnadmin"@"%" PROCEDURE "sp_GetEffectiveTimetableByDate"(
                IN p_Date DATE,
                IN p_SectionId INT,
                IN p_StaffId INT,
                IN p_StudentId INT,
                IN p_AcademicYearId INT
            )
BEGIN
                DECLARE v_DayOfWeekNumber INT;
                DECLARE v_ResolvedSectionId INT;
                DECLARE v_ResolvedAcademicYearId INT;

                -- If StudentId is provided, resolve student's section and academic year
                IF p_StudentId IS NOT NULL AND p_StudentId > 0 THEN
                    SELECT SectionId, AcademicYearId
                    INTO v_ResolvedSectionId, v_ResolvedAcademicYearId
                    FROM Students
                    WHERE StudentId = p_StudentId AND IsActive = 1
                    LIMIT 1;

                    SET p_SectionId = v_ResolvedSectionId;
                    SET p_AcademicYearId = COALESCE(p_AcademicYearId, v_ResolvedAcademicYearId);
                END IF;

                -- Map DayOfWeek
                SET v_DayOfWeekNumber = CASE DAYOFWEEK(p_Date)
                    WHEN 2 THEN 1 -- Monday
                    WHEN 3 THEN 2 -- Tuesday
                    WHEN 4 THEN 3 -- Wednesday
                    WHEN 5 THEN 4 -- Thursday
                    WHEN 6 THEN 5 -- Friday
                    WHEN 7 THEN 6 -- Saturday
                    WHEN 1 THEN 7 -- Sunday
                END;

                SELECT 
                    t.Id AS TimetableId,
                    p_Date AS TimetableDate,
                    t.DayOfWeek,
                    CASE t.DayOfWeek
                        WHEN 1 THEN 'Monday'
                        WHEN 2 THEN 'Tuesday'
                        WHEN 3 THEN 'Wednesday'
                        WHEN 4 THEN 'Thursday'
                        WHEN 5 THEN 'Friday'
                        WHEN 6 THEN 'Saturday'
                        WHEN 7 THEN 'Sunday'
                        ELSE ''
                    END AS DayName,
                    t.PeriodId,
                    per.PeriodName,
                    COALESCE(per.DisplayOrder, per.PeriodId) AS PeriodNumber,
                    per.StartTime,
                    per.EndTime,
                    per.IsBreak,
                    t.SubjectId,
                    sub.SubjectName,
                    sub.SubjectCode,
                    b.BoardId,
                    b.BoardName,
                    al.AcademicLevelId,
                    al.LevelName AS AcademicLevelName,
                    g.GroupId,
                    g.GroupName,
                    p.ProgramId,
                    p.ProgramName,
                    t.SectionId,
                    sec.SectionName,
                    t.RoomId,
                    r.RoomNumber,
                    r.RoomName,
                    -- Effective Staff Determination: Overlay active substitution
                    CASE 
                        WHEN ts.Id IS NOT NULL THEN ts.SubstituteStaffId 
                        ELSE t.StaffId 
                    END AS EffectiveStaffId,
                    CASE 
                        WHEN ts.Id IS NOT NULL THEN TRIM(CONCAT(COALESCE(subSt.FirstName, ''), ' ', COALESCE(subSt.LastName, '')))
                        ELSE TRIM(CONCAT(COALESCE(origSt.FirstName, ''), ' ', COALESCE(origSt.LastName, '')))
                    END AS EffectiveStaffName,
                    CASE 
                        WHEN ts.Id IS NOT NULL THEN subSt.EmployeeId
                        ELSE origSt.EmployeeId
                    END AS EffectiveStaffEmployeeId,
                    -- Substitution Meta Info
                    CASE WHEN ts.Id IS NOT NULL THEN 1 ELSE 0 END AS IsSubstituted,
                    t.StaffId AS OriginalStaffId,
                    TRIM(CONCAT(COALESCE(origSt.FirstName, ''), ' ', COALESCE(origSt.LastName, ''))) AS OriginalStaffName,
                    origSt.EmployeeId AS OriginalStaffEmployeeId,
                    ts.Id AS SubstitutionId,
                    ts.Remarks AS SubstitutionRemarks
                FROM Timetables t
                INNER JOIN Staff origSt ON origSt.Id = t.StaffId
                LEFT JOIN Subjects sub ON sub.SubjectId = t.SubjectId
                LEFT JOIN Boards b ON b.BoardId = t.BoardId
                LEFT JOIN AcademicLevels al ON al.AcademicLevelId = t.AcademicLevelId
                LEFT JOIN `Groups` g ON g.GroupId = t.GroupId
                LEFT JOIN Programs p ON p.ProgramId = t.ProgramId
                LEFT JOIN Sections sec ON sec.SectionId = t.SectionId
                LEFT JOIN Periods per ON per.PeriodId = t.PeriodId
                LEFT JOIN Rooms r ON r.RoomId = t.RoomId
                LEFT JOIN TimetableSubstitutions ts ON ts.TimetableId = t.Id 
                                                   AND ts.SubstitutionDate = p_Date 
                                                   AND ts.Status = 'Active'
                LEFT JOIN Staff subSt ON subSt.Id = ts.SubstituteStaffId
                WHERE t.DayOfWeek = v_DayOfWeekNumber
                  AND t.IsPublished = 1
                  AND (p_AcademicYearId IS NULL OR t.AcademicYearId = p_AcademicYearId)
                  AND (p_SectionId IS NULL OR t.SectionId = p_SectionId)
                  -- For staff filter: include if staff is either the effective substitute OR original staff (when not substituted)
                  AND (
                      p_StaffId IS NULL 
                      OR (ts.Id IS NOT NULL AND ts.SubstituteStaffId = p_StaffId)
                      OR (ts.Id IS NULL AND t.StaffId = p_StaffId)
                  )
                ORDER BY per.StartTime ASC;
DROP PROCEDURE IF EXISTS `sp_GetTimetableSubstitutionsByIds` //
CREATE PROCEDURE `sp_GetTimetableSubstitutionsByIds`(
    IN p_Ids VARCHAR(2000)
)
BEGIN
    SELECT 
        ts.Id AS SubstitutionId,
        ts.SubstitutionDate,
        ts.TimetableId,
        ts.StaffLeaveRequestId,
        ts.OriginalStaffId,
        TRIM(CONCAT(COALESCE(origSt.FirstName, ''), ' ', COALESCE(origSt.LastName, ''))) AS OriginalStaffName,
        origSt.EmployeeId AS OriginalStaffEmployeeId,
        ts.SubstituteStaffId,
        TRIM(CONCAT(COALESCE(subSt.FirstName, ''), ' ', COALESCE(subSt.LastName, ''))) AS SubstituteStaffName,
        subSt.EmployeeId AS SubstituteStaffEmployeeId,
        t.SubjectId,
        sub.SubjectName,
        sub.SubjectCode,
        b.BoardName,
        al.LevelName AS AcademicLevelName,
        g.GroupName,
        p.ProgramName,
        ts.SectionId,
        sec.SectionName,
        ts.PeriodId,
        per.PeriodName,
        COALESCE(per.DisplayOrder, per.PeriodId) AS PeriodNumber,
        per.StartTime,
        per.EndTime,
        t.RoomId,
        r.RoomNumber,
        r.RoomName,
        ts.Status,
        ts.Remarks,
        ts.CreatedAt,
        ts.UpdatedAt
    FROM TimetableSubstitutions ts
    INNER JOIN Timetables t ON t.Id = ts.TimetableId
    INNER JOIN Staff origSt ON origSt.Id = ts.OriginalStaffId
    INNER JOIN Staff subSt ON subSt.Id = ts.SubstituteStaffId
    LEFT JOIN Subjects sub ON sub.SubjectId = t.SubjectId
    LEFT JOIN Boards b ON b.BoardId = t.BoardId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = t.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = t.GroupId
    LEFT JOIN Programs p ON p.ProgramId = t.ProgramId
    LEFT JOIN Sections sec ON sec.SectionId = ts.SectionId
    LEFT JOIN Periods per ON per.PeriodId = ts.PeriodId
    LEFT JOIN Rooms r ON r.RoomId = t.RoomId
    WHERE FIND_IN_SET(ts.Id, p_Ids) > 0;
END //

DELIMITER ;
