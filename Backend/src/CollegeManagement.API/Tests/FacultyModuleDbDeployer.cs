using System;
using System.IO;
using System.Threading.Tasks;
using MySqlConnector;
using Dapper;

namespace CollegeManagement.API.Tests
{
    public static class FacultyModuleDbDeployer
    {
        public static async Task<bool> DeployProceduresAsync(string connectionString)
        {
            Console.WriteLine("[FacultyModuleDbDeployer] Connecting to MySQL...");
            using var connection = new MySqlConnection(connectionString);
            await connection.OpenAsync();

            Console.WriteLine("[FacultyModuleDbDeployer] Connected successfully.");

            // 1. sp_GetStaffSettings
            string spGetStaffSettings = @"
DROP PROCEDURE IF EXISTS `sp_GetStaffSettings`;
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
END;";

            // 2. sp_UpdateStaffProfileSettings
            string spUpdateStaffProfile = @"
DROP PROCEDURE IF EXISTS `sp_UpdateStaffProfileSettings`;
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
    UPDATE Staff
    SET FirstName = TRIM(p_FirstName),
        LastName = TRIM(p_LastName),
        Mobile = TRIM(p_Mobile),
        Email = TRIM(p_Email),
        CurrentAddress = TRIM(p_Address),
        AlternateMobile = TRIM(p_EmergencyContact),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_StaffId;

    UPDATE Users
    SET FullName = TRIM(CONCAT(p_FirstName, ' ', p_LastName)),
        PhoneNumber = TRIM(p_Mobile),
        Email = TRIM(p_Email),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StaffId = p_StaffId;

    SELECT ROW_COUNT() AS AffectedRows;
END;";

            // 3. sp_UpdateStaffPreferences
            string spUpdateStaffPreferences = @"
DROP PROCEDURE IF EXISTS `sp_UpdateStaffPreferences`;
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
END;";

            // 4. sp_GetFacultyEvaluations
            string spGetFacultyEvaluations = @"
DROP PROCEDURE IF EXISTS `sp_GetFacultyEvaluations`;
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
END;";

            // 5. sp_GetFacultyEvaluationStudents
            string spGetFacultyEvaluationStudents = @"
DROP PROCEDURE IF EXISTS `sp_GetFacultyEvaluationStudents`;
CREATE PROCEDURE `sp_GetFacultyEvaluationStudents`(
    IN p_SubjectId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_CampusId INT
)
BEGIN
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
END;";

            // 6. sp_SaveFacultyDraftMarks
            string spSaveFacultyDraftMarks = @"
DROP PROCEDURE IF EXISTS `sp_SaveFacultyDraftMarks`;
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
        0,
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
END;";

            // 7. sp_SubmitFacultyEvaluation
            string spSubmitFacultyEvaluation = @"
DROP PROCEDURE IF EXISTS `sp_SubmitFacultyEvaluation`;
CREATE PROCEDURE `sp_SubmitFacultyEvaluation`(
    IN p_SubjectId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_FacultyId INT
)
BEGIN
    UPDATE `Marks`
    SET Status = 1,
        SubmittedAt = UTC_TIMESTAMP(),
        UpdatedAt = UTC_TIMESTAMP(),
        FacultyId = COALESCE(p_FacultyId, FacultyId)
    WHERE SubjectId = p_SubjectId
      AND SectionId = p_SectionId
      AND ExaminationId = p_ExaminationId
      AND IsActive = 1;

    SELECT ROW_COUNT() AS AffectedRows;
END;";

            // 8. sp_ResubmitFacultyEvaluation
            string spResubmitFacultyEvaluation = @"
DROP PROCEDURE IF EXISTS `sp_ResubmitFacultyEvaluation`;
CREATE PROCEDURE `sp_ResubmitFacultyEvaluation`(
    IN p_SubjectId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_FacultyId INT,
    IN p_Remarks VARCHAR(500)
)
BEGIN
    UPDATE `Marks`
    SET Status = 1,
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
END;";

            // 9. sp_GetExaminationSubjectIds
            string spGetExaminationSubjectIds = @"
DROP PROCEDURE IF EXISTS `sp_GetExaminationSubjectIds`;
CREATE PROCEDURE `sp_GetExaminationSubjectIds`(
    IN p_ExamId INT
)
BEGIN
    SELECT SubjectId 
    FROM ExaminationSubjects 
    WHERE ExamId = p_ExamId;
END;";

            // 10. sp_GetTimetables
            string spGetTimetables = @"
DROP PROCEDURE IF EXISTS `sp_GetTimetables`;
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
END;";

            // 11. sp_GetTimetableById
            string spGetTimetableById = @"
DROP PROCEDURE IF EXISTS `sp_GetTimetableById`;
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
END;";

            // 12. sp_CreateTimetable
            string spCreateTimetable = @"
DROP PROCEDURE IF EXISTS `sp_CreateTimetable`;
CREATE PROCEDURE `sp_CreateTimetable`(
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_DayOfWeek INT,
    IN p_PeriodId INT,
    IN p_SubjectId INT,
    IN p_StaffId INT,
    IN p_RoomId INT,
    IN p_CampusId INT,
    IN p_IsPublished TINYINT(1),
    IN p_ApprovalStatus INT,
    IN p_Remarks VARCHAR(500)
)
BEGIN
    INSERT INTO `Timetables` (
        `BoardId`, `AcademicLevelId`, `AcademicYearId`, `GroupId`, `ProgramId`,
        `SectionId`, `DayOfWeek`, `PeriodId`, `SubjectId`, `StaffId`, `FacultyId`,
        `RoomId`, `CampusId`, `IsPublished`, `ApprovalStatus`, `Remarks`, `CreatedAt`
    )
    VALUES (
        p_BoardId, p_AcademicLevelId, p_AcademicYearId, p_GroupId, p_ProgramId,
        p_SectionId, p_DayOfWeek, p_PeriodId, p_SubjectId, p_StaffId, p_StaffId,
        p_RoomId, p_CampusId, IFNULL(p_IsPublished, 0), IFNULL(p_ApprovalStatus, 0), p_Remarks, UTC_TIMESTAMP()
    );
    SELECT LAST_INSERT_ID();
END;";

            // 13. sp_UpdateTimetable
            string spUpdateTimetable = @"
DROP PROCEDURE IF EXISTS `sp_UpdateTimetable`;
CREATE PROCEDURE `sp_UpdateTimetable`(
    IN p_Id INT,
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_DayOfWeek INT,
    IN p_PeriodId INT,
    IN p_SubjectId INT,
    IN p_StaffId INT,
    IN p_RoomId INT,
    IN p_CampusId INT,
    IN p_IsPublished TINYINT(1),
    IN p_ApprovalStatus INT,
    IN p_Remarks VARCHAR(500)
)
BEGIN
    UPDATE `Timetables`
    SET `BoardId` = p_BoardId,
        `AcademicLevelId` = p_AcademicLevelId,
        `AcademicYearId` = p_AcademicYearId,
        `GroupId` = p_GroupId,
        `ProgramId` = p_ProgramId,
        `SectionId` = p_SectionId,
        `DayOfWeek` = p_DayOfWeek,
        `PeriodId` = p_PeriodId,
        `SubjectId` = p_SubjectId,
        `StaffId` = p_StaffId,
        `FacultyId` = p_StaffId,
        `RoomId` = p_RoomId,
        `CampusId` = p_CampusId,
        `IsPublished` = p_IsPublished,
        `ApprovalStatus` = IFNULL(p_ApprovalStatus, `ApprovalStatus`),
        `Remarks` = p_Remarks,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id;
END;";

            // 14. sp_CheckSlotConflict
            string spCheckSlotConflict = @"
DROP PROCEDURE IF EXISTS `sp_CheckSlotConflict`;
CREATE PROCEDURE `sp_CheckSlotConflict`(
    IN p_AcademicYearId INT,
    IN p_SectionId INT,
    IN p_StaffId INT,
    IN p_RoomId INT,
    IN p_DayOfWeek INT,
    IN p_PeriodId INT,
    IN p_ExcludeId INT
)
BEGIN
    SELECT 
        CASE 
            WHEN `SectionId` = p_SectionId THEN 'SECTION'
            WHEN (`StaffId` = p_StaffId OR `FacultyId` = p_StaffId) THEN 'STAFF'
            WHEN (`RoomId` > 0 AND `RoomId` = p_RoomId) THEN 'ROOM'
        END AS ConflictType
    FROM `Timetables`
    WHERE `AcademicYearId` = p_AcademicYearId 
      AND `DayOfWeek` = p_DayOfWeek 
      AND `PeriodId` = p_PeriodId 
      AND (p_ExcludeId IS NULL OR p_ExcludeId = 0 OR `Id` != p_ExcludeId)
      AND (`SectionId` = p_SectionId OR `StaffId` = p_StaffId OR `FacultyId` = p_StaffId OR (p_RoomId > 0 AND `RoomId` = p_RoomId))
    LIMIT 1;
END;";

            // 15. sp_DeleteTimetable
            string spDeleteTimetable = @"
DROP PROCEDURE IF EXISTS `sp_DeleteTimetable`;
CREATE PROCEDURE `sp_DeleteTimetable`(IN p_Id INT)
BEGIN
    DELETE FROM `Timetables` WHERE `Id` = p_Id;
END;";

            // 16. sp_PublishTimetableSlot
            string spPublishTimetableSlot = @"
DROP PROCEDURE IF EXISTS `sp_PublishTimetableSlot`;
CREATE PROCEDURE `sp_PublishTimetableSlot`(
    IN p_Id INT,
    IN p_IsPublished TINYINT(1)
)
BEGIN
    UPDATE `Timetables`
    SET `IsPublished` = p_IsPublished,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id;
END;";

            // 17. sp_PublishSectionTimetable
            string spPublishSectionTimetable = @"
DROP PROCEDURE IF EXISTS `sp_PublishSectionTimetable`;
CREATE PROCEDURE `sp_PublishSectionTimetable`(
    IN p_SectionId INT,
    IN p_AcademicYearId INT,
    IN p_IsPublished TINYINT(1)
)
BEGIN
    UPDATE `Timetables`
    SET `IsPublished` = p_IsPublished,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `SectionId` = p_SectionId
      AND `AcademicYearId` = p_AcademicYearId;
END;";

            // 18. sp_CheckSectionSlotConflict
            string spCheckSectionSlotConflict = @"
DROP PROCEDURE IF EXISTS `sp_CheckSectionSlotConflict`;
CREATE PROCEDURE `sp_CheckSectionSlotConflict`(
    IN p_AcademicYearId INT,
    IN p_SectionId INT,
    IN p_DayOfWeek INT,
    IN p_PeriodId INT,
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(1)
    FROM `Timetables`
    WHERE `AcademicYearId` = p_AcademicYearId
      AND `SectionId` = p_SectionId
      AND `DayOfWeek` = p_DayOfWeek
      AND `PeriodId` = p_PeriodId
      AND (p_ExcludeId IS NULL OR p_ExcludeId = 0 OR `Id` <> p_ExcludeId);
END;";

            // 19. sp_CheckFacultySlotConflict
            string spCheckFacultySlotConflict = @"
DROP PROCEDURE IF EXISTS `sp_CheckFacultySlotConflict`;
CREATE PROCEDURE `sp_CheckFacultySlotConflict`(
    IN p_AcademicYearId INT,
    IN p_FacultyId INT,
    IN p_DayOfWeek INT,
    IN p_PeriodId INT,
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(1)
    FROM `Timetables`
    WHERE `AcademicYearId` = p_AcademicYearId
      AND (`FacultyId` = p_FacultyId OR `StaffId` = p_FacultyId)
      AND `DayOfWeek` = p_DayOfWeek
      AND `PeriodId` = p_PeriodId
      AND (p_ExcludeId IS NULL OR p_ExcludeId = 0 OR `Id` <> p_ExcludeId);
END;";

            // 20. sp_CheckRoomSlotConflict
            string spCheckRoomSlotConflict = @"
DROP PROCEDURE IF EXISTS `sp_CheckRoomSlotConflict`;
CREATE PROCEDURE `sp_CheckRoomSlotConflict`(
    IN p_AcademicYearId INT,
    IN p_RoomId INT,
    IN p_DayOfWeek INT,
    IN p_PeriodId INT,
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(1)
    FROM `Timetables`
    WHERE `AcademicYearId` = p_AcademicYearId
      AND `RoomId` = p_RoomId
      AND `DayOfWeek` = p_DayOfWeek
      AND `PeriodId` = p_PeriodId
      AND (p_ExcludeId IS NULL OR p_ExcludeId = 0 OR `Id` <> p_ExcludeId);
END;";

            // 21. sp_GetAllocatedFacultiesForSlot
            string spGetAllocatedFacultiesForSlot = @"
DROP PROCEDURE IF EXISTS `sp_GetAllocatedFacultiesForSlot`;
CREATE PROCEDURE `sp_GetAllocatedFacultiesForSlot`(
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_SubjectId INT
)
BEGIN
    SELECT 
        s.Id AS StaffId,
        s.Id AS FacultyId,
        COALESCE(s.EmployeeId, '') AS StaffEmployeeId,
        COALESCE(s.EmployeeId, '') AS FacultyEmployeeId,
        TRIM(CONCAT(COALESCE(s.FirstName, ''), ' ', COALESCE(s.LastName, ''))) AS StaffName,
        TRIM(CONCAT(COALESCE(s.FirstName, ''), ' ', COALESCE(s.LastName, ''))) AS FacultyName,
        COALESCE(s.Email, '') AS Email,
        COALESCE(s.Mobile, '') AS Mobile,
        COALESCE(s.Designation, 'Faculty') AS Designation
    FROM `Staff` s
    WHERE s.IsActive = 1;
END;";

            // 22. sp_CopyTimetable
            string spCopyTimetable = @"
DROP PROCEDURE IF EXISTS `sp_CopyTimetable`;
CREATE PROCEDURE `sp_CopyTimetable`(
    IN p_SourceAcademicYearId INT,
    IN p_SourceSectionId INT,
    IN p_TargetAcademicYearId INT,
    IN p_TargetSectionId INT
)
BEGIN
    INSERT INTO `Timetables` (
        `CampusId`, `BoardId`, `AcademicLevelId`, `AcademicYearId`, `GroupId`, `ProgramId`,
        `SectionId`, `DayOfWeek`, `PeriodId`, `SubjectId`, `StaffId`, `FacultyId`, `RoomId`,
        `IsPublished`, `ApprovalStatus`, `Remarks`, `CreatedAt`
    )
    SELECT 
        `CampusId`, `BoardId`, `AcademicLevelId`, p_TargetAcademicYearId, `GroupId`, `ProgramId`,
        p_TargetSectionId, `DayOfWeek`, `PeriodId`, `SubjectId`, `StaffId`, `FacultyId`, `RoomId`,
        0, 0, CONCAT('Copied from Section ', p_SourceSectionId), UTC_TIMESTAMP()
    FROM `Timetables`
    WHERE `AcademicYearId` = p_SourceAcademicYearId
      AND `SectionId` = p_SourceSectionId;
END;";

            var procedures = new (string sql, string name)[]
            {
                (spGetStaffSettings, "sp_GetStaffSettings"),
                (spUpdateStaffProfile, "sp_UpdateStaffProfileSettings"),
                (spUpdateStaffPreferences, "sp_UpdateStaffPreferences"),
                (spGetFacultyEvaluations, "sp_GetFacultyEvaluations"),
                (spGetFacultyEvaluationStudents, "sp_GetFacultyEvaluationStudents"),
                (spSaveFacultyDraftMarks, "sp_SaveFacultyDraftMarks"),
                (spSubmitFacultyEvaluation, "sp_SubmitFacultyEvaluation"),
                (spResubmitFacultyEvaluation, "sp_ResubmitFacultyEvaluation"),
                (spGetExaminationSubjectIds, "sp_GetExaminationSubjectIds"),
                (spGetTimetables, "sp_GetTimetables"),
                (spGetTimetableById, "sp_GetTimetableById"),
                (spCreateTimetable, "sp_CreateTimetable"),
                (spUpdateTimetable, "sp_UpdateTimetable"),
                (spCheckSlotConflict, "sp_CheckSlotConflict"),
                (spDeleteTimetable, "sp_DeleteTimetable"),
                (spPublishTimetableSlot, "sp_PublishTimetableSlot"),
                (spPublishSectionTimetable, "sp_PublishSectionTimetable"),
                (spCheckSectionSlotConflict, "sp_CheckSectionSlotConflict"),
                (spCheckFacultySlotConflict, "sp_CheckFacultySlotConflict"),
                (spCheckRoomSlotConflict, "sp_CheckRoomSlotConflict"),
                (spGetAllocatedFacultiesForSlot, "sp_GetAllocatedFacultiesForSlot"),
                (spCopyTimetable, "sp_CopyTimetable")
            };

            foreach (var (sql, name) in procedures)
            {
                try
                {
                    await connection.ExecuteAsync(sql);
                    Console.WriteLine($"  [DEPLOYED] {name}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  [FAILED] {name}: {ex.Message}");
                    return false;
                }
            }

            return true;
        }
    }
}
