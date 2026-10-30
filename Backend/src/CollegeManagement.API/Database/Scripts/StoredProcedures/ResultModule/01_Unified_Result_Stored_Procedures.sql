-- ====================================================================================
-- College Management System - Unified Results Module Stored Procedures
-- High-Performance Dapper-Compliant Stored Procedures with Strict Multi-Tenancy
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- STEP 1: DROP ALL EXISTING RESULT PROCEDURES
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ProcessResults`;
DROP PROCEDURE IF EXISTS `sp_PublishResults`;
DROP PROCEDURE IF EXISTS `sp_GetResults`;
DROP PROCEDURE IF EXISTS `sp_GetStudentResult`;
DROP PROCEDURE IF EXISTS `sp_GetRankList`;
DROP PROCEDURE IF EXISTS `sp_GetFailedStudents`;
DROP PROCEDURE IF EXISTS `sp_GetResultStatistics`;
DROP PROCEDURE IF EXISTS `sp_GetResultAnalysis`;
DROP PROCEDURE IF EXISTS `sp_DownloadMemo`;
DROP PROCEDURE IF EXISTS `sp_RequestRevaluation`;
DROP PROCEDURE IF EXISTS `sp_GetRevaluationStatus`;
DROP PROCEDURE IF EXISTS `sp_GetResultDashboard`;
DROP PROCEDURE IF EXISTS `sp_UpdateResult`;
DROP PROCEDURE IF EXISTS `sp_DownloadResultsPdf`;
DROP PROCEDURE IF EXISTS `sp_GetSectionResultSummaries`;
DROP PROCEDURE IF EXISTS `sp_GetSectionResultDetail`;
DROP PROCEDURE IF EXISTS `sp_GetPublishedResults`;
DROP PROCEDURE IF EXISTS `sp_GetStudentSelfResults`;
DROP PROCEDURE IF EXISTS `sp_GetStudentSelfResultMemo`;
DROP PROCEDURE IF EXISTS `sp_GetExamScheduleSubjects`;

DELIMITER //

-- ------------------------------------------------------------------------------------
-- 1. sp_ProcessResults
-- Calculates student total marks, grades, PASS/FAIL statuses, and ranks
-- from active Marks and inserts/updates them in Results.
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_ProcessResults`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT,
    IN p_PublishDate DATETIME,
    IN p_CampusId INT)
BEGIN
    DECLARE v_PublishDate DATETIME;
    SET v_PublishDate = COALESCE(p_PublishDate, UTC_TIMESTAMP());

    -- 1. Delete any existing un-published results for this exam context before re-processing
    DELETE FROM `Results` 
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR CampusId = p_CampusId)
      AND ExamId = p_ExamId
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR GroupId = p_GroupId)
      AND IsPublished = 0;

    -- 2. Insert calculated results per student per subject from active Marks
    INSERT INTO `Results` (
        CampusId,
        StudentId,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        ExamId,
        SubjectId,
        InternalMarks,
        PracticalMarks,
        ExternalMarks,
        TotalMarks,
        Grade,
        ResultStatus,
        `Rank`,
        IsPublished,
        PublishedDate,
        CreatedAt,
        UpdatedAt
    )
    SELECT 
        COALESCE(p_CampusId, m.CampusId, 1) AS CampusId,
        m.StudentId,
        m.BoardId,
        m.AcademicYearId,
        m.AcademicLevelId,
        m.GroupId,
        m.ExaminationId AS ExamId,
        m.SubjectId,
        COALESCE(m.InternalMarks, 0.00),
        COALESCE(m.PracticalMarks, 0.00),
        COALESCE(m.TheoryMarks, 0.00) AS ExternalMarks,
        COALESCE(m.TotalMarks, 0.00),
        CASE 
            WHEN m.TotalMarks >= (COALESCE(s.TotalMarks, 100) * 0.90) THEN 'A+'
            WHEN m.TotalMarks >= (COALESCE(s.TotalMarks, 100) * 0.80) THEN 'A'
            WHEN m.TotalMarks >= (COALESCE(s.TotalMarks, 100) * 0.70) THEN 'B+'
            WHEN m.TotalMarks >= (COALESCE(s.TotalMarks, 100) * 0.60) THEN 'B'
            WHEN m.TotalMarks >= (COALESCE(s.TotalMarks, 100) * 0.50) THEN 'C'
            WHEN m.TotalMarks >= COALESCE(s.PassingMarks, m.PassingMarks, 35) THEN 'D'
            ELSE 'F'
        END AS Grade,
        CASE 
            WHEN m.IsAbsent = 1 THEN 'Fail'
            WHEN m.TotalMarks >= COALESCE(s.PassingMarks, m.PassingMarks, 35) THEN 'Pass'
            ELSE 'Fail'
        END AS ResultStatus,
        NULL AS `Rank`,
        0 AS IsPublished,
        NULL AS PublishedDate,
        UTC_TIMESTAMP() AS CreatedAt,
        NULL AS UpdatedAt
    FROM `Marks` m
    INNER JOIN `Subjects` s ON s.SubjectId = m.SubjectId
    WHERE m.ExaminationId = p_ExamId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR m.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR m.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR m.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR m.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR m.GroupId = p_GroupId)
      AND m.IsActive = 1
      AND NOT EXISTS (
          SELECT 1 FROM `Results` r 
          WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
            AND r.StudentId = m.StudentId 
            AND r.SubjectId = m.SubjectId 
            AND r.ExamId = m.ExaminationId
      );

    -- 3. Update computed group ranks using window function
    UPDATE `Results` r
    INNER JOIN (
        SELECT 
            r2.ResultId,
            DENSE_RANK() OVER (PARTITION BY r2.ExamId, r2.GroupId ORDER BY r2.TotalMarks DESC) AS ComputedRank
        FROM `Results` r2
        WHERE r2.ExamId = p_ExamId
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR r2.CampusId = p_CampusId)
    ) ranked ON ranked.ResultId = r.ResultId
    SET r.Rank = ranked.ComputedRank
    WHERE r.ExamId = p_ExamId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId);

    -- 4. Return processing summary metrics
    SELECT 
        COUNT(DISTINCT r.StudentId) AS ProcessedStudents,
        COUNT(DISTINCT CASE WHEN r.ResultStatus = 'Pass' THEN r.StudentId END) AS PassedStudents,
        COUNT(DISTINCT CASE WHEN r.ResultStatus = 'Fail' THEN r.StudentId END) AS FailedStudents,
        COALESCE(ROUND(
            COUNT(DISTINCT CASE WHEN r.ResultStatus = 'Pass' THEN r.StudentId END) * 100.0 / 
            NULLIF(COUNT(DISTINCT r.StudentId), 0), 2
        ), 0.00) AS PassPercentage,
        COALESCE(ROUND(AVG(r.TotalMarks), 2), 0.00) AS AverageMarks
    FROM `Results` r 
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND r.ExamId = p_ExamId
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR r.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR r.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR r.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR r.GroupId = p_GroupId);
END //

-- ------------------------------------------------------------------------------------
-- 2. sp_PublishResults
-- Publishes examination results for the selected academic context, group, or section
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_PublishResults`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_ExamId INT,
    IN p_PublishDate DATETIME,
    IN p_CampusId INT)
BEGIN
    DECLARE v_PubDate DATETIME;
    SET v_PubDate = COALESCE(p_PublishDate, UTC_TIMESTAMP());

    -- Update Results table
    UPDATE `Results` r
    SET r.IsPublished = 1,
        r.PublishedDate = v_PubDate,
        r.UpdatedAt = UTC_TIMESTAMP()
    WHERE r.ExamId = p_ExamId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR r.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR r.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR r.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR r.GroupId = p_GroupId)
      AND (
          p_SectionId IS NULL OR p_SectionId = 0 OR
          r.StudentId IN (SELECT s.StudentId FROM `Students` s WHERE s.SectionId = p_SectionId)
      );

    -- Update Marks table
    UPDATE `Marks` m
    SET m.IsPublished = 1,
        m.PublishedAt = v_PubDate,
        m.UpdatedAt = UTC_TIMESTAMP()
    WHERE m.ExaminationId = p_ExamId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR m.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR m.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR m.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR m.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR m.GroupId = p_GroupId)
      AND (
          p_SectionId IS NULL OR p_SectionId = 0 OR
          m.SectionId = p_SectionId OR
          m.StudentId IN (SELECT s.StudentId FROM `Students` s WHERE s.SectionId = p_SectionId)
      );

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- ------------------------------------------------------------------------------------
-- 3. sp_GetResults
-- Returns paginated results with 2 result sets: (1) TotalRecords, (2) Result Data
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetResults`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT,
    IN p_Search VARCHAR(150),
    IN p_PageNumber INT,
    IN p_PageSize INT,
    IN p_CampusId INT)
BEGIN
    DECLARE v_Offset INT DEFAULT 0;

    IF p_PageNumber IS NULL OR p_PageNumber < 1 THEN
        SET p_PageNumber = 1;
    END IF;

    IF p_PageSize IS NULL OR p_PageSize < 1 THEN
        SET p_PageSize = 10;
    END IF;

    SET v_Offset = (p_PageNumber - 1) * p_PageSize;

    -- Result Set 1: Total Records
    SELECT COUNT(DISTINCT r.StudentId) AS TotalRecords
    FROM `Results` r
    INNER JOIN `Students` s ON s.StudentId = r.StudentId
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR r.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR r.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR r.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR r.GroupId = p_GroupId)
      AND (p_ExamId IS NULL OR p_ExamId = 0 OR r.ExamId = p_ExamId)
      AND (
          p_Search IS NULL OR p_Search = '' OR
          s.StudentName LIKE CONCAT('%', p_Search, '%') OR
          s.RollNo LIKE CONCAT('%', p_Search, '%') OR
          s.AdmissionNo LIKE CONCAT('%', p_Search, '%')
      );

    -- Result Set 2: Paginated Result Rows
    SELECT 
        r.ResultId,
        r.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, s.AdmissionNo, CAST(r.StudentId AS CHAR)) AS RollNumber,
        r.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        r.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        r.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevel,
        r.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        r.ExamId,
        COALESCE(e.ExamName, '') AS ExamName,
        r.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        COALESCE(sub.SubjectCode, '') AS SubjectCode,
        r.InternalMarks,
        r.PracticalMarks,
        r.ExternalMarks,
        r.TotalMarks,
        COALESCE(sub.TotalMarks, 100) AS MaximumMarks,
        COALESCE(sub.PassingMarks, 35) AS PassingMarks,
        r.Grade,
        r.ResultStatus,
        r.Rank,
        r.IsPublished,
        r.PublishedDate,
        r.CreatedAt,
        r.UpdatedAt
    FROM `Results` r
    INNER JOIN `Students` s ON s.StudentId = r.StudentId
    LEFT JOIN `Boards` b ON b.BoardId = r.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = r.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = r.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = r.GroupId
    LEFT JOIN `Examinations` e ON e.ExamId = r.ExamId
    LEFT JOIN `Subjects` sub ON sub.SubjectId = r.SubjectId
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR r.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR r.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR r.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR r.GroupId = p_GroupId)
      AND (p_ExamId IS NULL OR p_ExamId = 0 OR r.ExamId = p_ExamId)
      AND (
          p_Search IS NULL OR p_Search = '' OR
          s.StudentName LIKE CONCAT('%', p_Search, '%') OR
          s.RollNo LIKE CONCAT('%', p_Search, '%') OR
          s.AdmissionNo LIKE CONCAT('%', p_Search, '%')
      )
    ORDER BY s.StudentName ASC, r.StudentId ASC, sub.SubjectName ASC
    LIMIT p_PageSize OFFSET v_Offset;
END //

-- ------------------------------------------------------------------------------------
-- 4. sp_GetStudentResult
-- Returns 3 result sets: (1) Summary, (2) Subject Marks, (3) Class Rank
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetStudentResult`(
    IN p_StudentId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT,
    IN p_CampusId INT)
BEGIN
    -- Result Set 1: Student Header & Overall Summary
    SELECT 
        s.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, s.AdmissionNo, CAST(s.StudentId AS CHAR)) AS RollNumber,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(p.ProgramName, 'Regular Academic') AS ProgramName,
        e.ExamId,
        COALESCE(e.ExamCode, '') AS ExamCode,
        COALESCE(e.ExamName, '') AS ExamName,
        SUM(IFNULL(r.TotalMarks, 0)) AS GrandTotal,
        SUM(IFNULL(sub.TotalMarks, 100)) AS MaximumMarks,
        COALESCE(ROUND(
            (SUM(IFNULL(r.TotalMarks, 0)) / NULLIF(SUM(IFNULL(sub.TotalMarks, 100)), 0)) * 100.0, 2
        ), 0.00) AS Percentage,
        CASE 
            WHEN (SUM(IFNULL(r.TotalMarks, 0)) / NULLIF(SUM(IFNULL(sub.TotalMarks, 100)), 0)) >= 0.90 THEN 'A+'
            WHEN (SUM(IFNULL(r.TotalMarks, 0)) / NULLIF(SUM(IFNULL(sub.TotalMarks, 100)), 0)) >= 0.80 THEN 'A'
            WHEN (SUM(IFNULL(r.TotalMarks, 0)) / NULLIF(SUM(IFNULL(sub.TotalMarks, 100)), 0)) >= 0.70 THEN 'B+'
            WHEN (SUM(IFNULL(r.TotalMarks, 0)) / NULLIF(SUM(IFNULL(sub.TotalMarks, 100)), 0)) >= 0.60 THEN 'B'
            WHEN (SUM(IFNULL(r.TotalMarks, 0)) / NULLIF(SUM(IFNULL(sub.TotalMarks, 100)), 0)) >= 0.50 THEN 'C'
            WHEN (SUM(IFNULL(r.TotalMarks, 0)) / NULLIF(SUM(IFNULL(sub.TotalMarks, 100)), 0)) >= 0.35 THEN 'D'
            ELSE 'F'
        END AS OverallGrade,
        CASE 
            WHEN EXISTS (SELECT 1 FROM `Results` rx WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR rx.CampusId = p_CampusId) AND rx.StudentId = p_StudentId AND rx.ExamId = p_ExamId AND rx.ResultStatus = 'Fail') THEN 'FAIL'
            ELSE 'PASS'
        END AS FinalResult,
        CASE 
            WHEN EXISTS (SELECT 1 FROM `Results` rx WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR rx.CampusId = p_CampusId) AND rx.StudentId = p_StudentId AND rx.ExamId = p_ExamId AND rx.ResultStatus = 'Fail') THEN 'Fail'
            ELSE 'Pass'
        END AS ResultStatus,
        MAX(r.IsPublished) AS IsPublished,
        MAX(r.PublishedDate) AS PublishedDate
    FROM `Results` r
    INNER JOIN `Students` s ON s.StudentId = r.StudentId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Groups` g ON g.GroupId = r.GroupId
    LEFT JOIN `Examinations` e ON e.ExamId = r.ExamId
    LEFT JOIN `Programs` p ON p.ProgramId = e.ProgramId
    LEFT JOIN `Subjects` sub ON sub.SubjectId = r.SubjectId
    WHERE r.StudentId = p_StudentId
      AND r.ExamId = p_ExamId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR r.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR r.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR r.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR r.GroupId = p_GroupId)
    GROUP BY s.StudentId, s.StudentName, s.RollNo, s.AdmissionNo, g.GroupName, sec.SectionName, p.ProgramName, e.ExamId, e.ExamCode, e.ExamName;

    -- Result Set 2: Subject-wise Marks
    SELECT 
        r.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        COALESCE(sub.SubjectCode, '') AS SubjectCode,
        r.InternalMarks,
        r.PracticalMarks,
        r.ExternalMarks,
        r.TotalMarks,
        COALESCE(sub.TotalMarks, 100) AS MaximumMarks,
        COALESCE(sub.PassingMarks, 35) AS PassingMarks,
        r.Grade,
        r.ResultStatus
    FROM `Results` r
    LEFT JOIN `Subjects` sub ON sub.SubjectId = r.SubjectId
    WHERE r.StudentId = p_StudentId
      AND r.ExamId = p_ExamId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR r.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR r.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR r.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR r.GroupId = p_GroupId)
    ORDER BY sub.SubjectName ASC;

    -- Result Set 3: Class Rank
    SELECT ClassRank
    FROM (
        SELECT 
            r.StudentId,
            DENSE_RANK() OVER (ORDER BY SUM(r.TotalMarks) DESC) AS ClassRank
        FROM `Results` r 
        WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
          AND r.ExamId = p_ExamId
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR r.BoardId = p_BoardId)
          AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR r.AcademicYearId = p_AcademicYearId)
          AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR r.AcademicLevelId = p_AcademicLevelId)
          AND (p_GroupId IS NULL OR p_GroupId = 0 OR r.GroupId = p_GroupId)
        GROUP BY r.StudentId
    ) ranks
    WHERE ranks.StudentId = p_StudentId
    LIMIT 1;
END //

-- ------------------------------------------------------------------------------------
-- 5. sp_GetRankList
-- Retrieves dense-ranked topper and student list
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetRankList`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT,
    IN p_CampusId INT)
BEGIN
    SELECT 
        DENSE_RANK() OVER (ORDER BY SUM(r.TotalMarks) DESC) AS `Rank`,
        r.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, s.AdmissionNo, CAST(r.StudentId AS CHAR)) AS RollNumber,
        COALESCE(s.RollNo, s.AdmissionNo, CAST(r.StudentId AS CHAR)) AS RollNo,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(p.ProgramName, 'Regular') AS ProgramName,
        SUM(r.TotalMarks) AS TotalMarks,
        SUM(r.TotalMarks) AS ObtainedMarks,
        COALESCE(ROUND(
            (SUM(r.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) * 100.0, 2
        ), 0.00) AS Percentage,
        CASE 
            WHEN (SUM(r.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.90 THEN 'A+'
            WHEN (SUM(r.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.80 THEN 'A'
            WHEN (SUM(r.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.70 THEN 'B+'
            WHEN (SUM(r.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.60 THEN 'B'
            WHEN (SUM(r.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.50 THEN 'C'
            WHEN (SUM(r.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.35 THEN 'D'
            ELSE 'F'
        END AS Grade,
        CASE 
            WHEN EXISTS (SELECT 1 FROM `Results` rx WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR rx.CampusId = p_CampusId) AND rx.StudentId = r.StudentId AND rx.ExamId = p_ExamId AND rx.ResultStatus = 'Fail') THEN 'FAIL'
            ELSE 'PASS'
        END AS Result,
        CASE 
            WHEN EXISTS (SELECT 1 FROM `Results` rx WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR rx.CampusId = p_CampusId) AND rx.StudentId = r.StudentId AND rx.ExamId = p_ExamId AND rx.ResultStatus = 'Fail') THEN 'Fail'
            ELSE 'Pass'
        END AS ResultStatus
    FROM `Results` r
    INNER JOIN `Students` s ON s.StudentId = r.StudentId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Groups` g ON g.GroupId = r.GroupId
    LEFT JOIN `Examinations` e ON e.ExamId = r.ExamId
    LEFT JOIN `Programs` p ON p.ProgramId = e.ProgramId
    LEFT JOIN `Subjects` sub ON sub.SubjectId = r.SubjectId
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR r.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR r.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR r.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR r.GroupId = p_GroupId)
      AND (p_ExamId IS NULL OR p_ExamId = 0 OR r.ExamId = p_ExamId)
    GROUP BY r.StudentId, s.StudentName, s.RollNo, s.AdmissionNo, g.GroupName, sec.SectionName, p.ProgramName
    ORDER BY TotalMarks DESC, s.StudentName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 6. sp_GetFailedStudents
-- Retrieves list of failed students for an exam context
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetFailedStudents`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT,
    IN p_CampusId INT)
BEGIN
    SELECT 
        r.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, s.AdmissionNo, CAST(r.StudentId AS CHAR)) AS RollNumber,
        COALESCE(s.RollNo, s.AdmissionNo, CAST(r.StudentId AS CHAR)) AS RollNo,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        COALESCE(g.GroupName, '') AS GroupName,
        r.ExamId,
        COALESCE(e.ExamName, '') AS ExamName,
        SUM(r.TotalMarks) AS GrandTotal,
        'FAIL' AS FinalResult,
        'Fail' AS ResultStatus,
        MAX(r.IsPublished) AS IsPublished,
        MAX(r.PublishedDate) AS PublishedDate
    FROM `Results` r
    INNER JOIN `Students` s ON s.StudentId = r.StudentId
    LEFT JOIN `Groups` g ON g.GroupId = r.GroupId
    LEFT JOIN `Examinations` e ON e.ExamId = r.ExamId
    WHERE r.ResultStatus IN ('Fail', 'FAIL')
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR r.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR r.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR r.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR r.GroupId = p_GroupId)
      AND (p_ExamId IS NULL OR p_ExamId = 0 OR r.ExamId = p_ExamId)
    GROUP BY r.StudentId, s.StudentName, s.RollNo, s.AdmissionNo, g.GroupName, r.ExamId, e.ExamName
    ORDER BY s.StudentName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 7. sp_GetResultStatistics
-- Calculates overall statistical metrics with proper operator precedence
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetResultStatistics`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT,
    IN p_CampusId INT)
BEGIN
    SELECT 
        COUNT(DISTINCT r.StudentId) AS TotalStudents,
        COUNT(DISTINCT CASE WHEN r.ResultStatus IN ('Pass', 'PASS') THEN r.StudentId END) AS PassedStudents,
        COUNT(DISTINCT CASE WHEN r.ResultStatus IN ('Fail', 'FAIL') THEN r.StudentId END) AS FailedStudents,
        COALESCE(ROUND(
            COUNT(DISTINCT CASE WHEN r.ResultStatus IN ('Pass', 'PASS') THEN r.StudentId END) * 100.0 / 
            NULLIF(COUNT(DISTINCT r.StudentId), 0), 2
        ), 0.00) AS PassPercentage,
        COALESCE(ROUND(AVG(r.TotalMarks), 2), 0.00) AS AverageMarks,
        COALESCE(MAX(r.TotalMarks), 0.00) AS HighestMarks,
        COALESCE(MIN(r.TotalMarks), 0.00) AS LowestMarks,
        COUNT(DISTINCT CASE WHEN r.TotalMarks >= 75 THEN r.StudentId END) AS DistinctionCount,
        COUNT(DISTINCT CASE WHEN r.TotalMarks >= 60 AND r.TotalMarks < 75 THEN r.StudentId END) AS FirstClassCount,
        COUNT(DISTINCT CASE WHEN r.TotalMarks >= 50 AND r.TotalMarks < 60 THEN r.StudentId END) AS SecondClassCount,
        COUNT(DISTINCT CASE WHEN r.TotalMarks >= 35 AND r.TotalMarks < 50 THEN r.StudentId END) AS ThirdClassCount
    FROM `Results` r 
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR r.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR r.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR r.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR r.GroupId = p_GroupId)
      AND (p_ExamId IS NULL OR p_ExamId = 0 OR r.ExamId = p_ExamId);
END //

-- ------------------------------------------------------------------------------------
-- 8. sp_GetResultAnalysis
-- Analyzes results by overall performance and subject breakdown
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetResultAnalysis`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT,
    IN p_CampusId INT)
BEGIN
    -- Result Set 1: Overall Analysis
    SELECT 
        COUNT(DISTINCT r.StudentId) AS TotalStudents,
        COUNT(DISTINCT CASE WHEN r.ResultStatus IN ('Pass', 'PASS') THEN r.StudentId END) AS PassedStudents,
        COUNT(DISTINCT CASE WHEN r.ResultStatus IN ('Fail', 'FAIL') THEN r.StudentId END) AS FailedStudents,
        COALESCE(ROUND(
            COUNT(DISTINCT CASE WHEN r.ResultStatus IN ('Pass', 'PASS') THEN r.StudentId END) * 100.0 / 
            NULLIF(COUNT(DISTINCT r.StudentId), 0), 2
        ), 0.00) AS PassPercentage,
        COALESCE(ROUND(AVG(r.TotalMarks), 2), 0.00) AS AverageMarks,
        COALESCE(MAX(r.TotalMarks), 0.00) AS HighestMarks,
        COALESCE(MIN(r.TotalMarks), 0.00) AS LowestMarks
    FROM `Results` r 
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR r.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR r.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR r.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR r.GroupId = p_GroupId)
      AND (p_ExamId IS NULL OR p_ExamId = 0 OR r.ExamId = p_ExamId);

    -- Result Set 2: Subject-wise Analysis
    SELECT 
        r.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        COALESCE(sub.SubjectCode, '') AS SubjectCode,
        COUNT(r.ResultId) AS TotalStudents,
        COUNT(CASE WHEN r.ResultStatus IN ('Pass', 'PASS') THEN 1 END) AS PassedStudents,
        COUNT(CASE WHEN r.ResultStatus IN ('Fail', 'FAIL') THEN 1 END) AS FailedStudents,
        COALESCE(ROUND(
            COUNT(CASE WHEN r.ResultStatus IN ('Pass', 'PASS') THEN 1 END) * 100.0 / 
            NULLIF(COUNT(r.ResultId), 0), 2
        ), 0.00) AS PassPercentage,
        COALESCE(ROUND(AVG(r.TotalMarks), 2), 0.00) AS AverageMarks,
        COALESCE(MAX(r.TotalMarks), 0.00) AS HighestMarks,
        COALESCE(MIN(r.TotalMarks), 0.00) AS LowestMarks
    FROM `Results` r
    LEFT JOIN `Subjects` sub ON sub.SubjectId = r.SubjectId
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR r.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR r.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR r.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR r.GroupId = p_GroupId)
      AND (p_ExamId IS NULL OR p_ExamId = 0 OR r.ExamId = p_ExamId)
    GROUP BY r.SubjectId, sub.SubjectName, sub.SubjectCode
    ORDER BY sub.SubjectName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 9. sp_DownloadMemo
-- Retrieves printable result memo items for a student
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_DownloadMemo`(
    IN p_StudentId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT,
    IN p_CampusId INT)
BEGIN
    SELECT 
        r.ResultId,
        r.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, s.AdmissionNo, CAST(r.StudentId AS CHAR)) AS RollNumber,
        r.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        r.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        r.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevel,
        r.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        r.ExamId,
        COALESCE(e.ExamName, '') AS ExamName,
        r.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        COALESCE(sub.SubjectCode, '') AS SubjectCode,
        r.InternalMarks,
        r.PracticalMarks,
        r.ExternalMarks,
        r.TotalMarks,
        COALESCE(sub.TotalMarks, 100) AS MaximumMarks,
        COALESCE(sub.PassingMarks, 35) AS PassingMarks,
        r.Grade,
        r.ResultStatus,
        r.Rank,
        r.IsPublished,
        r.PublishedDate,
        r.CreatedAt,
        r.UpdatedAt
    FROM `Results` r
    INNER JOIN `Students` s ON s.StudentId = r.StudentId
    LEFT JOIN `Boards` b ON b.BoardId = r.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = r.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = r.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = r.GroupId
    LEFT JOIN `Examinations` e ON e.ExamId = r.ExamId
    LEFT JOIN `Subjects` sub ON sub.SubjectId = r.SubjectId
    WHERE r.StudentId = p_StudentId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR r.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR r.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR r.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR r.GroupId = p_GroupId)
      AND (p_ExamId IS NULL OR p_ExamId = 0 OR r.ExamId = p_ExamId)
    ORDER BY sub.SubjectName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 10. sp_RequestRevaluation
-- Submits a student revaluation request
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_RequestRevaluation`(
    IN p_ResultId INT,
    IN p_StudentId INT,
    IN p_SubjectId INT,
    IN p_Reason VARCHAR(500),
    IN p_CampusId INT)
BEGIN
    DECLARE v_OldMarks DECIMAL(5,2);

    SELECT TotalMarks INTO v_OldMarks
    FROM `Results`
    WHERE ResultId = p_ResultId;

    INSERT INTO `Revaluations` (
        ResultId,
        StudentId,
        SubjectId,
        Reason,
        OldMarks,
        NewMarks,
        FeePaid,
        RequestedDate,
        ReviewedBy,
        ReviewedDate,
        Status,
        Remarks,
        CreatedAt,
        UpdatedAt
    ) VALUES (
        p_ResultId,
        p_StudentId,
        p_SubjectId,
        COALESCE(p_Reason, 'Revaluation requested by student'),
        COALESCE(v_OldMarks, 0.00),
        NULL,
        1,
        UTC_TIMESTAMP(),
        NULL,
        NULL,
        'Pending',
        NULL,
        UTC_TIMESTAMP(),
        NULL
    );

    SELECT LAST_INSERT_ID() AS RevaluationId;
END //

-- ------------------------------------------------------------------------------------
-- 11. sp_GetRevaluationStatus
-- Retrieves revaluation status details
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetRevaluationStatus`(
    IN p_RevaluationId INT,
    IN p_CampusId INT)
BEGIN
    SELECT 
        rev.RevaluationId,
        rev.ResultId,
        rev.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, s.AdmissionNo, CAST(rev.StudentId AS CHAR)) AS RollNumber,
        rev.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        COALESCE(sub.SubjectCode, '') AS SubjectCode,
        rev.Reason,
        rev.OldMarks,
        rev.NewMarks,
        rev.FeePaid,
        rev.RequestedDate,
        rev.ReviewedBy,
        COALESCE(u.Username, '') AS ReviewerName,
        rev.ReviewedDate,
        rev.Status,
        rev.Remarks,
        rev.CreatedAt,
        rev.UpdatedAt
    FROM `Revaluations` rev
    LEFT JOIN `Students` s ON s.StudentId = rev.StudentId
    LEFT JOIN `Subjects` sub ON sub.SubjectId = rev.SubjectId
    LEFT JOIN `Users` u ON u.UserId = rev.ReviewedBy
    WHERE rev.RevaluationId = p_RevaluationId;
END //

-- ------------------------------------------------------------------------------------
-- 12. sp_GetResultDashboard
-- Computes dashboard metrics directly from Marks and Results
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetResultDashboard`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT,
    IN p_CampusId INT)
BEGIN
    SELECT 
        COUNT(DISTINCT m.StudentId) AS TotalResults,
        COUNT(DISTINCT m.StudentId) AS TotalStudents,
        COUNT(DISTINCT CASE WHEN r.ResultId IS NOT NULL THEN m.StudentId END) AS ProcessedResults,
        COUNT(DISTINCT CASE WHEN r.ResultId IS NOT NULL THEN m.StudentId END) AS ProcessedStudents,
        COUNT(DISTINCT CASE WHEN r.ResultId IS NULL THEN m.StudentId END) AS PendingResults,
        COUNT(DISTINCT CASE WHEN r.ResultId IS NULL THEN m.StudentId END) AS PendingStudents,
        COUNT(DISTINCT CASE WHEN r.IsPublished = 1 THEN r.StudentId END) AS PublishedResults,
        COUNT(DISTINCT CASE WHEN r.IsPublished = 1 THEN r.StudentId END) AS PublishedStudents,
        COUNT(DISTINCT CASE WHEN r.ResultStatus IN ('Pass', 'PASS') THEN r.StudentId END) AS PassedStudents,
        COUNT(DISTINCT CASE WHEN r.ResultStatus IN ('Fail', 'FAIL') THEN r.StudentId END) AS FailedStudents,
        COALESCE(ROUND(
            COUNT(DISTINCT CASE WHEN r.ResultStatus IN ('Pass', 'PASS') THEN r.StudentId END) * 100.0 / 
            NULLIF(COUNT(DISTINCT CASE WHEN r.IsPublished = 1 THEN r.StudentId END), 0), 2
        ), 0.00) AS PassPercentage,
        COALESCE(ROUND(AVG(r.TotalMarks), 2), 0.00) AS AverageMarks,
        COALESCE(MAX(r.TotalMarks), 0.00) AS HighestMarks,
        COALESCE(MIN(r.TotalMarks), 0.00) AS LowestMarks
    FROM `Marks` m
    LEFT JOIN `Results` r
        ON r.StudentId = m.StudentId
        AND r.BoardId = m.BoardId
        AND r.AcademicYearId = m.AcademicYearId
        AND r.AcademicLevelId = m.AcademicLevelId
        AND r.GroupId = m.GroupId
        AND r.ExamId = m.ExaminationId
        AND r.SubjectId = m.SubjectId
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR m.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR m.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR m.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR m.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR m.GroupId = p_GroupId)
      AND (p_ExamId IS NULL OR p_ExamId = 0 OR m.ExaminationId = p_ExamId)
      AND m.IsActive = 1;
END //

-- ------------------------------------------------------------------------------------
-- 13. sp_UpdateResult
-- Updates student result marks and recalculates total, grade, and status
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_UpdateResult`(
    IN p_ResultId INT,
    IN p_InternalMarks DECIMAL(5,2),
    IN p_PracticalMarks DECIMAL(5,2),
    IN p_ExternalMarks DECIMAL(5,2),
    IN p_UpdatedAt DATETIME,
    IN p_CampusId INT)
BEGIN
    DECLARE v_TotalMarks DECIMAL(5,2);
    DECLARE v_PassingMarks INT;
    DECLARE v_MaxMarks INT;

    SET v_TotalMarks = IFNULL(p_InternalMarks, 0) + IFNULL(p_PracticalMarks, 0) + IFNULL(p_ExternalMarks, 0);

    SELECT 
        COALESCE(s.PassingMarks, 35),
        COALESCE(s.TotalMarks, 100)
    INTO v_PassingMarks, v_MaxMarks
    FROM `Results` r
    LEFT JOIN `Subjects` s ON s.SubjectId = r.SubjectId
    WHERE r.ResultId = p_ResultId;

    UPDATE `Results` SET InternalMarks = IFNULL(p_InternalMarks, InternalMarks),
        PracticalMarks = IFNULL(p_PracticalMarks, PracticalMarks),
        ExternalMarks = IFNULL(p_ExternalMarks, ExternalMarks),
        TotalMarks = v_TotalMarks,
        Grade = CASE 
            WHEN v_TotalMarks >= (v_MaxMarks * 0.90) THEN 'A+'
            WHEN v_TotalMarks >= (v_MaxMarks * 0.80) THEN 'A'
            WHEN v_TotalMarks >= (v_MaxMarks * 0.70) THEN 'B+'
            WHEN v_TotalMarks >= (v_MaxMarks * 0.60) THEN 'B'
            WHEN v_TotalMarks >= (v_MaxMarks * 0.50) THEN 'C'
            WHEN v_TotalMarks >= v_PassingMarks THEN 'D'
            ELSE 'F'
        END,
        ResultStatus = CASE 
            WHEN v_TotalMarks >= v_PassingMarks THEN 'Pass'
            ELSE 'Fail'
        END,
        UpdatedAt = COALESCE(p_UpdatedAt, UTC_TIMESTAMP())
    WHERE ResultId = p_ResultId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR CampusId = p_CampusId);

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- ------------------------------------------------------------------------------------
-- 14. sp_DownloadResultsPdf
-- Retrieves result records formatted for PDF/Excel export
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_DownloadResultsPdf`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT,
    IN p_CampusId INT)
BEGIN
    SELECT 
        r.ResultId,
        r.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, s.AdmissionNo, CAST(r.StudentId AS CHAR)) AS RollNumber,
        COALESCE(s.RollNo, s.AdmissionNo, CAST(r.StudentId AS CHAR)) AS RollNo,
        COALESCE(b.BoardName, '') AS BoardName,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        COALESCE(al.LevelName, '') AS AcademicLevel,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(p.ProgramName, 'Regular') AS ProgramName,
        COALESCE(e.ExamName, '') AS ExamName,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        COALESCE(sub.SubjectCode, '') AS SubjectCode,
        r.InternalMarks,
        r.PracticalMarks,
        r.ExternalMarks,
        r.TotalMarks,
        COALESCE(sub.TotalMarks, 100) AS MaximumMarks,
        COALESCE(sub.PassingMarks, 35) AS PassingMarks,
        r.Grade,
        r.ResultStatus,
        r.Rank,
        r.IsPublished,
        r.PublishedDate
    FROM `Results` r
    INNER JOIN `Students` s ON s.StudentId = r.StudentId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Boards` b ON b.BoardId = r.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = r.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = r.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = r.GroupId
    LEFT JOIN `Examinations` e ON e.ExamId = r.ExamId
    LEFT JOIN `Programs` p ON p.ProgramId = e.ProgramId
    LEFT JOIN `Subjects` sub ON sub.SubjectId = r.SubjectId
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR r.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR r.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR r.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR r.GroupId = p_GroupId)
      AND (p_ExamId IS NULL OR p_ExamId = 0 OR r.ExamId = p_ExamId)
    ORDER BY s.StudentName ASC, r.StudentId ASC, sub.SubjectName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 15. sp_GetSectionResultSummaries
-- Aggregates results by section directly in MySQL for SectionResultSummaryDto
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetSectionResultSummaries`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT,
    IN p_CampusId INT)
BEGIN
    SELECT 
        sec.SectionId AS Id,
        COALESCE(sec.SectionName, CONCAT('Section-', sec.SectionId)) AS Name,
        COALESCE(sec.InchargeId, 1) AS InChargeId,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), CONCAT(fc.FirstName, ' ', fc.LastName), '—') AS InChargeName,
        COUNT(DISTINCT m.StudentId) AS Count,
        COUNT(DISTINCT CASE WHEN m.TotalMarks >= COALESCE(m.PassingMarks, 35) THEN m.StudentId END) AS Passed,
        COUNT(DISTINCT CASE WHEN m.TotalMarks < COALESCE(m.PassingMarks, 35) OR m.IsAbsent = 1 THEN m.StudentId END) AS Failed,
        COALESCE(ROUND(
            COUNT(DISTINCT CASE WHEN m.TotalMarks >= COALESCE(m.PassingMarks, 35) THEN m.StudentId END) * 100.0 /
            NULLIF(COUNT(DISTINCT m.StudentId), 0), 2
        ), 0.00) AS PassRate,
        COALESCE(ROUND(AVG(m.TotalMarks), 2), 0.00) AS Average,
        CASE WHEN MIN(m.IsPublished) = 1 THEN 'PUBLISHED' ELSE 'GENERATED' END AS ResultStatus,
        CASE WHEN MIN(m.IsPublished) = 1 THEN 1 ELSE 0 END AS IsPublished
    FROM `Marks` m
    INNER JOIN `Sections` sec ON sec.SectionId = m.SectionId
    LEFT JOIN `Staffs` st ON st.Id = sec.InchargeId
    LEFT JOIN `Faculties` fc ON fc.Id = sec.InchargeId
    WHERE m.ExaminationId = p_ExamId
      AND m.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR m.CampusId = p_CampusId OR sec.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR m.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR m.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR m.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR m.GroupId = p_GroupId)
    GROUP BY sec.SectionId, sec.SectionName, sec.InchargeId, st.FirstName, st.LastName, fc.FirstName, fc.LastName
    ORDER BY sec.SectionName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 16. sp_GetSectionResultDetail
-- Returns 3 result sets for section detail view:
-- (1) Section & Exam Header Info, (2) Subject Definitions, (3) Student Marks Rows
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetSectionResultDetail`(
    IN p_SectionId INT,
    IN p_ExamId INT,
    IN p_CampusId INT)
BEGIN
    -- Result Set 1: Header
    SELECT 
        sec.SectionId,
        COALESCE(sec.SectionName, CONCAT('Section-', p_SectionId)) AS SectionName,
        e.ExamId,
        COALESCE(e.ExamName, '') AS ExamName,
        COALESCE(g.GroupName, 'MPC') AS GroupName,
        COALESCE(p.ProgramName, 'Regular Academic') AS ProgramName,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), CONCAT(fc.FirstName, ' ', fc.LastName), '—') AS InChargeName,
        COUNT(DISTINCT m.StudentId) AS TotalStudents,
        CASE WHEN MIN(m.IsPublished) = 1 THEN 'PUBLISHED' ELSE 'GENERATED' END AS ResultStatus,
        CASE WHEN MIN(m.IsPublished) = 1 THEN 1 ELSE 0 END AS IsPublished
    FROM `Marks` m
    LEFT JOIN `Sections` sec ON sec.SectionId = m.SectionId
    LEFT JOIN `Examinations` e ON e.ExamId = m.ExaminationId
    LEFT JOIN `Groups` g ON g.GroupId = m.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = e.ProgramId
    LEFT JOIN `Staffs` st ON st.Id = sec.InchargeId
    LEFT JOIN `Faculties` fc ON fc.Id = sec.InchargeId
    WHERE m.SectionId = p_SectionId
      AND m.ExaminationId = p_ExamId
      AND m.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR m.CampusId = p_CampusId)
    GROUP BY sec.SectionId, sec.SectionName, e.ExamId, e.ExamName, g.GroupName, p.ProgramName, st.FirstName, st.LastName, fc.FirstName, fc.LastName;

    -- Result Set 2: Subject Definitions
    SELECT DISTINCT
        sub.SubjectId,
        COALESCE(sub.SubjectName, CONCAT('Subject-', sub.SubjectId)) AS SubjectName,
        COALESCE(sub.SubjectCode, CONCAT('SUB', LPAD(sub.SubjectId, 3, '0'))) AS SubjectCode,
        COALESCE(sub.SubjectCode, CONCAT('S', sub.SubjectId)) AS ShortName,
        CASE WHEN sub.Practical = 1 OR LOWER(COALESCE(sub.SubjectType, '')) = 'practical' THEN 1 ELSE 0 END AS IsPractical,
        COALESCE(sub.TotalMarks, 100.00) AS MaxMarks
    FROM `Marks` m
    INNER JOIN `Subjects` sub ON sub.SubjectId = m.SubjectId
    WHERE m.SectionId = p_SectionId
      AND m.ExaminationId = p_ExamId
      AND m.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR m.CampusId = p_CampusId)
    ORDER BY sub.SubjectName ASC;

    -- Result Set 3: Student Marks
    SELECT 
        m.StudentId,
        COALESCE(s.RollNo, m.RollNo, CONCAT('ROLL', LPAD(m.StudentId, 3, '0'))) AS RollNo,
        COALESCE(s.StudentName, m.StudentName, 'Student') AS StudentName,
        m.BoardId,
        m.AcademicYearId AS YearId,
        m.AcademicLevelId AS LevelId,
        m.GroupId,
        m.SectionId,
        m.ExaminationId,
        m.SubjectId,
        COALESCE(sub.SubjectName, CONCAT('Subject-', m.SubjectId)) AS SubjectName,
        COALESCE(sub.SubjectCode, CONCAT('SUB', LPAD(m.SubjectId, 3, '0'))) AS SubjectCode,
        m.InternalMarks,
        m.PracticalMarks,
        m.TheoryMarks,
        m.TotalMarks,
        COALESCE(sub.TotalMarks, 100.00) AS SubjectMaxMarks,
        COALESCE(sub.PassingMarks, 35.00) AS PassingMarks,
        m.IsPublished
    FROM `Marks` m
    LEFT JOIN `Students` s ON s.StudentId = m.StudentId
    LEFT JOIN `Subjects` sub ON sub.SubjectId = m.SubjectId
    WHERE m.SectionId = p_SectionId
      AND m.ExaminationId = p_ExamId
      AND m.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR m.CampusId = p_CampusId)
    ORDER BY s.StudentName ASC, m.StudentId ASC, sub.SubjectName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 17. sp_GetPublishedResults
-- Returns published exam groups and section breakdowns directly from DB
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetPublishedResults`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_CampusId INT)
BEGIN
    -- Result Set 1: Exam Groups
    SELECT 
        ((m.ExaminationId * 10000) + m.GroupId) AS PublishedId,
        m.ExaminationId AS ExamId,
        COALESCE(e.ExamName, CONCAT('Exam ', m.ExaminationId)) AS ExamName,
        COALESCE(e.ExamCode, '') AS ExamCode,
        m.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        m.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYear,
        m.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevel,
        m.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(e.ProgramId, 1) AS ProgramId,
        COALESCE(p.ProgramName, 'Regular Academic') AS ProgramName,
        COUNT(DISTINCT m.StudentId) AS TotalStudents,
        COUNT(DISTINCT CASE WHEN m.TotalMarks >= COALESCE(m.PassingMarks, 35) THEN m.StudentId END) AS Passed,
        COUNT(DISTINCT CASE WHEN m.TotalMarks < COALESCE(m.PassingMarks, 35) OR m.IsAbsent = 1 THEN m.StudentId END) AS Failed,
        COALESCE(ROUND(
            COUNT(DISTINCT CASE WHEN m.TotalMarks >= COALESCE(m.PassingMarks, 35) THEN m.StudentId END) * 100.0 /
            NULLIF(COUNT(DISTINCT m.StudentId), 0), 2
        ), 0.00) AS PassRate,
        'PUBLISHED' AS ResultStatus,
        MAX(m.PublishedAt) AS PublishedDate
    FROM `Marks` m
    LEFT JOIN `Examinations` e ON e.ExamId = m.ExaminationId
    LEFT JOIN `Boards` b ON b.BoardId = m.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = m.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = m.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = m.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = e.ProgramId
    WHERE m.IsActive = 1
      AND m.IsPublished = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR m.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR m.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR m.AcademicYearId = p_AcademicYearId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR m.GroupId = p_GroupId)
    GROUP BY m.ExaminationId, e.ExamName, e.ExamCode, m.BoardId, b.BoardName, m.AcademicYearId, ay.AcademicYearName,
             m.AcademicLevelId, al.LevelName, m.GroupId, g.GroupName, e.ProgramId, p.ProgramName
    ORDER BY MAX(m.PublishedAt) DESC, e.ExamName ASC;

    -- Result Set 2: Section Breakdown for published exams
    SELECT 
        m.ExaminationId AS ExamId,
        m.GroupId,
        sec.SectionId AS Id,
        COALESCE(sec.SectionName, CONCAT('Section-', sec.SectionId)) AS Name,
        COALESCE(sec.InchargeId, 1) AS InChargeId,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), CONCAT(fc.FirstName, ' ', fc.LastName), '—') AS InChargeName,
        COUNT(DISTINCT m.StudentId) AS Count,
        COUNT(DISTINCT CASE WHEN m.TotalMarks >= COALESCE(m.PassingMarks, 35) THEN m.StudentId END) AS Passed,
        COUNT(DISTINCT CASE WHEN m.TotalMarks < COALESCE(m.PassingMarks, 35) OR m.IsAbsent = 1 THEN m.StudentId END) AS Failed,
        COALESCE(ROUND(
            COUNT(DISTINCT CASE WHEN m.TotalMarks >= COALESCE(m.PassingMarks, 35) THEN m.StudentId END) * 100.0 /
            NULLIF(COUNT(DISTINCT m.StudentId), 0), 2
        ), 0.00) AS PassRate,
        COALESCE(ROUND(AVG(m.TotalMarks), 2), 0.00) AS Average,
        'PUBLISHED' AS ResultStatus,
        1 AS IsPublished
    FROM `Marks` m
    INNER JOIN `Sections` sec ON sec.SectionId = m.SectionId
    LEFT JOIN `Staffs` st ON st.Id = sec.InchargeId
    LEFT JOIN `Faculties` fc ON fc.Id = sec.InchargeId
    WHERE m.IsActive = 1
      AND m.IsPublished = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR m.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR m.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR m.AcademicYearId = p_AcademicYearId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR m.GroupId = p_GroupId)
    GROUP BY m.ExaminationId, m.GroupId, sec.SectionId, sec.SectionName, sec.InchargeId, st.FirstName, st.LastName, fc.FirstName, fc.LastName
    ORDER BY sec.SectionName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 18. sp_GetStudentSelfResults
-- Retrieves all published results for authenticated student
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetStudentSelfResults`(
    IN p_StudentId INT)
BEGIN
    SELECT 
        MIN(m.MarkId) AS ResultId,
        m.ExaminationId,
        COALESCE(e.ExamName, CONCAT('Exam #', m.ExaminationId)) AS ExaminationName,
        COALESCE(e.ExamCode, '') AS ExamCode,
        COALESCE(ay.AcademicYearName, '') AS AcademicYear,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        SUM(m.TotalMarks) AS TotalMarks,
        COALESCE(NULLIF(SUM(sub.TotalMarks), 0), COUNT(m.MarkId) * 100.00) AS MaxTotalMarks,
        COALESCE(ROUND(
            (SUM(m.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) * 100.0, 2
        ), 0.00) AS Percentage,
        CASE 
            WHEN (SUM(m.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.90 THEN 'A+'
            WHEN (SUM(m.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.80 THEN 'A'
            WHEN (SUM(m.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.70 THEN 'B+'
            WHEN (SUM(m.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.60 THEN 'B'
            WHEN (SUM(m.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.50 THEN 'C'
            WHEN (SUM(m.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.35 THEN 'D'
            ELSE 'F'
        END AS Grade,
        CASE 
            WHEN (SUM(m.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= (COALESCE(e.PassPercentage, 35) / 100.0) THEN 'PASS'
            ELSE 'FAIL'
        END AS ResultStatus,
        1 AS IsPublished,
        MAX(m.PublishedAt) AS PublishedAt
    FROM `Marks` m
    LEFT JOIN `Examinations` e ON e.ExamId = m.ExaminationId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = m.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = m.GroupId
    LEFT JOIN `Sections` sec ON sec.SectionId = m.SectionId
    LEFT JOIN `Subjects` sub ON sub.SubjectId = m.SubjectId
    WHERE m.StudentId = p_StudentId
      AND m.IsActive = 1
      AND m.IsPublished = 1
    GROUP BY m.ExaminationId, e.ExamName, e.ExamCode, e.PassPercentage, ay.AcademicYearName, g.GroupName, sec.SectionName
    ORDER BY MAX(m.PublishedAt) DESC, m.ExaminationId DESC;
END //

-- ------------------------------------------------------------------------------------
-- 19. sp_GetStudentSelfResultMemo
-- Retrieves full memo for authenticated student for an exam
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetStudentSelfResultMemo`(
    IN p_StudentId INT,
    IN p_ExaminationId INT)
BEGIN
    -- Result Set 1: Header
    SELECT 
        s.StudentId,
        COALESCE(s.RollNo, CONCAT('STU-', LPAD(p_StudentId, 4, '0'))) AS RollNo,
        COALESCE(s.StudentName, CONCAT('Student #', p_StudentId)) AS StudentName,
        '' AS FatherName,
        COALESCE(e.ExamName, '') AS ExaminationName,
        COALESCE(e.ExamCode, '') AS ExamCode,
        COALESCE(ay.AcademicYearName, '') AS AcademicYear,
        COALESCE(g.GroupName, '') AS CourseName,
        COALESCE(sec.SectionName, '') AS SectionName,
        SUM(m.TotalMarks) AS TotalMarks,
        COALESCE(NULLIF(SUM(sub.TotalMarks), 0), COUNT(m.MarkId) * 100.00) AS MaxTotalMarks,
        COALESCE(ROUND(
            (SUM(m.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) * 100.0, 2
        ), 0.00) AS Percentage,
        CASE 
            WHEN (SUM(m.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.90 THEN 'A+'
            WHEN (SUM(m.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.80 THEN 'A'
            WHEN (SUM(m.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.70 THEN 'B+'
            WHEN (SUM(m.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.60 THEN 'B'
            WHEN (SUM(m.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.50 THEN 'C'
            WHEN (SUM(m.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= 0.35 THEN 'D'
            ELSE 'F'
        END AS Grade,
        CASE 
            WHEN (SUM(m.TotalMarks) / NULLIF(SUM(COALESCE(sub.TotalMarks, 100)), 0)) >= (COALESCE(e.PassPercentage, 35) / 100.0) THEN 'PASS'
            ELSE 'FAIL'
        END AS ResultStatus
    FROM `Marks` m
    INNER JOIN `Students` s ON s.StudentId = m.StudentId
    LEFT JOIN `Examinations` e ON e.ExamId = m.ExaminationId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = m.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = m.GroupId
    LEFT JOIN `Sections` sec ON sec.SectionId = m.SectionId
    LEFT JOIN `Subjects` sub ON sub.SubjectId = m.SubjectId
    WHERE m.StudentId = p_StudentId
      AND m.ExaminationId = p_ExaminationId
      AND m.IsActive = 1
      AND m.IsPublished = 1
    GROUP BY s.StudentId, s.RollNo, s.StudentName, e.ExamName, e.ExamCode, e.PassPercentage, ay.AcademicYearName, g.GroupName, sec.SectionName;

    -- Result Set 2: Subject Rows
    SELECT 
        m.SubjectId,
        COALESCE(sub.SubjectCode, CONCAT('SUB', LPAD(m.SubjectId, 3, '0'))) AS SubjectCode,
        COALESCE(sub.SubjectName, CONCAT('Subject #', m.SubjectId)) AS SubjectName,
        COALESCE(sub.TotalMarks, 100.00) AS MaxMarks,
        COALESCE(sub.PassingMarks, 35.00) AS PassingMarks,
        m.InternalMarks,
        m.PracticalMarks,
        m.TheoryMarks,
        m.TotalMarks,
        CASE WHEN m.TotalMarks >= COALESCE(sub.PassingMarks, 35) THEN 'PASS' ELSE 'FAIL' END AS ResultStatus
    FROM `Marks` m
    LEFT JOIN `Subjects` sub ON sub.SubjectId = m.SubjectId
    WHERE m.StudentId = p_StudentId
      AND m.ExaminationId = p_ExaminationId
      AND m.IsActive = 1
      AND m.IsPublished = 1
    ORDER BY sub.SubjectName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 20. sp_GetExamScheduleSubjects
-- Retrieves all scheduled subject IDs for an exam (replaces inline SQL)
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetExamScheduleSubjects`(
    IN p_ExamId INT)
BEGIN
    SELECT DISTINCT SubjectId
    FROM (
        SELECT SubjectId FROM `ExamSchedules` WHERE ExamId = p_ExamId AND IsActive = 1 AND SubjectId > 0
        UNION
        SELECT CAST(TRIM(j.val) AS UNSIGNED) AS SubjectId
        FROM `ExamSchedules` es
        CROSS JOIN JSON_TABLE(
            CASE 
                WHEN es.IncludedSubjectIds IS NOT NULL AND es.IncludedSubjectIds != '' 
                THEN CONCAT('["', REPLACE(es.IncludedSubjectIds, ',', '","'), '"]')
                ELSE '[]'
            END,
            '$[*]' COLUMNS (val VARCHAR(50) PATH '$')
        ) j
        WHERE es.ExamId = p_ExamId AND es.IsActive = 1 AND TRIM(j.val) != ''
    ) subj
    WHERE SubjectId > 0;
END //

DELIMITER ;
