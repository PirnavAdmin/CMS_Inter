-- ====================================================================================
-- CMS_Inter — Faculty User Dashboard Consolidated Stored Procedures
-- File: 22_Faculty_Dashboard_Consolidated_SPs.sql
-- Covers: Staff Settings, Faculty Evaluations (Marks Entry & Submission), and Timetable
-- Database: MySQL 8.0+
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- 1. sp_GetStaffSettings
-- Retrieves staff personal profile, department, designation, and custom preferences
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStaffSettings`;
DELIMITER //
CREATE PROCEDURE `sp_GetStaffSettings`(
    IN p_StaffId INT
)
BEGIN
    SELECT 
        s.Id,
        TRIM(CONCAT(COALESCE(s.FirstName, ''), ' ', COALESCE(s.LastName, ''))) AS FullName,
        COALESCE(s.EmployeeId, '') AS EmployeeId,
        COALESCE(d.DepartmentName, 'Not Assigned') AS Department,
        COALESCE(des.Name, s.Designation, 'Faculty') AS Designation,
        COALESCE(s.Mobile, '') AS Mobile,
        COALESCE(s.Email, '') AS PersonalEmail,
        COALESCE(s.CurrentAddress, '') AS Address,
        COALESCE(s.AlternateMobile, '') AS EmergencyContact,
        s.DepartmentSpecificJson AS CustomFieldsJson
    FROM Staff s
    LEFT JOIN Departments d ON d.DepartmentId = s.DepartmentId
    LEFT JOIN Designations des ON des.Id = s.DesignationId
    WHERE s.Id = p_StaffId AND s.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 2. sp_UpdateStaffProfileSettings
-- Updates staff profile contact & personal info and synchronizes linked user record
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateStaffProfileSettings`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateStaffProfileSettings`(
    IN p_StaffId INT,
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Mobile VARCHAR(20),
    IN p_Email VARCHAR(150),
    IN p_Address VARCHAR(500),
    IN p_EmergencyContact VARCHAR(20)
)
BEGIN
    -- Update Staff record
    UPDATE Staff
    SET FirstName = TRIM(p_FirstName),
        LastName = TRIM(p_LastName),
        Mobile = TRIM(p_Mobile),
        Email = TRIM(p_Email),
        CurrentAddress = TRIM(p_Address),
        AlternateMobile = TRIM(p_EmergencyContact),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_StaffId;

    -- Update linked User account if exists
    UPDATE Users
    SET FullName = TRIM(CONCAT(p_FirstName, ' ', p_LastName)),
        PhoneNumber = TRIM(p_Mobile),
        Email = TRIM(p_Email),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StaffId = p_StaffId;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 3. sp_UpdateStaffPreferences
-- Updates staff preferences JSON in Staff.CustomFieldsJson
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateStaffPreferences`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateStaffPreferences`(
    IN p_StaffId INT,
    IN p_PreferencesJson LONGTEXT
)
BEGIN
    UPDATE Staff
    SET DepartmentSpecificJson = p_PreferencesJson,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_StaffId;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 4. sp_GetFacultyEvaluations
-- Retrieves evaluations assigned to a faculty member with joined details
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetFacultyEvaluations`;
DELIMITER //
CREATE PROCEDURE `sp_GetFacultyEvaluations`(
    IN p_FacultyId INT,
    IN p_Status INT,
    IN p_ExaminationStatus VARCHAR(50)
)
BEGIN
    SELECT 
        MIN(m.MarkId) AS EvaluationId,
        m.ExaminationId,
        COALESCE(MAX(e.ExamName), CONCAT('Exam #', m.ExaminationId)) AS ExaminationName,
        m.SectionId,
        COALESCE(MAX(sec.SectionName), CONCAT('Section #', m.SectionId)) AS SectionName,
        m.SubjectId,
        COALESCE(MAX(s.SubjectName), CONCAT('Subject #', m.SubjectId)) AS SubjectName,
        COALESCE(MAX(s.SubjectCode), '') AS SubjectCode,
        m.FacultyId,
        COALESCE(MAX(CONCAT(f.FirstName, ' ', f.LastName)), '') AS FacultyName,
        COALESCE(MAX(f.EmployeeId), '') AS FacultyCode,
        CASE m.Status
            WHEN 1 THEN 'SUBMITTED'
            WHEN 2 THEN 'VERIFIED'
            WHEN 3 THEN 'APPROVED'
            WHEN 4 THEN 'REJECTED'
            ELSE 'DRAFT'
        END AS Status,
        'REGULAR' AS Mode,
        COALESCE(MAX(s.TotalMarks), 100) AS MaxMarks,
        COALESCE(MAX(s.InternalMarks), 30) AS InternalMax,
        COALESCE(MAX(s.PracticalMarks), 0) AS PracticalMax,
        COALESCE(MAX(s.ExternalMarks), 70) AS TheoryMax,
        COALESCE(MAX(e.PassPercentage), 35) AS PassPercentage,
        MIN(m.Remarks) AS RejectionReason,
        0 AS ResubmissionCount,
        1 AS RowVersion
    FROM `Marks` m
    INNER JOIN `Examinations` e ON e.ExamId = m.ExaminationId
    LEFT JOIN `Sections` sec ON sec.SectionId = m.SectionId
    LEFT JOIN `Subjects` s ON s.SubjectId = m.SubjectId
    LEFT JOIN `Staff` f ON f.Id = m.FacultyId
    WHERE m.IsActive = 1
      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR m.FacultyId = p_FacultyId)
      AND (p_Status IS NULL OR p_Status = 0 OR m.Status = p_Status)
      AND (p_ExaminationStatus IS NULL OR p_ExaminationStatus = '' OR LOWER(e.Status) = LOWER(p_ExaminationStatus))
    GROUP BY m.SubjectId, m.SectionId, m.ExaminationId, m.FacultyId, m.Status
    ORDER BY m.ExaminationId DESC, m.SubjectId ASC;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 5. sp_GetFacultyEvaluationStudents
-- Returns subject maxima and student list for a specific faculty evaluation
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetFacultyEvaluationStudents`;
DELIMITER //
CREATE PROCEDURE `sp_GetFacultyEvaluationStudents`(
    IN p_SubjectId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_CampusId INT
)
BEGIN
    -- Result Set 1: Evaluation Header & Subject Maxima
    SELECT 
        COALESCE(MIN(m.MarkId), 0) AS EvaluationId,
        p_ExaminationId AS ExaminationId,
        COALESCE(MAX(e.ExamName), '') AS ExaminationName,
        p_SectionId AS SectionId,
        COALESCE(MAX(sec.SectionName), '') AS SectionName,
        p_SubjectId AS SubjectId,
        COALESCE(MAX(s.SubjectName), '') AS SubjectName,
        COALESCE(MAX(s.SubjectCode), '') AS SubjectCode,
        COALESCE(MIN(m.FacultyId), 0) AS FacultyId,
        COALESCE(MAX(CONCAT(f.FirstName, ' ', f.LastName)), '') AS FacultyName,
        COALESCE(MAX(f.EmployeeId), '') AS FacultyCode,
        'REGULAR' AS Mode,
        COALESCE(MAX(s.TotalMarks), 100) AS MaxMarks,
        COALESCE(MAX(s.ExternalMarks), 70) AS TheoryMax,
        COALESCE(MAX(s.PracticalMarks), 0) AS PracticalMax,
        COALESCE(MAX(s.InternalMarks), 30) AS InternalMax,
        COALESCE(MAX(e.PassPercentage), 35) AS PassPercentage,
        COALESCE(MAX(s.Practical), 0) AS IsPracticalApplicable,
        CASE COALESCE(MIN(m.Status), 0)
            WHEN 1 THEN 'SUBMITTED'
            WHEN 2 THEN 'VERIFIED'
            WHEN 3 THEN 'APPROVED'
            WHEN 4 THEN 'REJECTED'
            ELSE 'DRAFT'
        END AS Status,
        MIN(m.Remarks) AS RejectionReason,
        1 AS RowVersion
    FROM `Subjects` s
    CROSS JOIN `Examinations` e ON e.ExamId = p_ExaminationId
    LEFT JOIN `Sections` sec ON sec.SectionId = p_SectionId
    LEFT JOIN `Marks` m ON m.SubjectId = p_SubjectId 
                       AND m.SectionId = p_SectionId 
                       AND m.ExaminationId = p_ExaminationId 
                       AND m.IsActive = 1
    LEFT JOIN `Staff` f ON f.Id = m.FacultyId
    WHERE s.SubjectId = p_SubjectId
    GROUP BY s.SubjectId, e.ExamId, sec.SectionId;

    -- Result Set 2: Student Marks List
    SELECT 
        st.StudentId,
        COALESCE(st.RollNo, st.AdmissionNo, CONCAT('STU-', LPAD(st.StudentId, 4, '0'))) AS RollNo,
        COALESCE(st.StudentName, CONCAT('Student #', st.StudentId)) AS StudentName,
        COALESCE(m.InternalMarks, 0) AS InternalMarks,
        COALESCE(m.PracticalMarks, 0) AS PracticalMarks,
        COALESCE(m.TheoryMarks, 0) AS TheoryMarks,
        COALESCE(m.TotalMarks, 0) AS TotalMarks,
        COALESCE(m.PassingMarks, 35) AS PassingMarks,
        COALESCE(m.IsAbsent, 0) AS IsAbsent,
        m.Remarks
    FROM `Students` st
    LEFT JOIN `Marks` m ON m.StudentId = st.StudentId 
                       AND m.SubjectId = p_SubjectId 
                       AND m.SectionId = p_SectionId 
                       AND m.ExaminationId = p_ExaminationId 
                       AND m.IsActive = 1
    WHERE st.SectionId = p_SectionId
      AND st.IsActive = 1
    ORDER BY st.RollNo ASC, st.StudentName ASC;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 6. sp_SaveFacultyDraftMarks
-- Batch upserts draft marks using JSON payload
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_SaveFacultyDraftMarks`;
DELIMITER //
CREATE PROCEDURE `sp_SaveFacultyDraftMarks`(
    IN p_SubjectId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_FacultyId INT,
    IN p_MarksJson LONGTEXT
)
BEGIN
    DECLARE v_AcademicYearId INT DEFAULT 1;
    DECLARE v_GroupId INT DEFAULT 1;
    DECLARE v_BoardId INT DEFAULT 1;
    DECLARE v_AcademicLevelId INT DEFAULT 1;

    -- Fetch contextual academic IDs from Section
    SELECT AcademicYearId, GroupId, BoardId, AcademicLevelId 
    INTO v_AcademicYearId, v_GroupId, v_BoardId, v_AcademicLevelId
    FROM `Sections`
    WHERE SectionId = p_SectionId
    LIMIT 1;

    -- Ensure valid GroupId foreign key fallback
    IF v_GroupId IS NULL OR NOT EXISTS (SELECT 1 FROM `Groups` WHERE GroupId = v_GroupId) THEN
        SELECT GroupId INTO v_GroupId FROM `Groups` LIMIT 1;
    END IF;

    -- Ensure valid AcademicYearId foreign key fallback
    IF v_AcademicYearId IS NULL OR NOT EXISTS (SELECT 1 FROM `AcademicYears` WHERE AcademicYearId = v_AcademicYearId) THEN
        SELECT AcademicYearId INTO v_AcademicYearId FROM `AcademicYears` LIMIT 1;
    END IF;

    -- Ensure valid BoardId foreign key fallback
    IF v_BoardId IS NULL OR NOT EXISTS (SELECT 1 FROM `Boards` WHERE BoardId = v_BoardId) THEN
        SELECT BoardId INTO v_BoardId FROM `Boards` LIMIT 1;
    END IF;

    -- Ensure valid AcademicLevelId foreign key fallback
    IF v_AcademicLevelId IS NULL OR NOT EXISTS (SELECT 1 FROM `AcademicLevels` WHERE AcademicLevelId = v_AcademicLevelId) THEN
        SELECT AcademicLevelId INTO v_AcademicLevelId FROM `AcademicLevels` LIMIT 1;
    END IF;

    CREATE TEMPORARY TABLE IF NOT EXISTS tmp_faculty_marks (
        StudentId INT,
        InternalMarks INT,
        PracticalMarks INT,
        TheoryMarks INT,
        TotalMarks INT,
        PassingMarks INT,
        IsAbsent TINYINT(1),
        Remarks VARCHAR(250)
    );
    TRUNCATE TABLE tmp_faculty_marks;

    INSERT INTO tmp_faculty_marks (StudentId, InternalMarks, PracticalMarks, TheoryMarks, TotalMarks, PassingMarks, IsAbsent, Remarks)
    SELECT 
        jt.StudentId,
        COALESCE(jt.InternalMarks, 0),
        COALESCE(jt.PracticalMarks, 0),
        COALESCE(jt.TheoryMarks, 0),
        COALESCE(jt.TotalMarks, COALESCE(jt.InternalMarks, 0) + COALESCE(jt.PracticalMarks, 0) + COALESCE(jt.TheoryMarks, 0)),
        COALESCE(jt.PassingMarks, 35),
        COALESCE(jt.IsAbsent, 0),
        jt.Remarks
    FROM JSON_TABLE(
        p_MarksJson,
        '$[*]' COLUMNS (
            StudentId INT PATH '$.studentId',
            InternalMarks INT PATH '$.internalMarks',
            PracticalMarks INT PATH '$.practicalMarks',
            TheoryMarks INT PATH '$.theoryMarks',
            TotalMarks INT PATH '$.totalMarks',
            PassingMarks INT PATH '$.passingMarks',
            IsAbsent TINYINT(1) PATH '$.isAbsent',
            Remarks VARCHAR(250) PATH '$.remarks'
        )
    ) jt;

    -- Update existing marks
    UPDATE `Marks` m
    INNER JOIN tmp_faculty_marks t ON t.StudentId = m.StudentId
    SET 
        m.InternalMarks = t.InternalMarks,
        m.PracticalMarks = t.PracticalMarks,
        m.TheoryMarks = t.TheoryMarks,
        m.TotalMarks = t.TotalMarks,
        m.PassingMarks = t.PassingMarks,
        m.IsAbsent = t.IsAbsent,
        m.Remarks = t.Remarks,
        m.FacultyId = COALESCE(p_FacultyId, m.FacultyId),
        m.Status = 0,
        m.UpdatedAt = UTC_TIMESTAMP()
    WHERE m.SubjectId = p_SubjectId
      AND m.SectionId = p_SectionId
      AND m.ExaminationId = p_ExaminationId
      AND m.IsActive = 1;

    -- Insert new marks for students who don't have a record yet
    INSERT INTO `Marks` (
        SubjectId, SectionId, ExaminationId, FacultyId, StudentId,
        InternalMarks, PracticalMarks, TheoryMarks, TotalMarks, PassingMarks,
        IsAbsent, Remarks, Status, IsActive, AcademicYearId, GroupId, BoardId, AcademicLevelId,
        CreatedAt, UpdatedAt
    )
    SELECT 
        p_SubjectId,
        p_SectionId,
        p_ExaminationId,
        p_FacultyId,
        t.StudentId,
        t.InternalMarks,
        t.PracticalMarks,
        t.TheoryMarks,
        t.TotalMarks,
        t.PassingMarks,
        t.IsAbsent,
        t.Remarks,
        0, -- DRAFT
        1,
        COALESCE(v_AcademicYearId, 1),
        COALESCE(v_GroupId, 1),
        COALESCE(v_BoardId, 1),
        COALESCE(v_AcademicLevelId, 1),
        UTC_TIMESTAMP(),
        UTC_TIMESTAMP()
    FROM tmp_faculty_marks t
    WHERE NOT EXISTS (
        SELECT 1 FROM `Marks` m2
        WHERE m2.SubjectId = p_SubjectId
          AND m2.SectionId = p_SectionId
          AND m2.ExaminationId = p_ExaminationId
          AND m2.StudentId = t.StudentId
          AND m2.IsActive = 1
    );

    DROP TEMPORARY TABLE IF EXISTS tmp_faculty_marks;
    SELECT 1 AS Success;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 7. sp_SubmitFacultyEvaluation
-- Transitions evaluation marks to SUBMITTED status (1)
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_SubmitFacultyEvaluation`;
DELIMITER //
CREATE PROCEDURE `sp_SubmitFacultyEvaluation`(
    IN p_SubjectId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_FacultyId INT
)
BEGIN
    UPDATE `Marks`
    SET Status = 1, -- SUBMITTED
        SubmittedAt = UTC_TIMESTAMP(),
        UpdatedAt = UTC_TIMESTAMP(),
        FacultyId = COALESCE(p_FacultyId, FacultyId)
    WHERE SubjectId = p_SubjectId
      AND SectionId = p_SectionId
      AND ExaminationId = p_ExaminationId
      AND IsActive = 1;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 8. sp_ResubmitFacultyEvaluation
-- Resubmits evaluation after corrections, increments ResubmissionCount, sets SUBMITTED
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ResubmitFacultyEvaluation`;
DELIMITER //
CREATE PROCEDURE `sp_ResubmitFacultyEvaluation`(
    IN p_SubjectId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_FacultyId INT,
    IN p_Remarks VARCHAR(500)
)
BEGIN
    UPDATE `Marks`
    SET Status = 1, -- SUBMITTED
        SubmittedAt = UTC_TIMESTAMP(),
        ResubmissionCount = ResubmissionCount + 1,
        Remarks = COALESCE(p_Remarks, Remarks),
        UpdatedAt = UTC_TIMESTAMP(),
        FacultyId = COALESCE(p_FacultyId, FacultyId)
    WHERE SubjectId = p_SubjectId
      AND SectionId = p_SectionId
      AND ExaminationId = p_ExaminationId
      AND IsActive = 1;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 9. sp_GetTimetables
-- Retrieves timetables matching filter criteria, fully joined with Staff, Sections, etc.
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTimetables`;
DELIMITER //
CREATE PROCEDURE `sp_GetTimetables`(
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_DayOfWeek INT,
    IN p_FacultyId INT,
    IN p_RoomId INT,
    IN p_IsPublished TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        t.`Id`,
        t.`Id` AS TimetableId,
        t.`CampusId`,
        c.`CampusName`,
        t.`BoardId`,
        b.`BoardName`,
        t.`AcademicLevelId`,
        al.`LevelName` AS AcademicLevelName,
        al.`LevelName`,
        t.`AcademicYearId`,
        ay.`AcademicYearName`,
        t.`GroupId`,
        g.`GroupName`,
        t.`ProgramId`,
        p.`ProgramName`,
        t.`SectionId`,
        s.`SectionName`,
        t.`DayOfWeek`,
        CASE t.`DayOfWeek`
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
            WHEN 7 THEN 'Sunday'
            ELSE ''
        END AS DayName,
        t.`PeriodId`,
        prd.`PeriodName`,
        COALESCE(prd.`DisplayOrder`, t.`PeriodId`) AS PeriodNumber,
        prd.`StartTime`,
        prd.`EndTime`,
        COALESCE(prd.`IsBreak`, 0) AS IsBreak,
        t.`SubjectId`,
        sub.`SubjectName`,
        sub.`SubjectCode`,
        COALESCE(t.`StaffId`, t.`FacultyId`, 0) AS StaffId,
        COALESCE(t.`StaffId`, t.`FacultyId`, 0) AS FacultyId,
        COALESCE(st.`EmployeeId`, '') AS StaffEmployeeId,
        COALESCE(st.`EmployeeId`, '') AS FacultyEmployeeId,
        TRIM(CONCAT(COALESCE(st.`FirstName`, ''), ' ', COALESCE(st.`LastName`, ''))) AS StaffName,
        TRIM(CONCAT(COALESCE(st.`FirstName`, ''), ' ', COALESCE(st.`LastName`, ''))) AS FacultyName,
        t.`RoomId`,
        COALESCE(rm.`RoomCode`, '') AS RoomCode,
        COALESCE(rm.`RoomName`, rm.`RoomNumber`, '') AS RoomName,
        t.`IsPublished`,
        COALESCE(t.`ApprovalStatus`, 0) AS ApprovalStatus,
        CASE COALESCE(t.`ApprovalStatus`, 0)
            WHEN 0 THEN 'Draft'
            WHEN 1 THEN 'Published'
            WHEN 2 THEN 'Archived'
            WHEN 3 THEN 'Approved'
            ELSE 'Draft'
        END AS ApprovalStatusName,
        t.`Remarks`,
        t.`CreatedAt`,
        t.`UpdatedAt`
    FROM `Timetables` t
    LEFT JOIN `Sections` s ON s.`SectionId` = t.`SectionId`
    LEFT JOIN `Campuses` c ON c.`CampusId` = t.`CampusId`
    LEFT JOIN `Boards` b ON b.`BoardId` = t.`BoardId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = t.`AcademicLevelId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = t.`AcademicYearId`
    LEFT JOIN `Groups` g ON g.`GroupId` = t.`GroupId`
    LEFT JOIN `Programs` p ON p.`ProgramId` = t.`ProgramId`
    LEFT JOIN `Periods` prd ON prd.`PeriodId` = t.`PeriodId`
    LEFT JOIN `Subjects` sub ON sub.`SubjectId` = t.`SubjectId`
    LEFT JOIN `Staff` st ON st.`Id` = COALESCE(t.`StaffId`, t.`FacultyId`)
    LEFT JOIN `Rooms` rm ON rm.`RoomId` = t.`RoomId`
    WHERE (p_BoardId IS NULL OR p_BoardId = 0 OR t.`BoardId` = p_BoardId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR t.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR t.`AcademicYearId` = p_AcademicYearId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR t.`GroupId` = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR t.`SectionId` = p_SectionId)
      AND (p_DayOfWeek IS NULL OR p_DayOfWeek = 0 OR t.`DayOfWeek` = p_DayOfWeek)
      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR COALESCE(t.`StaffId`, t.`FacultyId`) = p_FacultyId)
      AND (p_RoomId IS NULL OR p_RoomId = 0 OR t.`RoomId` = p_RoomId)
      AND (p_IsPublished IS NULL OR t.`IsPublished` = p_IsPublished)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR t.`CampusId` = p_CampusId)
    ORDER BY t.`DayOfWeek` ASC, t.`PeriodId` ASC;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- 10. sp_GetTimetableById
-- Retrieves single timetable slot by primary key
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTimetableById`;
DELIMITER //
CREATE PROCEDURE `sp_GetTimetableById`(
    IN p_Id INT
)
BEGIN
    SELECT 
        t.`Id`,
        t.`Id` AS TimetableId,
        t.`CampusId`,
        c.`CampusName`,
        t.`BoardId`,
        b.`BoardName`,
        t.`AcademicLevelId`,
        al.`LevelName` AS AcademicLevelName,
        al.`LevelName`,
        t.`AcademicYearId`,
        ay.`AcademicYearName`,
        t.`GroupId`,
        g.`GroupName`,
        t.`ProgramId`,
        p.`ProgramName`,
        t.`SectionId`,
        s.`SectionName`,
        t.`DayOfWeek`,
        CASE t.`DayOfWeek`
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
            WHEN 7 THEN 'Sunday'
            ELSE ''
        END AS DayName,
        t.`PeriodId`,
        prd.`PeriodName`,
        COALESCE(prd.`DisplayOrder`, t.`PeriodId`) AS PeriodNumber,
        prd.`StartTime`,
        prd.`EndTime`,
        COALESCE(prd.`IsBreak`, 0) AS IsBreak,
        t.`SubjectId`,
        sub.`SubjectName`,
        sub.`SubjectCode`,
        COALESCE(t.`StaffId`, t.`FacultyId`, 0) AS StaffId,
        COALESCE(t.`StaffId`, t.`FacultyId`, 0) AS FacultyId,
        COALESCE(st.`EmployeeId`, '') AS StaffEmployeeId,
        COALESCE(st.`EmployeeId`, '') AS FacultyEmployeeId,
        TRIM(CONCAT(COALESCE(st.`FirstName`, ''), ' ', COALESCE(st.`LastName`, ''))) AS StaffName,
        TRIM(CONCAT(COALESCE(st.`FirstName`, ''), ' ', COALESCE(st.`LastName`, ''))) AS FacultyName,
        t.`RoomId`,
        COALESCE(rm.`RoomCode`, '') AS RoomCode,
        COALESCE(rm.`RoomName`, rm.`RoomNumber`, '') AS RoomName,
        t.`IsPublished`,
        COALESCE(t.`ApprovalStatus`, 0) AS ApprovalStatus,
        CASE COALESCE(t.`ApprovalStatus`, 0)
            WHEN 0 THEN 'Draft'
            WHEN 1 THEN 'Published'
            WHEN 2 THEN 'Archived'
            WHEN 3 THEN 'Approved'
            ELSE 'Draft'
        END AS ApprovalStatusName,
        t.`Remarks`,
        t.`CreatedAt`,
        t.`UpdatedAt`
    FROM `Timetables` t
    LEFT JOIN `Sections` s ON s.`SectionId` = t.`SectionId`
    LEFT JOIN `Campuses` c ON c.`CampusId` = t.`CampusId`
    LEFT JOIN `Boards` b ON b.`BoardId` = t.`BoardId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = t.`AcademicLevelId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = t.`AcademicYearId`
    LEFT JOIN `Groups` g ON g.`GroupId` = t.`GroupId`
    LEFT JOIN `Programs` p ON p.`ProgramId` = t.`ProgramId`
    LEFT JOIN `Periods` prd ON prd.`PeriodId` = t.`PeriodId`
    LEFT JOIN `Subjects` sub ON sub.`SubjectId` = t.`SubjectId`
    LEFT JOIN `Staff` st ON st.`Id` = COALESCE(t.`StaffId`, t.`FacultyId`)
    LEFT JOIN `Rooms` rm ON rm.`RoomId` = t.`RoomId`
    WHERE t.`Id` = p_Id
    LIMIT 1;
END //
DELIMITER ;
