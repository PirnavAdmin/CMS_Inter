using System;
using System.Threading.Tasks;
using MySqlConnector;
using Dapper;

namespace CollegeManagement.API.Tests
{
    public static class ExamCellModuleDbDeployer
    {
        public static async Task<bool> DeployProceduresAsync(string connectionString)
        {
            Console.WriteLine("[ExamCellModuleDbDeployer] Connecting to MySQL...");
            using var connection = new MySqlConnection(connectionString);
            await connection.OpenAsync();

            Console.WriteLine("[ExamCellModuleDbDeployer] Connected successfully.");

            // 0. ExaminationSettings Table
            string createSettingsTable = @"
CREATE TABLE IF NOT EXISTS `ExaminationSettings` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `CampusId` INT NOT NULL DEFAULT 1,
    `MinimumPassingPercentage` DECIMAL(5,2) NOT NULL DEFAULT 35.00,
    `MaximumGraceMarksLimit` INT NOT NULL DEFAULT 5,
    `GradeScaleStandard` VARCHAR(150) NOT NULL DEFAULT '10-Point CGPA (UGC / AICTE Standard)',
    `ReEvaluationWindowDays` INT NOT NULL DEFAULT 15,
    `EnableDoubleEvaluation` TINYINT(1) NOT NULL DEFAULT 0,
    `AllowNegativeMarking` TINYINT(1) NOT NULL DEFAULT 0,
    `MinAttendancePercent` DECIMAL(5,2) NOT NULL DEFAULT 75.00,
    `CondonationThreshold` DECIMAL(5,2) NOT NULL DEFAULT 65.00,
    `IncludePrincipalSign` TINYINT(1) NOT NULL DEFAULT 1,
    `AutoLockSeatingHours` INT NOT NULL DEFAULT 24,
    `AllowManualHallTicketRelease` TINYINT(1) NOT NULL DEFAULT 1,
    `SmsAlertsOnPublish` TINYINT(1) NOT NULL DEFAULT 1,
    `EmailMarksheetCopy` TINYINT(1) NOT NULL DEFAULT 1,
    `RestrictResultsForFeeDue` TINYINT(1) NOT NULL DEFAULT 0,
    `AutoArchivePastExams` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `UQ_ExaminationSettings_Campus` (`CampusId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add any missing columns dynamically if the table was created previously with fewer columns
DROP PROCEDURE IF EXISTS `tmp_upgrade_exam_settings`;
CREATE PROCEDURE `tmp_upgrade_exam_settings`()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ExaminationSettings' AND COLUMN_NAME = 'MinAttendancePercent') THEN
        ALTER TABLE `ExaminationSettings` ADD COLUMN `MinAttendancePercent` DECIMAL(5,2) NOT NULL DEFAULT 75.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ExaminationSettings' AND COLUMN_NAME = 'CondonationThreshold') THEN
        ALTER TABLE `ExaminationSettings` ADD COLUMN `CondonationThreshold` DECIMAL(5,2) NOT NULL DEFAULT 65.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ExaminationSettings' AND COLUMN_NAME = 'IncludePrincipalSign') THEN
        ALTER TABLE `ExaminationSettings` ADD COLUMN `IncludePrincipalSign` TINYINT(1) NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ExaminationSettings' AND COLUMN_NAME = 'AutoLockSeatingHours') THEN
        ALTER TABLE `ExaminationSettings` ADD COLUMN `AutoLockSeatingHours` INT NOT NULL DEFAULT 24;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ExaminationSettings' AND COLUMN_NAME = 'AllowManualHallTicketRelease') THEN
        ALTER TABLE `ExaminationSettings` ADD COLUMN `AllowManualHallTicketRelease` TINYINT(1) NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ExaminationSettings' AND COLUMN_NAME = 'SmsAlertsOnPublish') THEN
        ALTER TABLE `ExaminationSettings` ADD COLUMN `SmsAlertsOnPublish` TINYINT(1) NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ExaminationSettings' AND COLUMN_NAME = 'EmailMarksheetCopy') THEN
        ALTER TABLE `ExaminationSettings` ADD COLUMN `EmailMarksheetCopy` TINYINT(1) NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ExaminationSettings' AND COLUMN_NAME = 'RestrictResultsForFeeDue') THEN
        ALTER TABLE `ExaminationSettings` ADD COLUMN `RestrictResultsForFeeDue` TINYINT(1) NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ExaminationSettings' AND COLUMN_NAME = 'AutoArchivePastExams') THEN
        ALTER TABLE `ExaminationSettings` ADD COLUMN `AutoArchivePastExams` TINYINT(1) NOT NULL DEFAULT 1;
    END IF;
END;
CALL `tmp_upgrade_exam_settings`();
DROP PROCEDURE IF EXISTS `tmp_upgrade_exam_settings`;";

            // 1. sp_GetExaminationSettings
            string spGetExaminationSettings = @"
DROP PROCEDURE IF EXISTS `sp_GetExaminationSettings`;
CREATE PROCEDURE `sp_GetExaminationSettings`(
    IN p_CampusId INT
)
BEGIN
    DECLARE v_CampusId INT;
    SET v_CampusId = COALESCE(NULLIF(p_CampusId, 0), 1);

    INSERT INTO `ExaminationSettings` (`CampusId`)
    VALUES (v_CampusId)
    ON DUPLICATE KEY UPDATE `CampusId` = v_CampusId;

    SELECT 
        `Id`,
        `CampusId`,
        `MinimumPassingPercentage`,
        `MaximumGraceMarksLimit`,
        `GradeScaleStandard`,
        `ReEvaluationWindowDays`,
        `EnableDoubleEvaluation`,
        `AllowNegativeMarking`,
        `MinAttendancePercent`,
        `CondonationThreshold`,
        `IncludePrincipalSign`,
        `AutoLockSeatingHours`,
        `AllowManualHallTicketRelease`,
        `SmsAlertsOnPublish`,
        `EmailMarksheetCopy`,
        `RestrictResultsForFeeDue`,
        `AutoArchivePastExams`,
        `UpdatedAt`
    FROM `ExaminationSettings`
    WHERE `CampusId` = v_CampusId
    LIMIT 1;
END;";

            // 2. sp_SaveExaminationSettings
            string spSaveExaminationSettings = @"
DROP PROCEDURE IF EXISTS `sp_SaveExaminationSettings`;
CREATE PROCEDURE `sp_SaveExaminationSettings`(
    IN p_CampusId INT,
    IN p_MinimumPassingPercentage DECIMAL(5,2),
    IN p_MaximumGraceMarksLimit INT,
    IN p_GradeScaleStandard VARCHAR(150),
    IN p_ReEvaluationWindowDays INT,
    IN p_EnableDoubleEvaluation TINYINT(1),
    IN p_AllowNegativeMarking TINYINT(1),
    IN p_MinAttendancePercent DECIMAL(5,2),
    IN p_CondonationThreshold DECIMAL(5,2),
    IN p_IncludePrincipalSign TINYINT(1),
    IN p_AutoLockSeatingHours INT,
    IN p_AllowManualHallTicketRelease TINYINT(1),
    IN p_SmsAlertsOnPublish TINYINT(1),
    IN p_EmailMarksheetCopy TINYINT(1),
    IN p_RestrictResultsForFeeDue TINYINT(1),
    IN p_AutoArchivePastExams TINYINT(1)
)
BEGIN
    DECLARE v_CampusId INT;
    SET v_CampusId = COALESCE(NULLIF(p_CampusId, 0), 1);

    INSERT INTO `ExaminationSettings` (
        `CampusId`,
        `MinimumPassingPercentage`,
        `MaximumGraceMarksLimit`,
        `GradeScaleStandard`,
        `ReEvaluationWindowDays`,
        `EnableDoubleEvaluation`,
        `AllowNegativeMarking`,
        `MinAttendancePercent`,
        `CondonationThreshold`,
        `IncludePrincipalSign`,
        `AutoLockSeatingHours`,
        `AllowManualHallTicketRelease`,
        `SmsAlertsOnPublish`,
        `EmailMarksheetCopy`,
        `RestrictResultsForFeeDue`,
        `AutoArchivePastExams`,
        `UpdatedAt`
    ) VALUES (
        v_CampusId,
        COALESCE(p_MinimumPassingPercentage, 35.00),
        COALESCE(p_MaximumGraceMarksLimit, 5),
        COALESCE(p_GradeScaleStandard, '10-Point CGPA (UGC / AICTE Standard)'),
        COALESCE(p_ReEvaluationWindowDays, 15),
        COALESCE(p_EnableDoubleEvaluation, 0),
        COALESCE(p_AllowNegativeMarking, 0),
        COALESCE(p_MinAttendancePercent, 75.00),
        COALESCE(p_CondonationThreshold, 65.00),
        COALESCE(p_IncludePrincipalSign, 1),
        COALESCE(p_AutoLockSeatingHours, 24),
        COALESCE(p_AllowManualHallTicketRelease, 1),
        COALESCE(p_SmsAlertsOnPublish, 1),
        COALESCE(p_EmailMarksheetCopy, 1),
        COALESCE(p_RestrictResultsForFeeDue, 0),
        COALESCE(p_AutoArchivePastExams, 1),
        UTC_TIMESTAMP()
    )
    ON DUPLICATE KEY UPDATE
        `MinimumPassingPercentage` = COALESCE(p_MinimumPassingPercentage, `MinimumPassingPercentage`),
        `MaximumGraceMarksLimit` = COALESCE(p_MaximumGraceMarksLimit, `MaximumGraceMarksLimit`),
        `GradeScaleStandard` = COALESCE(p_GradeScaleStandard, `GradeScaleStandard`),
        `ReEvaluationWindowDays` = COALESCE(p_ReEvaluationWindowDays, `ReEvaluationWindowDays`),
        `EnableDoubleEvaluation` = COALESCE(p_EnableDoubleEvaluation, `EnableDoubleEvaluation`),
        `AllowNegativeMarking` = COALESCE(p_AllowNegativeMarking, `AllowNegativeMarking`),
        `MinAttendancePercent` = COALESCE(p_MinAttendancePercent, `MinAttendancePercent`),
        `CondonationThreshold` = COALESCE(p_CondonationThreshold, `CondonationThreshold`),
        `IncludePrincipalSign` = COALESCE(p_IncludePrincipalSign, `IncludePrincipalSign`),
        `AutoLockSeatingHours` = COALESCE(p_AutoLockSeatingHours, `AutoLockSeatingHours`),
        `AllowManualHallTicketRelease` = COALESCE(p_AllowManualHallTicketRelease, `AllowManualHallTicketRelease`),
        `SmsAlertsOnPublish` = COALESCE(p_SmsAlertsOnPublish, `SmsAlertsOnPublish`),
        `EmailMarksheetCopy` = COALESCE(p_EmailMarksheetCopy, `EmailMarksheetCopy`),
        `RestrictResultsForFeeDue` = COALESCE(p_RestrictResultsForFeeDue, `RestrictResultsForFeeDue`),
        `AutoArchivePastExams` = COALESCE(p_AutoArchivePastExams, `AutoArchivePastExams`),
        `UpdatedAt` = UTC_TIMESTAMP();

    SELECT 
        `Id`,
        `CampusId`,
        `MinimumPassingPercentage`,
        `MaximumGraceMarksLimit`,
        `GradeScaleStandard`,
        `ReEvaluationWindowDays`,
        `EnableDoubleEvaluation`,
        `AllowNegativeMarking`,
        `MinAttendancePercent`,
        `CondonationThreshold`,
        `IncludePrincipalSign`,
        `AutoLockSeatingHours`,
        `AllowManualHallTicketRelease`,
        `SmsAlertsOnPublish`,
        `EmailMarksheetCopy`,
        `RestrictResultsForFeeDue`,
        `AutoArchivePastExams`,
        `UpdatedAt`
    FROM `ExaminationSettings`
    WHERE `CampusId` = v_CampusId
    LIMIT 1;
END;";

            // 3. sp_GetExaminationSubjects
            string spGetExaminationSubjects = @"
DROP PROCEDURE IF EXISTS `sp_GetExaminationSubjects`;
CREATE PROCEDURE `sp_GetExaminationSubjects`(
    IN p_ExamId INT
)
BEGIN
    SELECT `SubjectId` 
    FROM `ExaminationSubjects` 
    WHERE `ExamId` = p_ExamId;
END;";

            // 4. sp_SaveExaminationSubjects
            string spSaveExaminationSubjects = @"
DROP PROCEDURE IF EXISTS `sp_SaveExaminationSubjects`;
CREATE PROCEDURE `sp_SaveExaminationSubjects`(
    IN p_ExamId INT,
    IN p_SubjectIdsJson LONGTEXT
)
BEGIN
    DELETE FROM `ExaminationSubjects` WHERE `ExamId` = p_ExamId;

    IF p_SubjectIdsJson IS NOT NULL AND p_SubjectIdsJson != '' AND p_SubjectIdsJson != '[]' THEN
        INSERT INTO `ExaminationSubjects` (`ExamId`, `SubjectId`, `CreatedAt`)
        SELECT 
            p_ExamId,
            jt.SubjectId,
            UTC_TIMESTAMP()
        FROM JSON_TABLE(
            p_SubjectIdsJson,
            '$[*]' COLUMNS (
                SubjectId INT PATH '$'
            )
        ) jt
        WHERE jt.SubjectId IS NOT NULL AND jt.SubjectId > 0;
    END IF;

    SELECT ROW_COUNT() AS AffectedRows;
END;";

            // 5. sp_AssignInvigilatorsBatch
            string spAssignInvigilatorsBatch = @"
DROP PROCEDURE IF EXISTS `sp_AssignInvigilatorsBatch`;
CREATE PROCEDURE `sp_AssignInvigilatorsBatch`(
    IN p_ExamScheduleId INT,
    IN p_AssignmentsJson LONGTEXT
)
BEGIN
    DELETE FROM `InvigilatorAssignments` WHERE `ExamScheduleId` = p_ExamScheduleId;

    IF p_AssignmentsJson IS NOT NULL AND p_AssignmentsJson != '' AND p_AssignmentsJson != '[]' THEN
        INSERT INTO `InvigilatorAssignments` (`ExamScheduleId`, `InvigilatorId`, `HallNumber`, `AssignedAt`)
        SELECT 
            p_ExamScheduleId,
            jt.InvigilatorId,
            COALESCE(jt.HallNumber, ''),
            UTC_TIMESTAMP()
        FROM JSON_TABLE(
            p_AssignmentsJson,
            '$[*]' COLUMNS (
                InvigilatorId INT PATH '$.invigilatorId',
                HallNumber VARCHAR(100) PATH '$.hallNumber'
            )
        ) jt
        WHERE jt.InvigilatorId IS NOT NULL AND jt.InvigilatorId > 0;
    END IF;

    SELECT ROW_COUNT() AS AffectedRows;
END;";

            // 6. sp_GetNextExamCodeSequence
            string spGetNextExamCodeSequence = @"
DROP PROCEDURE IF EXISTS `sp_GetNextExamCodeSequence`;
CREATE PROCEDURE `sp_GetNextExamCodeSequence`(
    IN p_AcademicYear VARCHAR(50)
)
BEGIN
    DECLARE v_Seq INT DEFAULT 1;

    INSERT INTO `ExamCodeSequences` (`AcademicYear`, `LastSequence`, `UpdatedAt`)
    VALUES (p_AcademicYear, 1, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE 
        `LastSequence` = `LastSequence` + 1,
        `UpdatedAt` = UTC_TIMESTAMP();

    SELECT `LastSequence` AS NextSequence
    FROM `ExamCodeSequences`
    WHERE `AcademicYear` = p_AcademicYear
    LIMIT 1;
END;";

            // 7. sp_GetFacultyExamDuties
            string spGetFacultyExamDuties = @"
DROP PROCEDURE IF EXISTS `sp_GetFacultyExamDuties`;
CREATE PROCEDURE `sp_GetFacultyExamDuties`(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50),
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_BoardId INT
)
BEGIN
    SELECT 
        q.DutyId,
        q.ExamScheduleId,
        q.StaffId,
        q.FacultyName,
        q.EmployeeCode,
        q.Designation,
        q.ExamId,
        q.ExaminationId,
        q.ExamName,
        q.ExamCode,
        q.ExamCategory,
        q.ExamPattern,
        q.SubjectId,
        q.SubjectName,
        q.SubjectCode,
        q.ExamDate,
        q.StartTime,
        q.EndTime,
        q.SessionId,
        q.Hall,
        q.RoomName,
        q.Status
    FROM (
        SELECT 
            ia.InvigilatorAssignmentId AS DutyId,
            es.ScheduleId AS ExamScheduleId,
            ia.InvigilatorId AS StaffId,
            TRIM(CONCAT(COALESCE(s.FirstName, ''), ' ', COALESCE(s.LastName, ''))) AS FacultyName,
            COALESCE(s.EmployeeId, '') AS EmployeeCode,
            COALESCE(des.Name, s.Designation, 'Invigilator') AS Designation,
            e.ExamId,
            e.ExamId AS ExaminationId,
            COALESCE(e.ExamName, '') AS ExamName,
            COALESCE(e.ExamCode, '') AS ExamCode,
            CASE WHEN e.ExamPattern LIKE '%OBJECTIVE%' OR e.ExamPattern LIKE '%JEE%' OR e.ExamPattern LIKE '%NEET%' THEN 'Objective' ELSE 'Regular' END AS ExamCategory,
            COALESCE(e.ExamPattern, '') AS ExamPattern,
            es.SubjectId,
            COALESCE(sub.SubjectName, es.PatternName, 'Examination') AS SubjectName,
            COALESCE(sub.SubjectCode, '') AS SubjectCode,
            DATE(es.ExamDate) AS ExamDate,
            es.StartTime,
            es.EndTime,
            COALESCE(es.SessionId, '') AS SessionId,
            COALESCE(NULLIF(ia.HallNumber, ''), es.Hall, '') AS Hall,
            COALESCE(rm.RoomName, es.Hall, '') AS RoomName,
            CASE 
                WHEN LOWER(COALESCE(e.Status, '')) = 'cancelled' THEN 'Cancelled'
                WHEN es.ExamDate < CURDATE() THEN 'Completed'
                WHEN es.ExamDate = CURDATE() AND es.EndTime <= CURTIME() THEN 'Completed'
                ELSE 'Upcoming'
            END AS Status
        FROM `InvigilatorAssignments` ia
        INNER JOIN `ExamSchedules` es ON es.ScheduleId = ia.ExamScheduleId AND es.IsActive = 1
        INNER JOIN `Examinations` e ON e.ExamId = es.ExamId AND e.IsActive = 1
        LEFT JOIN `Staff` s ON s.Id = ia.InvigilatorId
        LEFT JOIN `Designations` des ON des.Id = s.DesignationId
        LEFT JOIN `Subjects` sub ON sub.SubjectId = es.SubjectId
        LEFT JOIN `Rooms` rm ON rm.RoomId = es.RoomId
        WHERE (p_StaffId IS NULL OR p_StaffId = 0 OR ia.InvigilatorId = p_StaffId)
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(e.CampusId, 1) = p_CampusId)
          AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR e.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR e.BoardId = p_BoardId)

        UNION

        SELECT 
            es2.ScheduleId AS DutyId,
            es2.ScheduleId AS ExamScheduleId,
            es2.InvigilatorId AS StaffId,
            TRIM(CONCAT(COALESCE(s2.FirstName, ''), ' ', COALESCE(s2.LastName, ''))) AS FacultyName,
            COALESCE(s2.EmployeeId, '') AS EmployeeCode,
            COALESCE(des2.Name, s2.Designation, 'Invigilator') AS Designation,
            e2.ExamId,
            e2.ExamId AS ExaminationId,
            COALESCE(e2.ExamName, '') AS ExamName,
            COALESCE(e2.ExamCode, '') AS ExamCode,
            CASE WHEN e2.ExamPattern LIKE '%OBJECTIVE%' OR e2.ExamPattern LIKE '%JEE%' OR e2.ExamPattern LIKE '%NEET%' THEN 'Objective' ELSE 'Regular' END AS ExamCategory,
            COALESCE(e2.ExamPattern, '') AS ExamPattern,
            es2.SubjectId,
            COALESCE(sub2.SubjectName, es2.PatternName, 'Examination') AS SubjectName,
            COALESCE(sub2.SubjectCode, '') AS SubjectCode,
            DATE(es2.ExamDate) AS ExamDate,
            es2.StartTime,
            es2.EndTime,
            COALESCE(es2.SessionId, '') AS SessionId,
            COALESCE(es2.Hall, '') AS Hall,
            COALESCE(rm2.RoomName, es2.Hall, '') AS RoomName,
            CASE 
                WHEN LOWER(COALESCE(e2.Status, '')) = 'cancelled' THEN 'Cancelled'
                WHEN es2.ExamDate < CURDATE() THEN 'Completed'
                WHEN es2.ExamDate = CURDATE() AND es2.EndTime <= CURTIME() THEN 'Completed'
                ELSE 'Upcoming'
            END AS Status
        FROM `ExamSchedules` es2
        INNER JOIN `Examinations` e2 ON e2.ExamId = es2.ExamId AND e2.IsActive = 1
        LEFT JOIN `Staff` s2 ON s2.Id = es2.InvigilatorId
        LEFT JOIN `Designations` des2 ON des2.Id = s2.DesignationId
        LEFT JOIN `Subjects` sub2 ON sub2.SubjectId = es2.SubjectId
        LEFT JOIN `Rooms` rm2 ON rm2.RoomId = es2.RoomId
        WHERE es2.IsActive = 1
          AND es2.InvigilatorId IS NOT NULL AND es2.InvigilatorId > 0
          AND (p_StaffId IS NULL OR p_StaffId = 0 OR es2.InvigilatorId = p_StaffId)
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(e2.CampusId, 1) = p_CampusId)
          AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR e2.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR e2.BoardId = p_BoardId)
          AND NOT EXISTS (SELECT 1 FROM `InvigilatorAssignments` ia2 WHERE ia2.ExamScheduleId = es2.ScheduleId AND ia2.InvigilatorId = es2.InvigilatorId)
    ) q
    WHERE (
        p_Status IS NULL OR p_Status = '' OR
        (LOWER(p_Status) = 'upcoming' AND q.Status = 'Upcoming') OR
        (LOWER(p_Status) = 'completed' AND q.Status = 'Completed') OR
        (LOWER(p_Status) = 'cancelled' AND q.Status = 'Cancelled')
    )
    ORDER BY q.ExamDate ASC, q.StartTime ASC;
END;";

            // 8. sp_GetAvailableHallsFiltered
            string spGetAvailableHallsFiltered = @"
DROP PROCEDURE IF EXISTS `sp_GetAvailableHallsFiltered`;
CREATE PROCEDURE `sp_GetAvailableHallsFiltered`(
    IN p_ExamDate DATE,
    IN p_StartTime TIME,
    IN p_EndTime TIME,
    IN p_RequiredCapacity INT,
    IN p_CampusId INT,
    IN p_ExcludeScheduleId INT
)
BEGIN
    SELECT 
        r.RoomId,
        COALESCE(r.RoomNumber, '') AS RoomCode,
        COALESCE(r.RoomName, CONCAT('Room ', r.RoomNumber)) AS RoomName,
        COALESCE(r.BlockName, '') AS BlockName,
        COALESCE(r.Floor, '') AS Floor,
        COALESCE(r.Capacity, 30) AS Capacity,
        COALESCE(r.RoomType, 'Classroom') AS RoomType,
        r.IsActive,
        1 AS IsAvailable
    FROM `Rooms` r
    WHERE r.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND (p_RequiredCapacity IS NULL OR p_RequiredCapacity <= 0 OR r.Capacity >= p_RequiredCapacity)
      AND NOT EXISTS (
          SELECT 1 
          FROM `ExamSchedules` es
          WHERE es.IsActive = 1
            AND (p_ExcludeScheduleId IS NULL OR p_ExcludeScheduleId = 0 OR es.ScheduleId != p_ExcludeScheduleId)
            AND DATE(es.ExamDate) = p_ExamDate
            AND (es.RoomId = r.RoomId OR LOWER(TRIM(es.Hall)) = LOWER(TRIM(r.RoomNumber)) OR (r.RoomName IS NOT NULL AND LOWER(TRIM(es.Hall)) = LOWER(TRIM(r.RoomName))))
            AND NOT (p_EndTime <= es.StartTime OR p_StartTime >= es.EndTime)
      )
    ORDER BY r.RoomNumber ASC;
END;";

            // 9. sp_GetAvailableInvigilatorsFiltered
            string spGetAvailableInvigilatorsFiltered = @"
DROP PROCEDURE IF EXISTS `sp_GetAvailableInvigilatorsFiltered`;
CREATE PROCEDURE `sp_GetAvailableInvigilatorsFiltered`(
    IN p_ExamDate DATE,
    IN p_StartTime TIME,
    IN p_EndTime TIME,
    IN p_SubjectIdsJson LONGTEXT,
    IN p_CampusId INT,
    IN p_ExcludeScheduleId INT
)
BEGIN
    CREATE TEMPORARY TABLE IF NOT EXISTS tmp_subject_staff (StaffId INT);
    TRUNCATE TABLE tmp_subject_staff;

    IF p_SubjectIdsJson IS NOT NULL AND p_SubjectIdsJson != '' AND p_SubjectIdsJson != '[]' THEN
        INSERT INTO tmp_subject_staff (StaffId)
        SELECT DISTINCT ssa.StaffId
        FROM `StaffSubjectAllocations` ssa
        INNER JOIN JSON_TABLE(
            p_SubjectIdsJson,
            '$[*]' COLUMNS (SubjectId INT PATH '$')
        ) jt ON ssa.SubjectId = jt.SubjectId;
    END IF;

    SELECT 
        s.Id AS StaffId,
        s.Id AS FacultyId,
        COALESCE(s.EmployeeId, '') AS EmployeeId,
        TRIM(CONCAT(COALESCE(s.FirstName, ''), ' ', COALESCE(s.LastName, ''))) AS FullName,
        COALESCE(des.Name, s.Designation, 'Faculty') AS Designation,
        COALESCE(d.DepartmentName, '') AS Department,
        s.Mobile,
        s.Email,
        CASE WHEN tss.StaffId IS NOT NULL THEN 1 ELSE 0 END AS IsSubjectFaculty,
        1 AS IsAvailable
    FROM `Staff` s
    LEFT JOIN `Departments` d ON d.DepartmentId = s.DepartmentId
    LEFT JOIN `Designations` des ON des.Id = s.DesignationId
    LEFT JOIN tmp_subject_staff tss ON tss.StaffId = s.Id
    WHERE s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND NOT EXISTS (
          SELECT 1
          FROM `ExamSchedules` es
          WHERE es.IsActive = 1
            AND (p_ExcludeScheduleId IS NULL OR p_ExcludeScheduleId = 0 OR es.ScheduleId != p_ExcludeScheduleId)
            AND DATE(es.ExamDate) = p_ExamDate
            AND (es.InvigilatorId = s.Id OR LOWER(TRIM(es.Invigilator)) = LOWER(TRIM(CONCAT(s.FirstName, ' ', s.LastName))))
            AND NOT (p_EndTime <= es.StartTime OR p_StartTime >= es.EndTime)
      )
      AND NOT EXISTS (
          SELECT 1
          FROM `InvigilatorAssignments` ia
          INNER JOIN `ExamSchedules` es2 ON es2.ScheduleId = ia.ExamScheduleId AND es2.IsActive = 1
          WHERE ia.InvigilatorId = s.Id
            AND (p_ExcludeScheduleId IS NULL OR p_ExcludeScheduleId = 0 OR es2.ScheduleId != p_ExcludeScheduleId)
            AND DATE(es2.ExamDate) = p_ExamDate
            AND NOT (p_EndTime <= es2.StartTime OR p_StartTime >= es2.EndTime)
      )
    ORDER BY s.FirstName ASC, s.LastName ASC;

    DROP TEMPORARY TABLE IF EXISTS tmp_subject_staff;
END;";

            // 10. sp_GetInvigilatorsBySchedule (FIXED)
            string spGetInvigilatorsBySchedule = @"
DROP PROCEDURE IF EXISTS `sp_GetInvigilatorsBySchedule`;
CREATE PROCEDURE `sp_GetInvigilatorsBySchedule`(
    IN p_ExamScheduleId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        ia.InvigilatorAssignmentId,
        ia.InvigilatorAssignmentId AS Id,
        ia.ExamScheduleId,
        ia.InvigilatorId,
        ia.HallNumber,
        ia.AssignedAt,
        COALESCE(s.Email, u.Email, '') AS InvigilatorEmail,
        TRIM(CONCAT(COALESCE(s.FirstName, u.FullName, 'Invigilator'), ' ', COALESCE(s.LastName, ''))) AS InvigilatorName
    FROM `InvigilatorAssignments` ia
    LEFT JOIN `Staff` s ON s.Id = ia.InvigilatorId
    LEFT JOIN `Users` u ON u.StaffId = s.Id
    WHERE ia.ExamScheduleId = p_ExamScheduleId;
END;";

            // 11. sp_CreateExamSchedule (FIXED)
            string spCreateExamSchedule = @"
DROP PROCEDURE IF EXISTS `sp_CreateExamSchedule`;
CREATE PROCEDURE `sp_CreateExamSchedule`(
    IN p_ExamId INT,
    IN p_SubjectId INT,
    IN p_ExamDate DATETIME,
    IN p_StartTime TIME,
    IN p_EndTime TIME,
    IN p_SessionId VARCHAR(100),
    IN p_ScheduleMode VARCHAR(50),
    IN p_RoomId INT,
    IN p_InvigilatorId INT,
    IN p_Hall VARCHAR(100),
    IN p_Invigilator VARCHAR(150),
    IN p_ExamMode VARCHAR(50),
    IN p_MaxMarks DECIMAL(10,2),
    IN p_PassingMarks DECIMAL(10,2),
    IN p_CampusId INT,
    IN p_PatternName VARCHAR(100),
    IN p_GroupId INT,
    IN p_IncludedSubjectIds TEXT
)
BEGIN
    UPDATE `ExamSchedules`
    SET IsActive = 0, UpdatedAt = UTC_TIMESTAMP()
    WHERE ExamId = p_ExamId 
      AND (
          (p_SubjectId IS NOT NULL AND SubjectId = p_SubjectId) OR
          (p_SubjectId IS NULL AND SubjectId IS NULL AND COALESCE(ScheduleMode, 'SUBJECT_WISE') = COALESCE(p_ScheduleMode, 'SUBJECT_WISE'))
      )
      AND IsActive = 1;

    INSERT INTO `ExamSchedules` (
        ExamId,
        SubjectId,
        ExamDate,
        StartTime,
        EndTime,
        SessionId,
        ScheduleMode,
        RoomId,
        InvigilatorId,
        Hall,
        Invigilator,
        ExamMode,
        MaxMarks,
        PassingMarks,
        PatternName,
        GroupId,
        IncludedSubjectIds,
        IsActive,
        CreatedAt,
        UpdatedAt
    ) VALUES (
        p_ExamId,
        p_SubjectId,
        p_ExamDate,
        p_StartTime,
        p_EndTime,
        p_SessionId,
        COALESCE(p_ScheduleMode, 'SUBJECT_WISE'),
        p_RoomId,
        p_InvigilatorId,
        COALESCE(p_Hall, ''),
        COALESCE(p_Invigilator, ''),
        COALESCE(p_ExamMode, 'Written'),
        COALESCE(p_MaxMarks, 100.00),
        COALESCE(p_PassingMarks, 35.00),
        p_PatternName,
        p_GroupId,
        p_IncludedSubjectIds,
        1,
        UTC_TIMESTAMP(),
        NULL
    );

    SELECT LAST_INSERT_ID() AS ScheduleId;
END;";

            var procedures = new (string Name, string Sql)[]
            {
                ("ExaminationSettings table", createSettingsTable),
                ("sp_GetExaminationSettings", spGetExaminationSettings),
                ("sp_SaveExaminationSettings", spSaveExaminationSettings),
                ("sp_GetExaminationSubjects", spGetExaminationSubjects),
                ("sp_SaveExaminationSubjects", spSaveExaminationSubjects),
                ("sp_AssignInvigilatorsBatch", spAssignInvigilatorsBatch),
                ("sp_GetNextExamCodeSequence", spGetNextExamCodeSequence),
                ("sp_GetFacultyExamDuties", spGetFacultyExamDuties),
                ("sp_GetAvailableHallsFiltered", spGetAvailableHallsFiltered),
                ("sp_GetAvailableInvigilatorsFiltered", spGetAvailableInvigilatorsFiltered),
                ("sp_GetInvigilatorsBySchedule", spGetInvigilatorsBySchedule),
                ("sp_CreateExamSchedule", spCreateExamSchedule)
            };

            foreach (var (name, sql) in procedures)
            {
                await connection.ExecuteAsync(sql);
                Console.WriteLine($"  [DEPLOYED] {name}");
            }

            Console.WriteLine("[ExamCellModuleDbDeployer] All procedures deployed successfully.");
            return true;
        }
    }
}
