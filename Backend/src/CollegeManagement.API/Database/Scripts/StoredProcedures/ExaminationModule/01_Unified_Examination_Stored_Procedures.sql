-- ====================================================================================
-- College Management System - Unified Examination Module Stored Procedures
-- Run this script in MySQL Workbench or your MySQL CLI
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- STEP 0: ENSURE MODULE TABLES EXIST
-- ------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ExaminationSubjects` (
    `ExamId` INT NOT NULL,
    `SubjectId` INT NOT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`ExamId`, `SubjectId`),
    KEY `IX_ExaminationSubjects_SubjectId` (`SubjectId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ExaminationSettings` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `CampusId` INT NOT NULL DEFAULT 1,
    `MinimumPassingPercentage` DECIMAL(5,2) NOT NULL DEFAULT 35.00,
    `MaximumGraceMarksLimit` INT NOT NULL DEFAULT 5,
    `GradeScaleStandard` VARCHAR(150) NOT NULL DEFAULT '10-Point CGPA (UGC / AICTE Standard)',
    `ReEvaluationWindowDays` INT NOT NULL DEFAULT 15,
    `EnableDoubleEvaluation` TINYINT(1) NOT NULL DEFAULT 0,
    `AllowNegativeMarking` TINYINT(1) NOT NULL DEFAULT 0,
    `SettingsJson` TEXT NULL,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `UQ_ExaminationSettings_CampusId` (`CampusId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------
-- STEP 1: DROP ALL EXISTING / OLD EXAMINATION PROCEDURES
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetExaminations;
DROP PROCEDURE IF EXISTS sp_GetExaminationDetails;
DROP PROCEDURE IF EXISTS sp_GetExaminationById;
DROP PROCEDURE IF EXISTS sp_CreateExamination;
DROP PROCEDURE IF EXISTS sp_UpdateExamination;
DROP PROCEDURE IF EXISTS sp_DeleteExamination;
DROP PROCEDURE IF EXISTS sp_UpdateExaminationStatus;
DROP PROCEDURE IF EXISTS sp_GetExaminationSubjectIds;
DROP PROCEDURE IF EXISTS sp_SaveExaminationSubjects;

DROP PROCEDURE IF EXISTS sp_GetExamSchedulesByExamination;
DROP PROCEDURE IF EXISTS sp_GetExamScheduleById;
DROP PROCEDURE IF EXISTS sp_CreateExamSchedule;
DROP PROCEDURE IF EXISTS sp_UpdateExamSchedule;
DROP PROCEDURE IF EXISTS sp_DeleteExamSchedule;
DROP PROCEDURE IF EXISTS sp_DeleteExamSchedulesByExam;
DROP PROCEDURE IF EXISTS sp_PublishExamSchedules;
DROP PROCEDURE IF EXISTS sp_FinalizeExaminationSchedule;

DROP PROCEDURE IF EXISTS sp_GetEligibleSubjectsForExam;
DROP PROCEDURE IF EXISTS sp_CheckRoomConflict;
DROP PROCEDURE IF EXISTS sp_CheckInvigilatorConflict;
DROP PROCEDURE IF EXISTS sp_GetAvailableHalls;
DROP PROCEDURE IF EXISTS sp_GetAvailableInvigilators;
DROP PROCEDURE IF EXISTS sp_GetSchedulingContext;

DROP PROCEDURE IF EXISTS sp_GenerateHallTicketsForBatch;
DROP PROCEDURE IF EXISTS sp_GenerateHallTickets;

DROP PROCEDURE IF EXISTS sp_GetInvigilatorsBySchedule;
DROP PROCEDURE IF EXISTS sp_AssignInvigilator;
DROP PROCEDURE IF EXISTS sp_AssignInvigilatorHallsBulk;
DROP PROCEDURE IF EXISTS sp_GetFacultyExamDuties;
DROP PROCEDURE IF EXISTS sp_ReassignInvigilatorDuty;

DROP PROCEDURE IF EXISTS sp_GetExaminationSettings;
DROP PROCEDURE IF EXISTS sp_SaveExaminationSettings;
DROP PROCEDURE IF EXISTS sp_AutoTransitionExaminationStatuses;

DELIMITER //

-- ------------------------------------------------------------------------------------
-- 1. sp_GetExaminations
-- Retrieves all examinations with rich academic context, aggregated counts & subject IDs
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetExaminations`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_AssessmentTypeId INT,
    IN p_Status VARCHAR(50),
    IN p_SearchTerm VARCHAR(150),
    IN p_CampusId INT)
BEGIN
    SELECT 
        e.ExamId,
        e.ExamId AS ExaminationId,
        COALESCE(e.CampusId, 1) AS CampusId,
        COALESCE(e.ExamCode, CONCAT('EXM-', YEAR(e.StartDate), '-', LPAD(e.ExamId, 3, '0'))) AS ExamCode,
        e.ExamName,
        e.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        e.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYear,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        e.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevel,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        e.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        e.ProgramId,
        COALESCE(p.ProgramName, 'All Programs') AS ProgramName,
        e.AssessmentTypeId,
        COALESCE(at.AssessmentTypeName, '') AS ExamType,
        COALESCE(e.ExamPattern, 'REGULAR_ACADEMIC') AS ExamPattern,
        e.TotalMarks,
        e.PassPercentage,
        e.StartDate,
        e.EndDate,
        e.Description,
        e.Status,
        e.IsActive,
        e.CreatedAt,
        e.UpdatedAt,
        (
            SELECT COUNT(*) 
            FROM Subjects s 
            WHERE s.IsActive = 1 
              AND s.BoardId = e.BoardId 
              AND s.AcademicLevelId = e.AcademicLevelId 
              AND s.GroupId = e.GroupId
        ) AS TotalEligibleSubjects,
        (
            SELECT COUNT(DISTINCT es.SubjectId) 
            FROM ExamSchedules es 
            WHERE es.ExamId = e.ExamId AND es.IsActive = 1
        ) AS ScheduledSubjectsCount,
        (
            SELECT GROUP_CONCAT(DISTINCT esub.SubjectId ORDER BY esub.SubjectId SEPARATOR ',')
            FROM ExaminationSubjects esub
            WHERE esub.ExamId = e.ExamId
        ) AS AggregatedSubjectIds
    FROM Examinations e
    LEFT JOIN Boards b ON b.BoardId = e.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = e.AcademicYearId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = e.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = e.GroupId
    LEFT JOIN Programs p ON p.ProgramId = e.ProgramId
    LEFT JOIN AssessmentTypes at ON at.AssessmentTypeId = e.AssessmentTypeId
    WHERE e.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(e.CampusId, 1) = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR e.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR e.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR e.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR e.GroupId = p_GroupId)
      AND (p_ProgramId IS NULL OR p_ProgramId = 0 OR e.ProgramId = p_ProgramId)
      AND (p_AssessmentTypeId IS NULL OR p_AssessmentTypeId = 0 OR e.AssessmentTypeId = p_AssessmentTypeId)
      AND (p_Status IS NULL OR p_Status = '' OR LOWER(e.Status) = LOWER(p_Status))
      AND (
          p_SearchTerm IS NULL OR p_SearchTerm = '' OR
          LOWER(e.ExamName) LIKE CONCAT('%', LOWER(p_SearchTerm), '%') OR
          (e.ExamCode IS NOT NULL AND LOWER(e.ExamCode) LIKE CONCAT('%', LOWER(p_SearchTerm), '%')) OR
          (g.GroupName IS NOT NULL AND LOWER(g.GroupName) LIKE CONCAT('%', LOWER(p_SearchTerm), '%')) OR
          (p.ProgramName IS NOT NULL AND LOWER(p.ProgramName) LIKE CONCAT('%', LOWER(p_SearchTerm), '%'))
      )
    ORDER BY e.ExamId DESC;
END //

-- ------------------------------------------------------------------------------------
-- 2. sp_GetExaminationById
-- Retrieves single examination details with all foreign key names & subject IDs
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetExaminationById`(
    IN p_ExaminationId INT,
    IN p_CampusId INT)
BEGIN
    SELECT 
        e.ExamId,
        e.ExamId AS ExaminationId,
        COALESCE(e.CampusId, 1) AS CampusId,
        COALESCE(e.ExamCode, CONCAT('EXM-', YEAR(e.StartDate), '-', LPAD(e.ExamId, 3, '0'))) AS ExamCode,
        e.ExamName,
        e.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        e.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYear,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        e.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevel,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        e.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        e.ProgramId,
        COALESCE(p.ProgramName, 'All Programs') AS ProgramName,
        e.AssessmentTypeId,
        COALESCE(at.AssessmentTypeName, '') AS ExamType,
        COALESCE(e.ExamPattern, 'REGULAR_ACADEMIC') AS ExamPattern,
        e.TotalMarks,
        e.PassPercentage,
        e.StartDate,
        e.EndDate,
        e.Description,
        e.Status,
        e.IsActive,
        e.CreatedAt,
        e.UpdatedAt,
        (
            SELECT COUNT(*) 
            FROM Subjects s 
            WHERE s.IsActive = 1 
              AND s.BoardId = e.BoardId 
              AND s.AcademicLevelId = e.AcademicLevelId 
              AND s.GroupId = e.GroupId
        ) AS TotalEligibleSubjects,
        (
            SELECT COUNT(DISTINCT es.SubjectId) 
            FROM ExamSchedules es 
            WHERE es.ExamId = e.ExamId AND es.IsActive = 1
        ) AS ScheduledSubjectsCount,
        (
            SELECT GROUP_CONCAT(DISTINCT esub.SubjectId ORDER BY esub.SubjectId SEPARATOR ',')
            FROM ExaminationSubjects esub
            WHERE esub.ExamId = e.ExamId
        ) AS AggregatedSubjectIds
    FROM Examinations e
    LEFT JOIN Boards b ON b.BoardId = e.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = e.AcademicYearId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = e.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = e.GroupId
    LEFT JOIN Programs p ON p.ProgramId = e.ProgramId
    LEFT JOIN AssessmentTypes at ON at.AssessmentTypeId = e.AssessmentTypeId
    WHERE e.ExamId = p_ExaminationId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(e.CampusId, 1) = p_CampusId);
END //

-- ------------------------------------------------------------------------------------
-- 3. sp_CreateExamination
-- Inserts a new examination and returns the newly generated ExamId
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_CreateExamination`(
    IN p_ExamCode VARCHAR(50),
    IN p_ExamName VARCHAR(150),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_AssessmentTypeId INT,
    IN p_StartDate DATETIME,
    IN p_EndDate DATETIME,
    IN p_Description VARCHAR(500),
    IN p_ExamPattern VARCHAR(50),
    IN p_TotalMarks INT,
    IN p_PassPercentage DECIMAL(5,2),
    IN p_Status VARCHAR(50),
    IN p_CampusId INT)
BEGIN
    INSERT INTO `Examinations` (
        CampusId,
        ExamCode,
        ExamName,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        ProgramId,
        AssessmentTypeId,
        StartDate,
        EndDate,
        Description,
        ExamPattern,
        TotalMarks,
        PassPercentage,
        Status,
        IsActive,
        CreatedAt,
        UpdatedAt
    ) VALUES (
        IFNULL(p_CampusId, 1),
        p_ExamCode,
        p_ExamName,
        p_BoardId,
        p_AcademicYearId,
        p_AcademicLevelId,
        p_GroupId,
        p_ProgramId,
        p_AssessmentTypeId,
        p_StartDate,
        p_EndDate,
        p_Description,
        COALESCE(p_ExamPattern, 'REGULAR_ACADEMIC'),
        p_TotalMarks,
        p_PassPercentage,
        COALESCE(p_Status, 'DRAFT'),
        1,
        UTC_TIMESTAMP(),
        NULL
    );

    SELECT LAST_INSERT_ID() AS ExamId;
END //

-- ------------------------------------------------------------------------------------
-- 4. sp_UpdateExamination
-- Updates existing examination details
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_UpdateExamination`(
    IN p_ExamId INT,
    IN p_ExamName VARCHAR(150),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_AssessmentTypeId INT,
    IN p_StartDate DATETIME,
    IN p_EndDate DATETIME,
    IN p_Description VARCHAR(500),
    IN p_ExamPattern VARCHAR(50),
    IN p_TotalMarks INT,
    IN p_PassPercentage DECIMAL(5,2),
    IN p_Status VARCHAR(50),
    IN p_CampusId INT)
BEGIN
    UPDATE `Examinations` SET 
        CampusId = COALESCE(p_CampusId, CampusId),
        ExamName = COALESCE(p_ExamName, ExamName),
        BoardId = COALESCE(p_BoardId, BoardId),
        AcademicYearId = COALESCE(p_AcademicYearId, AcademicYearId),
        AcademicLevelId = COALESCE(p_AcademicLevelId, AcademicLevelId),
        GroupId = COALESCE(p_GroupId, GroupId),
        ProgramId = p_ProgramId,
        AssessmentTypeId = COALESCE(p_AssessmentTypeId, AssessmentTypeId),
        StartDate = COALESCE(p_StartDate, StartDate),
        EndDate = COALESCE(p_EndDate, EndDate),
        Description = p_Description,
        ExamPattern = COALESCE(p_ExamPattern, ExamPattern),
        TotalMarks = p_TotalMarks,
        PassPercentage = p_PassPercentage,
        Status = COALESCE(p_Status, Status),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ExamId = p_ExamId;
END //

-- ------------------------------------------------------------------------------------
-- 5. sp_DeleteExamination
-- Soft deletes an examination entry
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_DeleteExamination`(
    IN p_ExamId INT,
    IN p_CampusId INT)
BEGIN
    UPDATE `Examinations` SET 
        IsActive = 0,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ExamId = p_ExamId;
END //

-- ------------------------------------------------------------------------------------
-- 5b. sp_UpdateExaminationStatus
-- Updates examination lifecycle status
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_UpdateExaminationStatus`(
    IN p_ExamId INT,
    IN p_Status VARCHAR(50))
BEGIN
    UPDATE `Examinations` SET 
        Status = p_Status,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ExamId = p_ExamId;
END //

-- ------------------------------------------------------------------------------------
-- 5c. sp_GetExaminationSubjectIds
-- Returns subject IDs mapped to an examination
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetExaminationSubjectIds`(
    IN p_ExamId INT)
BEGIN
    SELECT SubjectId 
    FROM ExaminationSubjects 
    WHERE ExamId = p_ExamId
    ORDER BY SubjectId ASC;
END //

-- ------------------------------------------------------------------------------------
-- 5d. sp_SaveExaminationSubjects
-- Atomically clears and saves subject IDs mapped to an examination
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_SaveExaminationSubjects`(
    IN p_ExamId INT,
    IN p_SubjectIds TEXT)
BEGIN
    DELETE FROM ExaminationSubjects WHERE ExamId = p_ExamId;
    
    IF p_SubjectIds IS NOT NULL AND LENGTH(TRIM(p_SubjectIds)) > 0 THEN
        INSERT INTO ExaminationSubjects (ExamId, SubjectId, CreatedAt)
        SELECT DISTINCT p_ExamId, CAST(elem AS UNSIGNED), UTC_TIMESTAMP()
        FROM JSON_TABLE(
            CONCAT('["', REPLACE(REPLACE(p_SubjectIds, ' ', ''), ',', '","'), '"]'),
            '$[*]' COLUMNS (elem VARCHAR(50) PATH '$')
        ) AS jt
        WHERE CAST(elem AS UNSIGNED) > 0;
    END IF;
END //

-- ------------------------------------------------------------------------------------
-- 6. sp_GetExamSchedulesByExamination
-- Retrieves all schedules for an examination ordered by date and time
-- Uses COALESCE(SubjectId, ScheduleId) to prevent grouping collisions for Pattern exams
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetExamSchedulesByExamination`(
    IN p_ExaminationId INT,
    IN p_CampusId INT)
BEGIN
    SELECT 
        es.ScheduleId AS ExamScheduleId,
        es.ScheduleId,
        es.ExamId AS ExaminationId,
        es.ExamId,
        es.SubjectId,
        es.ExamDate,
        es.StartTime,
        es.EndTime,
        es.SessionId,
        es.ScheduleMode,
        es.GroupId,
        es.RoomId,
        es.InvigilatorId,
        es.PatternName,
        es.IncludedSubjectIds,
        COALESCE(es.Hall, '') AS Hall,
        COALESCE(es.Invigilator, '') AS Invigilator,
        COALESCE(es.ExamMode, 'Written') AS ExamMode,
        COALESCE(es.MaxMarks, 100.00) AS MaxMarks,
        COALESCE(es.PassingMarks, 35.00) AS PassingMarks,
        es.IsActive,
        COALESCE(s.SubjectName, '') AS SubjectName,
        COALESCE(s.SubjectCode, '') AS SubjectCode
    FROM ExamSchedules es
    INNER JOIN (
        SELECT MAX(ScheduleId) AS MaxScheduleId
        FROM ExamSchedules
        WHERE (p_ExaminationId IS NULL OR p_ExaminationId = 0 OR ExamId = p_ExaminationId)
          AND IsActive = 1
        GROUP BY ExamId, COALESCE(SubjectId, ScheduleId)
    ) latest ON es.ScheduleId = latest.MaxScheduleId
    LEFT JOIN Subjects s ON es.SubjectId = s.SubjectId
    WHERE (p_ExaminationId IS NULL OR p_ExaminationId = 0 OR es.ExamId = p_ExaminationId)
      AND es.IsActive = 1
    ORDER BY es.ExamDate ASC, es.StartTime ASC;
END //

-- ------------------------------------------------------------------------------------
-- 7. sp_GetExamScheduleById
-- Retrieves single schedule by ID including pattern and group columns
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetExamScheduleById`(
    IN p_ExamScheduleId INT,
    IN p_CampusId INT)
BEGIN
    SELECT 
        es.ScheduleId AS ExamScheduleId,
        es.ScheduleId,
        es.ExamId AS ExaminationId,
        es.ExamId,
        es.SubjectId,
        es.ExamDate,
        es.StartTime,
        es.EndTime,
        es.SessionId,
        es.ScheduleMode,
        es.GroupId,
        es.RoomId,
        es.InvigilatorId,
        es.PatternName,
        es.IncludedSubjectIds,
        COALESCE(es.Hall, '') AS Hall,
        COALESCE(es.Invigilator, '') AS Invigilator,
        COALESCE(es.ExamMode, 'Written') AS ExamMode,
        COALESCE(es.MaxMarks, 100.00) AS MaxMarks,
        COALESCE(es.PassingMarks, 35.00) AS PassingMarks,
        es.IsActive,
        COALESCE(s.SubjectName, '') AS SubjectName,
        COALESCE(s.SubjectCode, '') AS SubjectCode
    FROM ExamSchedules es
    LEFT JOIN Subjects s ON es.SubjectId = s.SubjectId
    WHERE es.ScheduleId = p_ExamScheduleId;
END //

-- ------------------------------------------------------------------------------------
-- 8. sp_CreateExamSchedule
-- Inserts a new schedule entry directly supporting PatternName, GroupId, IncludedSubjectIds
-- ------------------------------------------------------------------------------------
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
    IN p_IncludedSubjectIds TEXT)
BEGIN
    IF p_SubjectId IS NOT NULL AND p_SubjectId > 0 THEN
        UPDATE ExamSchedules
        SET IsActive = 0, UpdatedAt = UTC_TIMESTAMP()
        WHERE ExamId = p_ExamId AND SubjectId = p_SubjectId AND IsActive = 1;
    END IF;

    INSERT INTO ExamSchedules (
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
END //

-- ------------------------------------------------------------------------------------
-- 9. sp_UpdateExamSchedule
-- Updates an existing schedule entry including PatternName, GroupId, IncludedSubjectIds
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_UpdateExamSchedule`(
    IN p_ScheduleId INT,
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
    IN p_IncludedSubjectIds TEXT)
BEGIN
    UPDATE ExamSchedules
    SET 
        SubjectId = COALESCE(p_SubjectId, SubjectId),
        ExamDate = COALESCE(p_ExamDate, ExamDate),
        StartTime = COALESCE(p_StartTime, StartTime),
        EndTime = COALESCE(p_EndTime, EndTime),
        SessionId = p_SessionId,
        ScheduleMode = COALESCE(p_ScheduleMode, ScheduleMode),
        RoomId = p_RoomId,
        InvigilatorId = p_InvigilatorId,
        Hall = COALESCE(p_Hall, Hall),
        Invigilator = COALESCE(p_Invigilator, Invigilator),
        ExamMode = COALESCE(p_ExamMode, ExamMode),
        MaxMarks = COALESCE(p_MaxMarks, MaxMarks),
        PassingMarks = COALESCE(p_PassingMarks, PassingMarks),
        PatternName = COALESCE(p_PatternName, PatternName),
        GroupId = COALESCE(p_GroupId, GroupId),
        IncludedSubjectIds = COALESCE(p_IncludedSubjectIds, IncludedSubjectIds),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ScheduleId = p_ScheduleId;
END //

-- ------------------------------------------------------------------------------------
-- 10. sp_DeleteExamSchedule
-- Soft deletes an exam schedule
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_DeleteExamSchedule`(
    IN p_ScheduleId INT,
    IN p_CampusId INT)
BEGIN
    UPDATE ExamSchedules
    SET 
        IsActive = 0,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ScheduleId = p_ScheduleId;
END //

-- ------------------------------------------------------------------------------------
-- 10b. sp_DeleteExamSchedulesByExam
-- Soft deletes all schedules for an examination
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_DeleteExamSchedulesByExam`(
    IN p_ExamId INT)
BEGIN
    UPDATE ExamSchedules
    SET 
        IsActive = 0,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ExamId = p_ExamId;
END //

-- ------------------------------------------------------------------------------------
-- 11. sp_PublishExamSchedules
-- Publishes examination schedules from a comma-separated ID list
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_PublishExamSchedules`(
    IN p_ScheduleIds TEXT,
    IN p_CampusId INT)
BEGIN
    UPDATE ExamSchedules
    SET 
        IsActive = 1,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE FIND_IN_SET(ScheduleId, p_ScheduleIds) > 0;
END //

-- ------------------------------------------------------------------------------------
-- 12. sp_FinalizeExaminationSchedule
-- Transitions examination to SCHEDULED and activates all its schedules
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_FinalizeExaminationSchedule`(
    IN p_ExaminationId INT,
    IN p_CampusId INT)
BEGIN
    UPDATE `Examinations` SET 
        Status = 'SCHEDULED',
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ExamId = p_ExaminationId;

    UPDATE ExamSchedules
    SET 
        IsActive = 1,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ExamId = p_ExaminationId;
END //

-- ------------------------------------------------------------------------------------
-- 13. sp_GetEligibleSubjectsForExam
-- Retrieves eligible subjects based on the examination's Board, Level, and Group
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetEligibleSubjectsForExam`(
    IN p_ExaminationId INT,
    IN p_CampusId INT)
BEGIN
    SELECT 
        s.SubjectId,
        s.SubjectCode,
        s.SubjectName,
        s.BoardId,
        s.AcademicLevelId,
        s.GroupId,
        s.IsActive
    FROM Subjects s
    INNER JOIN Examinations e ON e.ExamId = p_ExaminationId
    WHERE s.IsActive = 1
      AND s.BoardId = e.BoardId
      AND s.AcademicLevelId = e.AcademicLevelId
      AND s.GroupId = e.GroupId
    ORDER BY s.SubjectName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 14. sp_CheckRoomConflict
-- Checks whether a room/hall is already occupied during a given date & time slot
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_CheckRoomConflict`(
    IN p_ExamDate DATE,
    IN p_StartTime TIME,
    IN p_EndTime TIME,
    IN p_Hall VARCHAR(100),
    IN p_ExcludeScheduleId INT,
    IN p_CampusId INT)
BEGIN
    SELECT COUNT(*) AS ConflictCount
    FROM ExamSchedules es
    INNER JOIN Examinations e ON es.ExamId = e.ExamId
    WHERE es.IsActive = 1
      AND e.IsActive = 1
      AND e.Status NOT IN ('CANCELLED', 'DELETED')
      AND DATE(es.ExamDate) = p_ExamDate
      AND LOWER(TRIM(es.Hall)) = LOWER(TRIM(p_Hall))
      AND (p_ExcludeScheduleId IS NULL OR p_ExcludeScheduleId = 0 OR es.ScheduleId != p_ExcludeScheduleId)
      AND NOT (p_EndTime <= es.StartTime OR p_StartTime >= es.EndTime);
END //

-- ------------------------------------------------------------------------------------
-- 15. sp_CheckInvigilatorConflict
-- Checks whether an invigilator is already assigned during a given date & time slot
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_CheckInvigilatorConflict`(
    IN p_ExamDate DATE,
    IN p_StartTime TIME,
    IN p_EndTime TIME,
    IN p_Invigilator VARCHAR(150),
    IN p_ExcludeScheduleId INT,
    IN p_CampusId INT)
BEGIN
    SELECT COUNT(*) AS ConflictCount
    FROM ExamSchedules es
    INNER JOIN Examinations e ON es.ExamId = e.ExamId
    WHERE es.IsActive = 1
      AND e.IsActive = 1
      AND e.Status NOT IN ('CANCELLED', 'DELETED')
      AND DATE(es.ExamDate) = p_ExamDate
      AND LOWER(TRIM(es.Invigilator)) = LOWER(TRIM(p_Invigilator))
      AND (p_ExcludeScheduleId IS NULL OR p_ExcludeScheduleId = 0 OR es.ScheduleId != p_ExcludeScheduleId)
      AND NOT (p_EndTime <= es.StartTime OR p_StartTime >= es.EndTime);
END //

-- ------------------------------------------------------------------------------------
-- 15b. sp_GetAvailableHalls
-- Retrieves rooms not occupied during a specific date and time slot
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetAvailableHalls`(
    IN p_ExamDate DATE,
    IN p_StartTime TIME,
    IN p_EndTime TIME,
    IN p_ExcludeScheduleId INT,
    IN p_CampusId INT)
BEGIN
    SELECT 
        r.RoomId,
        r.RoomNumber,
        r.RoomName,
        r.Capacity,
        r.Floor,
        COALESCE(r.BlockName, '') AS Block,
        COALESCE(r.BlockName, '') AS BlockName,
        r.IsActive
    FROM Rooms r
    WHERE r.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND r.RoomId NOT IN (
          SELECT es.RoomId
          FROM ExamSchedules es
          INNER JOIN Examinations e ON es.ExamId = e.ExamId
          WHERE es.IsActive = 1
            AND e.IsActive = 1
            AND e.Status NOT IN ('CANCELLED', 'DELETED')
            AND DATE(es.ExamDate) = p_ExamDate
            AND (p_ExcludeScheduleId IS NULL OR p_ExcludeScheduleId = 0 OR es.ScheduleId != p_ExcludeScheduleId)
            AND NOT (p_EndTime <= es.StartTime OR p_StartTime >= es.EndTime)
            AND es.RoomId IS NOT NULL
      )
      AND r.RoomNumber NOT IN (
          SELECT TRIM(es.Hall)
          FROM ExamSchedules es
          INNER JOIN Examinations e ON es.ExamId = e.ExamId
          WHERE es.IsActive = 1
            AND e.IsActive = 1
            AND e.Status NOT IN ('CANCELLED', 'DELETED')
            AND DATE(es.ExamDate) = p_ExamDate
            AND (p_ExcludeScheduleId IS NULL OR p_ExcludeScheduleId = 0 OR es.ScheduleId != p_ExcludeScheduleId)
            AND NOT (p_EndTime <= es.StartTime OR p_StartTime >= es.EndTime)
            AND es.Hall IS NOT NULL AND es.Hall != ''
      )
    ORDER BY r.RoomNumber ASC;
END //

-- ------------------------------------------------------------------------------------
-- 15c. sp_GetAvailableInvigilators
-- Retrieves staff members available for invigilation during a specific date and time slot
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetAvailableInvigilators`(
    IN p_ExamDate DATE,
    IN p_StartTime TIME,
    IN p_EndTime TIME,
    IN p_ExcludeScheduleId INT,
    IN p_CampusId INT)
BEGIN
    SELECT 
        s.Id,
        s.EmployeeId,
        s.FirstName,
        s.LastName,
        s.Email,
        COALESCE(s.Mobile, '') AS Phone,
        s.DesignationId,
        COALESCE(d.Name, s.Designation, '') AS DesignationName,
        s.DepartmentId,
        COALESCE(dept.DepartmentName, '') AS DepartmentName
    FROM Staffs s
    LEFT JOIN Designations d ON s.DesignationId = d.Id
    LEFT JOIN Departments dept ON s.DepartmentId = dept.DepartmentId
    WHERE (s.Status = 'Active' OR s.Status IS NULL) AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND s.Id NOT IN (
          -- Direct assignments in ExamSchedules
          SELECT es.InvigilatorId
          FROM ExamSchedules es
          INNER JOIN Examinations e ON es.ExamId = e.ExamId
          WHERE es.IsActive = 1
            AND e.IsActive = 1
            AND e.Status NOT IN ('CANCELLED', 'DELETED')
            AND DATE(es.ExamDate) = p_ExamDate
            AND (p_ExcludeScheduleId IS NULL OR p_ExcludeScheduleId = 0 OR es.ScheduleId != p_ExcludeScheduleId)
            AND NOT (p_EndTime <= es.StartTime OR p_StartTime >= es.EndTime)
            AND es.InvigilatorId IS NOT NULL

          UNION

          -- Assignments in InvigilatorAssignments table
          SELECT ia.InvigilatorId
          FROM InvigilatorAssignments ia
          INNER JOIN ExamSchedules es ON ia.ExamScheduleId = es.ScheduleId
          INNER JOIN Examinations e ON es.ExamId = e.ExamId
          WHERE es.IsActive = 1
            AND e.IsActive = 1
            AND e.Status NOT IN ('CANCELLED', 'DELETED')
            AND DATE(es.ExamDate) = p_ExamDate
            AND (p_ExcludeScheduleId IS NULL OR p_ExcludeScheduleId = 0 OR es.ScheduleId != p_ExcludeScheduleId)
            AND NOT (p_EndTime <= es.StartTime OR p_StartTime >= es.EndTime)
      )
    ORDER BY s.FirstName ASC, s.LastName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 15d. sp_GetSchedulingContext
-- Returns section IDs and eligible student counts in a single roundtrip
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetSchedulingContext`(
    IN p_ExaminationId INT)
BEGIN
    -- Result Set 1: Sections & Student Counts
    SELECT 
        sec.SectionId,
        sec.SectionName,
        COUNT(DISTINCT st.StudentId) AS EligibleStudentCount
    FROM Examinations e
    INNER JOIN Sections sec ON sec.GroupId = e.GroupId AND sec.IsActive = 1
        AND (e.BoardId IS NULL OR e.BoardId = 0 OR sec.BoardId = e.BoardId)
    LEFT JOIN Students st ON st.SectionId = sec.SectionId AND st.IsActive = 1
    WHERE e.ExamId = p_ExaminationId AND e.IsActive = 1
    GROUP BY sec.SectionId, sec.SectionName
    ORDER BY sec.SectionName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 16. sp_GenerateHallTickets
-- Generates hall tickets for eligible active students matching the exam's academic scope
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GenerateHallTickets`(
    IN p_ExaminationId INT,
    IN p_BatchId INT,
    IN p_CampusId INT)
BEGIN
    INSERT INTO HallTickets (ExamId, StudentId, BatchId, IssueDate, Status)
    SELECT 
        e.ExamId,
        s.StudentId,
        COALESCE(NULLIF(p_BatchId, 0), s.SectionId, 0),
        UTC_TIMESTAMP(),
        'ISSUED'
    FROM Students s
    CROSS JOIN Examinations e
    WHERE e.ExamId = p_ExaminationId
      AND s.IsActive = 1
      AND (e.GroupId = 0 OR s.GroupId = e.GroupId)
      AND (e.BoardId = 0 OR s.BoardId = e.BoardId)
      AND (e.AcademicYearId = 0 OR s.AcademicYearId = e.AcademicYearId)
      AND (e.AcademicLevelId = 0 OR s.AcademicLevelId = e.AcademicLevelId)
      AND (e.ProgramId IS NULL OR e.ProgramId = 0 OR s.ProgramId = e.ProgramId)
      AND (p_BatchId IS NULL OR p_BatchId = 0 OR s.SectionId = p_BatchId)
      AND s.StudentId NOT IN (
          SELECT ht.StudentId 
          FROM HallTickets ht 
          WHERE ht.ExamId = p_ExaminationId
      );

    SELECT 
        ht.HallTicketId,
        ht.ExamId AS ExaminationId,
        ht.StudentId,
        ht.BatchId,
        ht.IssueDate AS GeneratedAt,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, s.AdmissionNo, CAST(s.StudentId AS CHAR)) AS RollNumber
    FROM HallTickets ht
    INNER JOIN Students s ON ht.StudentId = s.StudentId
    WHERE ht.ExamId = p_ExaminationId
      AND (p_BatchId IS NULL OR p_BatchId = 0 OR ht.BatchId = p_BatchId)
    ORDER BY s.StudentName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 17. sp_AssignInvigilator
-- Assigns an invigilator to an exam schedule slot
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_AssignInvigilator`(
    IN p_ExamScheduleId INT,
    IN p_InvigilatorId INT,
    IN p_HallNumber VARCHAR(50),
    IN p_CampusId INT)
BEGIN
    INSERT INTO InvigilatorAssignments (
        ExamScheduleId,
        InvigilatorId,
        HallNumber,
        AssignedAt
    ) VALUES (
        p_ExamScheduleId,
        p_InvigilatorId,
        COALESCE(p_HallNumber, ''),
        UTC_TIMESTAMP()
    );
END //

-- ------------------------------------------------------------------------------------
-- 17b. sp_AssignInvigilatorHallsBulk
-- Atomically replaces invigilator hall assignments for an exam schedule using JSON
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_AssignInvigilatorHallsBulk`(
    IN p_ExamScheduleId INT,
    IN p_AssignmentsJson JSON)
BEGIN
    DELETE FROM InvigilatorAssignments WHERE ExamScheduleId = p_ExamScheduleId;

    IF p_AssignmentsJson IS NOT NULL AND JSON_LENGTH(p_AssignmentsJson) > 0 THEN
        INSERT INTO InvigilatorAssignments (ExamScheduleId, InvigilatorId, HallNumber, AssignedAt)
        SELECT 
            p_ExamScheduleId,
            jt.InvigilatorId,
            COALESCE(jt.HallNumber, ''),
            UTC_TIMESTAMP()
        FROM JSON_TABLE(
            p_AssignmentsJson,
            '$[*]' COLUMNS (
                InvigilatorId INT PATH '$.InvigilatorId',
                HallNumber VARCHAR(50) PATH '$.HallNumber'
            )
        ) AS jt
        WHERE jt.InvigilatorId > 0;
    END IF;
END //

-- ------------------------------------------------------------------------------------
-- 18. sp_GetInvigilatorsBySchedule
-- Retrieves invigilator assignments joining Staffs (not Users) with proper PK mapping
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetInvigilatorsBySchedule`(
    IN p_ExamScheduleId INT,
    IN p_CampusId INT)
BEGIN
    SELECT 
        ia.InvigilatorAssignmentId AS InvigilatorAssignmentId,
        ia.InvigilatorAssignmentId AS Id,
        ia.ExamScheduleId,
        ia.InvigilatorId,
        ia.InvigilatorId AS StaffId,
        ia.HallNumber,
        ia.AssignedAt,
        COALESCE(s.Email, '') AS InvigilatorEmail,
        TRIM(CONCAT(COALESCE(s.FirstName, ''), ' ', COALESCE(s.LastName, ''))) AS InvigilatorName
    FROM InvigilatorAssignments ia
    LEFT JOIN Staffs s ON ia.InvigilatorId = s.Id
    WHERE ia.ExamScheduleId = p_ExamScheduleId;
END //

-- ------------------------------------------------------------------------------------
-- 19. sp_GetFacultyExamDuties
-- Queries faculty examination invigilation duties with campus & academic scoping
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetFacultyExamDuties`(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50),
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_BoardId INT)
BEGIN
    SELECT 
        ia.InvigilatorAssignmentId AS Id,
        es.ScheduleId AS ExamScheduleId,
        e.ExamId AS ExaminationId,
        e.ExamName,
        e.ExamCode,
        e.ExamPattern,
        COALESCE(e.CampusId, 1) AS CampusId,
        e.Status AS ExamStatus,
        es.SubjectId,
        COALESCE(s.SubjectName, '') AS SubjectName,
        COALESCE(s.SubjectCode, '') AS SubjectCode,
        es.ExamDate,
        es.StartTime,
        es.EndTime,
        es.SessionId,
        COALESCE(NULLIF(ia.HallNumber, ''), es.Hall, 'Examination Hall') AS Venue,
        ia.InvigilatorId,
        TRIM(CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, ''))) AS InvigilatorName,
        COALESCE(st.Email, '') AS InvigilatorEmail,
        es.IsActive AS ScheduleIsActive,
        e.IsActive AS ExamIsActive
    FROM InvigilatorAssignments ia
    INNER JOIN ExamSchedules es ON ia.ExamScheduleId = es.ScheduleId
    INNER JOIN Examinations e ON es.ExamId = e.ExamId
    LEFT JOIN Subjects s ON es.SubjectId = s.SubjectId
    LEFT JOIN Staffs st ON ia.InvigilatorId = st.Id
    WHERE e.IsActive = 1
      AND (p_StaffId IS NULL OR p_StaffId = 0 OR ia.InvigilatorId = p_StaffId)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(e.CampusId, 1) = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR e.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR e.BoardId = p_BoardId)

    UNION ALL

    -- Include direct assignments where ExamSchedules.InvigilatorId is set without duplicate InvigilatorAssignments
    SELECT 
        es.ScheduleId AS Id,
        es.ScheduleId AS ExamScheduleId,
        e.ExamId AS ExaminationId,
        e.ExamName,
        e.ExamCode,
        e.ExamPattern,
        COALESCE(e.CampusId, 1) AS CampusId,
        e.Status AS ExamStatus,
        es.SubjectId,
        COALESCE(s.SubjectName, '') AS SubjectName,
        COALESCE(s.SubjectCode, '') AS SubjectCode,
        es.ExamDate,
        es.StartTime,
        es.EndTime,
        es.SessionId,
        COALESCE(NULLIF(es.Hall, ''), 'Examination Hall') AS Venue,
        es.InvigilatorId,
        COALESCE(NULLIF(es.Invigilator, ''), TRIM(CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')))) AS InvigilatorName,
        COALESCE(st.Email, '') AS InvigilatorEmail,
        es.IsActive AS ScheduleIsActive,
        e.IsActive AS ExamIsActive
    FROM ExamSchedules es
    INNER JOIN Examinations e ON es.ExamId = e.ExamId
    LEFT JOIN Subjects s ON es.SubjectId = s.SubjectId
    LEFT JOIN Staffs st ON es.InvigilatorId = st.Id
    WHERE e.IsActive = 1
      AND es.InvigilatorId IS NOT NULL AND es.InvigilatorId > 0
      AND NOT EXISTS (
          SELECT 1 FROM InvigilatorAssignments ia2 
          WHERE ia2.ExamScheduleId = es.ScheduleId AND ia2.InvigilatorId = es.InvigilatorId
      )
      AND (p_StaffId IS NULL OR p_StaffId = 0 OR es.InvigilatorId = p_StaffId)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR COALESCE(e.CampusId, 1) = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR e.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR e.BoardId = p_BoardId)
    ORDER BY ExamDate ASC, StartTime ASC;
END //

-- ------------------------------------------------------------------------------------
-- 20. sp_ReassignInvigilatorDuty
-- Atomically reassigns an invigilator duty to a new staff member and updates schedules
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_ReassignInvigilatorDuty`(
    IN p_DutyId INT,
    IN p_NewStaffId INT,
    IN p_HallNumber VARCHAR(50),
    IN p_Reason VARCHAR(500))
BEGIN
    UPDATE InvigilatorAssignments
    SET 
        InvigilatorId = p_NewStaffId,
        HallNumber = COALESCE(NULLIF(p_HallNumber, ''), HallNumber),
        AssignedAt = UTC_TIMESTAMP()
    WHERE InvigilatorAssignmentId = p_DutyId;

    UPDATE ExamSchedules es
    INNER JOIN InvigilatorAssignments ia ON ia.ExamScheduleId = es.ScheduleId
    LEFT JOIN Staffs s ON s.Id = p_NewStaffId
    SET 
        es.InvigilatorId = p_NewStaffId,
        es.Invigilator = TRIM(CONCAT(COALESCE(s.FirstName, ''), ' ', COALESCE(s.LastName, ''))),
        es.UpdatedAt = UTC_TIMESTAMP()
    WHERE ia.InvigilatorAssignmentId = p_DutyId;
END //

-- ------------------------------------------------------------------------------------
-- 21. sp_GetExaminationSettings
-- Retrieves campus-specific examination cell configuration
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetExaminationSettings`(
    IN p_CampusId INT)
BEGIN
    SELECT 
        Id,
        CampusId,
        MinimumPassingPercentage,
        MaximumGraceMarksLimit,
        GradeScaleStandard,
        ReEvaluationWindowDays,
        EnableDoubleEvaluation,
        AllowNegativeMarking,
        SettingsJson,
        UpdatedAt
    FROM ExaminationSettings
    WHERE CampusId = COALESCE(NULLIF(p_CampusId, 0), 1)
    LIMIT 1;
END //

-- ------------------------------------------------------------------------------------
-- 22. sp_SaveExaminationSettings
-- Upserts examination cell settings for a campus
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_SaveExaminationSettings`(
    IN p_CampusId INT,
    IN p_MinimumPassingPercentage DECIMAL(5,2),
    IN p_MaximumGraceMarksLimit INT,
    IN p_GradeScaleStandard VARCHAR(150),
    IN p_ReEvaluationWindowDays INT,
    IN p_EnableDoubleEvaluation TINYINT(1),
    IN p_AllowNegativeMarking TINYINT(1),
    IN p_SettingsJson TEXT)
BEGIN
    INSERT INTO ExaminationSettings (
        CampusId,
        MinimumPassingPercentage,
        MaximumGraceMarksLimit,
        GradeScaleStandard,
        ReEvaluationWindowDays,
        EnableDoubleEvaluation,
        AllowNegativeMarking,
        SettingsJson,
        UpdatedAt
    ) VALUES (
        COALESCE(NULLIF(p_CampusId, 0), 1),
        COALESCE(p_MinimumPassingPercentage, 35.00),
        COALESCE(p_MaximumGraceMarksLimit, 5),
        COALESCE(p_GradeScaleStandard, '10-Point CGPA (UGC / AICTE Standard)'),
        COALESCE(p_ReEvaluationWindowDays, 15),
        COALESCE(p_EnableDoubleEvaluation, 0),
        COALESCE(p_AllowNegativeMarking, 0),
        p_SettingsJson,
        UTC_TIMESTAMP()
    )
    ON DUPLICATE KEY UPDATE
        MinimumPassingPercentage = COALESCE(p_MinimumPassingPercentage, MinimumPassingPercentage),
        MaximumGraceMarksLimit = COALESCE(p_MaximumGraceMarksLimit, MaximumGraceMarksLimit),
        GradeScaleStandard = COALESCE(p_GradeScaleStandard, GradeScaleStandard),
        ReEvaluationWindowDays = COALESCE(p_ReEvaluationWindowDays, ReEvaluationWindowDays),
        EnableDoubleEvaluation = COALESCE(p_EnableDoubleEvaluation, EnableDoubleEvaluation),
        AllowNegativeMarking = COALESCE(p_AllowNegativeMarking, AllowNegativeMarking),
        SettingsJson = COALESCE(p_SettingsJson, SettingsJson),
        UpdatedAt = UTC_TIMESTAMP();

    SELECT 
        Id,
        CampusId,
        MinimumPassingPercentage,
        MaximumGraceMarksLimit,
        GradeScaleStandard,
        ReEvaluationWindowDays,
        EnableDoubleEvaluation,
        AllowNegativeMarking,
        SettingsJson,
        UpdatedAt
    FROM ExaminationSettings
    WHERE CampusId = COALESCE(NULLIF(p_CampusId, 0), 1)
    LIMIT 1;
END //

-- ------------------------------------------------------------------------------------
-- 23. sp_AutoTransitionExaminationStatuses
-- Set-based auto-transition for examinations based on current timestamp
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_AutoTransitionExaminationStatuses`(
    IN p_CurrentTime DATETIME)
BEGIN
    -- 1. Mark ONGOING examinations whose schedules are all in the past as COMPLETED
    UPDATE Examinations e
    SET e.Status = 'COMPLETED', e.UpdatedAt = UTC_TIMESTAMP()
    WHERE e.IsActive = 1
      AND e.Status IN ('SCHEDULED', 'ONGOING')
      AND EXISTS (
          SELECT 1 FROM ExamSchedules es WHERE es.ExamId = e.ExamId AND es.IsActive = 1
      )
      AND NOT EXISTS (
          SELECT 1 FROM ExamSchedules es
          WHERE es.ExamId = e.ExamId
            AND es.IsActive = 1
            AND CAST(CONCAT(DATE(es.ExamDate), ' ', es.EndTime) AS DATETIME) > p_CurrentTime
      );

    -- 2. Mark SCHEDULED examinations whose earliest schedule has started as ONGOING
    UPDATE Examinations e
    SET e.Status = 'ONGOING', e.UpdatedAt = UTC_TIMESTAMP()
    WHERE e.IsActive = 1
      AND e.Status = 'SCHEDULED'
      AND EXISTS (
          SELECT 1 FROM ExamSchedules es
          WHERE es.ExamId = e.ExamId
            AND es.IsActive = 1
            AND CAST(CONCAT(DATE(es.ExamDate), ' ', es.StartTime) AS DATETIME) <= p_CurrentTime
      )
      AND EXISTS (
          SELECT 1 FROM ExamSchedules es
          WHERE es.ExamId = e.ExamId
            AND es.IsActive = 1
            AND CAST(CONCAT(DATE(es.ExamDate), ' ', es.EndTime) AS DATETIME) > p_CurrentTime
      );
END //

DELIMITER ;
-- ------------------------------------------------------------------------------------
-- 24. sp_CheckInvigilatorTeachingSubject
-- Checks whether a faculty/invigilator is allocated to teach a subject
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CheckInvigilatorTeachingSubject`;
DELIMITER //
CREATE PROCEDURE `sp_CheckInvigilatorTeachingSubject`(
    IN p_StaffId INT,
    IN p_SubjectId INT)
BEGIN
    SELECT COUNT(*) 
    FROM FacultySubjectAllocations 
    WHERE StaffId = p_StaffId AND SubjectId = p_SubjectId;
END //
DELIMITER ;
