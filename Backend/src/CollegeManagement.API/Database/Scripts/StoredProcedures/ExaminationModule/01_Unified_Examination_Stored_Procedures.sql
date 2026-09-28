-- ====================================================================================
-- College Management System - Unified Examination Module Stored Procedures
-- Run this script in MySQL Workbench or your MySQL CLI
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- STEP 1: DROP ALL EXISTING / OLD EXAMINATION PROCEDURES
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetExaminations;
DROP PROCEDURE IF EXISTS sp_GetExaminationDetails;
DROP PROCEDURE IF EXISTS sp_GetExaminationById;
DROP PROCEDURE IF EXISTS sp_CreateExamination;
DROP PROCEDURE IF EXISTS sp_UpdateExamination;
DROP PROCEDURE IF EXISTS sp_DeleteExamination;

DROP PROCEDURE IF EXISTS sp_GetExamSchedulesByExamination;
DROP PROCEDURE IF EXISTS sp_GetExamScheduleById;
DROP PROCEDURE IF EXISTS sp_CreateExamSchedule;
DROP PROCEDURE IF EXISTS sp_UpdateExamSchedule;
DROP PROCEDURE IF EXISTS sp_DeleteExamSchedule;
DROP PROCEDURE IF EXISTS sp_PublishExamSchedules;
DROP PROCEDURE IF EXISTS sp_FinalizeExaminationSchedule;

DROP PROCEDURE IF EXISTS sp_GetEligibleSubjectsForExam;
DROP PROCEDURE IF EXISTS sp_CheckRoomConflict;
DROP PROCEDURE IF EXISTS sp_CheckInvigilatorConflict;

DROP PROCEDURE IF EXISTS sp_GenerateHallTicketsForBatch;
DROP PROCEDURE IF EXISTS sp_GenerateHallTickets;

DROP PROCEDURE IF EXISTS sp_GetInvigilatorsBySchedule;
DROP PROCEDURE IF EXISTS sp_AssignInvigilator;

DELIMITER //

-- ------------------------------------------------------------------------------------
-- 1. sp_GetExaminations
-- Retrieves all examinations with rich academic context and pre-aggregated counts
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetExaminations`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_AssessmentTypeId INT,
    IN p_Status VARCHAR(50),
    IN p_SearchTerm VARCHAR(150)
,
    IN p_CampusId INT)
BEGIN
    SELECT 
        e.ExamId,
        e.ExamId AS ExaminationId,
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
            SELECT COUNT(*) 
            FROM ExamSchedules es 
            WHERE es.ExamId = e.ExamId AND es.IsActive = 1
        ) AS ScheduledSubjectsCount
    FROM Examinations e
    LEFT JOIN Boards b ON b.BoardId = e.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = e.AcademicYearId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = e.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = e.GroupId
    LEFT JOIN Programs p ON p.ProgramId = e.ProgramId
    LEFT JOIN AssessmentTypes at ON at.AssessmentTypeId = e.AssessmentTypeId
    WHERE e.IsActive = 1
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
-- Retrieves single examination details with all foreign key names
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetExaminationById`(
    IN p_ExaminationId INT
,
    IN p_CampusId INT)
BEGIN
    SELECT 
        e.ExamId,
        e.ExamId AS ExaminationId,
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
            SELECT COUNT(*) 
            FROM ExamSchedules es 
            WHERE es.ExamId = e.ExamId AND es.IsActive = 1
        ) AS ScheduledSubjectsCount
    FROM Examinations e
    LEFT JOIN Boards b ON b.BoardId = e.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = e.AcademicYearId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = e.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = e.GroupId
    LEFT JOIN Programs p ON p.ProgramId = e.ProgramId
    LEFT JOIN AssessmentTypes at ON at.AssessmentTypeId = e.AssessmentTypeId
    WHERE e.ExamId = p_ExaminationId;
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
    IN p_Status VARCHAR(50)
,
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
    IN p_Status VARCHAR(50)
,
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
    IN p_ExamId INT
,
    IN p_CampusId INT)
BEGIN
    UPDATE `Examinations` SET 
        IsActive = 0,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ExamId = p_ExamId;
END //

-- ------------------------------------------------------------------------------------
-- 6. sp_GetExamSchedulesByExamination
-- Retrieves all schedules for an examination ordered by date and time
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetExamSchedulesByExamination`(
    IN p_ExaminationId INT
,
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
        es.RoomId,
        es.InvigilatorId,
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
    WHERE (p_ExaminationId IS NULL OR p_ExaminationId = 0 OR es.ExamId = p_ExaminationId)
      AND es.IsActive = 1
    ORDER BY es.ExamDate ASC, es.StartTime ASC;
END //

-- ------------------------------------------------------------------------------------
-- 7. sp_GetExamScheduleById
-- Retrieves single schedule by ID
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetExamScheduleById`(
    IN p_ExamScheduleId INT
,
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
        es.RoomId,
        es.InvigilatorId,
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
-- Inserts a new schedule entry and returns the newly generated ScheduleId
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
    IN p_PassingMarks DECIMAL(10,2)
,
    IN p_CampusId INT)
BEGIN
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
        1,
        UTC_TIMESTAMP(),
        NULL
    );

    SELECT LAST_INSERT_ID() AS ScheduleId;
END //

-- ------------------------------------------------------------------------------------
-- 9. sp_UpdateExamSchedule
-- Updates an existing schedule entry
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
    IN p_PassingMarks DECIMAL(10,2)
,
    IN p_CampusId INT)
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
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ScheduleId = p_ScheduleId;
END //

-- ------------------------------------------------------------------------------------
-- 10. sp_DeleteExamSchedule
-- Soft deletes an exam schedule
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_DeleteExamSchedule`(
    IN p_ScheduleId INT
,
    IN p_CampusId INT)
BEGIN
    UPDATE ExamSchedules
    SET 
        IsActive = 0,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ScheduleId = p_ScheduleId;
END //

-- ------------------------------------------------------------------------------------
-- 11. sp_PublishExamSchedules
-- Publishes examination schedules from a comma-separated ID list
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_PublishExamSchedules`(
    IN p_ScheduleIds TEXT
,
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
    IN p_ExaminationId INT
,
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
    IN p_ExaminationId INT
,
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
    IN p_ExcludeScheduleId INT
,
    IN p_CampusId INT)
BEGIN
    SELECT COUNT(*) AS ConflictCount
    FROM ExamSchedules es
    WHERE es.IsActive = 1
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
    IN p_ExcludeScheduleId INT
,
    IN p_CampusId INT)
BEGIN
    SELECT COUNT(*) AS ConflictCount
    FROM ExamSchedules es
    WHERE es.IsActive = 1
      AND DATE(es.ExamDate) = p_ExamDate
      AND LOWER(TRIM(es.Invigilator)) = LOWER(TRIM(p_Invigilator))
      AND (p_ExcludeScheduleId IS NULL OR p_ExcludeScheduleId = 0 OR es.ScheduleId != p_ExcludeScheduleId)
      AND NOT (p_EndTime <= es.StartTime OR p_StartTime >= es.EndTime);
END //

-- ------------------------------------------------------------------------------------
-- 16. sp_GenerateHallTickets
-- Generates hall tickets for eligible active students matching the exam's academic scope
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GenerateHallTickets`(
    IN p_ExaminationId INT,
    IN p_BatchId INT
,
    IN p_CampusId INT)
BEGIN
    -- Insert tickets for students who do not already have one
    INSERT INTO HallTickets (ExaminationId, StudentId, BatchId, GeneratedAt)
    SELECT 
        e.ExamId,
        s.StudentId,
        COALESCE(NULLIF(p_BatchId, 0), s.SectionId, 0),
        UTC_TIMESTAMP()
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
          WHERE ht.ExaminationId = p_ExaminationId
      );

    -- Return all hall tickets for this examination (and optional batch)
    SELECT 
        ht.HallTicketId,
        ht.ExaminationId,
        ht.StudentId,
        ht.BatchId,
        ht.GeneratedAt,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, s.AdmissionNo, CAST(s.StudentId AS CHAR)) AS RollNumber
    FROM HallTickets ht
    INNER JOIN Students s ON ht.StudentId = s.StudentId
    WHERE ht.ExaminationId = p_ExaminationId
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
    IN p_HallNumber VARCHAR(50)
,
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
-- 18. sp_GetInvigilatorsBySchedule
-- Retrieves invigilator assignments for an exam schedule
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetInvigilatorsBySchedule`(
    IN p_ExamScheduleId INT
,
    IN p_CampusId INT)
BEGIN
    SELECT 
        ia.Id AS InvigilatorAssignmentId,
        ia.ExamScheduleId,
        ia.InvigilatorId,
        ia.HallNumber,
        ia.AssignedAt,
        COALESCE(u.Email, '') AS InvigilatorEmail,
        COALESCE(u.Username, '') AS InvigilatorName
    FROM InvigilatorAssignments ia
    LEFT JOIN Users u ON ia.InvigilatorId = u.UserId
    WHERE ia.ExamScheduleId = p_ExamScheduleId;
END //

DELIMITER ;
