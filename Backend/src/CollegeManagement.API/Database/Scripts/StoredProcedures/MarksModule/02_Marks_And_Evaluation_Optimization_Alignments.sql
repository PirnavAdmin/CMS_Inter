-- ====================================================================================
-- College Management System - Marks & Evaluation Module Stored Procedures
-- Aligned for Grouped Evaluation Management & Detailed Student Marks
-- ====================================================================================

-- 1. Stored Procedure: sp_BulkUpsertMarks
DROP PROCEDURE IF EXISTS `sp_BulkUpsertMarks`;
DELIMITER //
CREATE PROCEDURE `sp_BulkUpsertMarks`(
    IN p_MarksJson JSON,
    IN p_UserId INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_AffectedCount INT DEFAULT 0;

    IF p_MarksJson IS NOT NULL AND JSON_VALID(p_MarksJson) THEN
        INSERT INTO `Marks` (
            `CampusId`, `Board`, `BoardId`, `AcademicYearId`, `AcademicLevel`, `AcademicLevelId`,
            `GroupId`, `SectionId`, `ExaminationId`, `SubjectId`, `StudentId`, `RollNo`, `StudentName`,
            `FacultyId`, `InternalMarks`, `PracticalMarks`, `TheoryMarks`, `TotalMarks`, `PassingMarks`,
            `IsAbsent`, `Remarks`, `Status`, `IsActive`, `CreatedAt`, `UpdatedAt`, `SubmittedAt`
        )
        SELECT 
            COALESCE(jt.CampusId, p_CampusId, 1),
            COALESCE(jt.Board, ''),
            jt.BoardId,
            COALESCE(jt.AcademicYearId, 1),
            COALESCE(jt.AcademicLevel, ''),
            jt.AcademicLevelId,
            COALESCE(jt.GroupId, 1),
            COALESCE(jt.SectionId, 1),
            jt.ExaminationId,
            jt.SubjectId,
            jt.StudentId,
            COALESCE(jt.RollNo, ''),
            COALESCE(jt.StudentName, ''),
            jt.FacultyId,
            COALESCE(jt.InternalMarks, 0),
            COALESCE(jt.PracticalMarks, 0),
            COALESCE(jt.TheoryMarks, 0),
            COALESCE(jt.TotalMarks, 0),
            COALESCE(jt.PassingMarks, 35),
            COALESCE(jt.IsAbsent, 0),
            jt.Remarks,
            COALESCE(jt.Status, 1),
            1,
            UTC_TIMESTAMP(),
            UTC_TIMESTAMP(),
            CASE WHEN COALESCE(jt.Status, 1) = 1 THEN UTC_TIMESTAMP() ELSE NULL END
        FROM JSON_TABLE(p_MarksJson, '$[*]' COLUMNS (
            CampusId INT PATH '$.campusId',
            Board VARCHAR(100) PATH '$.board',
            BoardId INT PATH '$.boardId',
            AcademicYearId INT PATH '$.academicYearId',
            AcademicLevel VARCHAR(100) PATH '$.academicLevel',
            AcademicLevelId INT PATH '$.academicLevelId',
            GroupId INT PATH '$.groupId',
            SectionId INT PATH '$.sectionId',
            ExaminationId INT PATH '$.examinationId',
            SubjectId INT PATH '$.subjectId',
            StudentId INT PATH '$.studentId',
            RollNo VARCHAR(50) PATH '$.rollNo',
            StudentName VARCHAR(150) PATH '$.studentName',
            FacultyId INT PATH '$.facultyId',
            InternalMarks INT PATH '$.internalMarks',
            PracticalMarks INT PATH '$.practicalMarks',
            TheoryMarks INT PATH '$.theoryMarks',
            TotalMarks INT PATH '$.totalMarks',
            PassingMarks INT PATH '$.passingMarks',
            IsAbsent INT PATH '$.isAbsent',
            Remarks VARCHAR(250) PATH '$.remarks',
            Status INT PATH '$.status'
        )) jt
        WHERE jt.StudentId > 0 AND jt.ExaminationId > 0 AND jt.SubjectId > 0
        ON DUPLICATE KEY UPDATE
            `InternalMarks` = VALUES(`InternalMarks`),
            `PracticalMarks` = VALUES(`PracticalMarks`),
            `TheoryMarks` = VALUES(`TheoryMarks`),
            `TotalMarks` = VALUES(`TotalMarks`),
            `PassingMarks` = VALUES(`PassingMarks`),
            `IsAbsent` = VALUES(`IsAbsent`),
            `Remarks` = COALESCE(VALUES(`Remarks`), `Marks`.`Remarks`),
            `FacultyId` = COALESCE(VALUES(`FacultyId`), `Marks`.`FacultyId`),
            `Status` = VALUES(`Status`),
            `UpdatedAt` = UTC_TIMESTAMP(),
            `SubmittedAt` = CASE WHEN VALUES(`Status`) = 1 THEN UTC_TIMESTAMP() ELSE `Marks`.`SubmittedAt` END;

        SET v_AffectedCount = ROW_COUNT();
    END IF;

    SELECT v_AffectedCount AS AffectedCount;
END //
DELIMITER ;

-- 2. Stored Procedure: sp_GetFilteredMarks (Detailed Student-Level Marks Query for Analysis & Matrix)
DROP PROCEDURE IF EXISTS `sp_GetFilteredMarks`;
DELIMITER //
CREATE PROCEDURE `sp_GetFilteredMarks`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_SubjectId INT,
    IN p_StudentId INT,
    IN p_FacultyId INT,
    IN p_Status INT,
    IN p_Offset INT,
    IN p_Limit INT,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        m.MarkId,
        m.Board,
        m.BoardId,
        m.AcademicYearId,
        m.AcademicLevel,
        m.AcademicLevelId,
        m.GroupId,
        m.SectionId,
        m.ExaminationId,
        m.SubjectId,
        m.StudentId,
        m.RollNo,
        m.StudentName,
        m.FacultyId,
        m.InternalMarks,
        m.PracticalMarks,
        m.TheoryMarks,
        m.TotalMarks,
        m.PassingMarks,
        m.IsAbsent,
        m.Remarks,
        m.IsVerified,
        m.IsPublished,
        m.Status,
        m.Status AS StatusCode,
        m.IsLocked,
        m.VerifiedBy,
        m.VerifiedAt,
        m.ApprovedBy,
        m.ApprovedAt,
        m.PublishedAt,
        m.IsActive,
        m.CreatedAt,
        m.UpdatedAt,
        COALESCE(s.SubjectName, '') AS SubjectName,
        COALESCE(s.SubjectCode, '') AS SubjectCode,
        COALESCE(s.TotalMarks, 100) AS SubjectMaxMarks,
        COALESCE(s.Practical, 0) AS IsPractical,
        COALESCE(s.SubjectType, 'Theory') AS SubjectType,
        COALESCE(st.StudentName, m.StudentName, '') AS FullStudentName,
        COALESCE(st.RollNo, st.AdmissionNo, m.RollNo, '') AS FullRollNo,
        COALESCE(st.AdmissionNo, '') AS AdmissionNo,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(e.ExamName, '') AS ExamName,
        COALESCE(e.ExamPattern, 'REGULAR_ACADEMIC') AS ExamPattern,
        COALESCE(at.AssessmentTypeName, 'Written') AS ExamType,
        COALESCE(e.TotalMarks, 600) AS ExamTotalMarks,
        COALESCE(e.PassPercentage, 35.00) AS ExamPassPercentage,
        COALESCE(b.BoardName, m.Board, '') AS BoardName,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        COALESCE(al.LevelName, m.AcademicLevel, '') AS LevelName,
        COALESCE(f.FirstName, '') AS FacultyFirstName,
        COALESCE(f.LastName, '') AS FacultyLastName,
        COALESCE(f.EmployeeId, CONCAT('FAC', LPAD(COALESCE(m.FacultyId, 0), 4, '0'))) AS FacultyEmployeeId
    FROM `Marks` m
    LEFT JOIN `Subjects` s ON s.SubjectId = m.SubjectId
    LEFT JOIN `Students` st ON st.StudentId = m.StudentId
    LEFT JOIN `Sections` sec ON sec.SectionId = m.SectionId
    LEFT JOIN `Groups` g ON g.GroupId = m.GroupId
    LEFT JOIN `Examinations` e ON e.ExamId = m.ExaminationId
    LEFT JOIN `AssessmentTypes` at ON at.AssessmentTypeId = e.AssessmentTypeId
    LEFT JOIN `Boards` b ON b.BoardId = m.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = m.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = m.AcademicLevelId
    LEFT JOIN `Faculties` f ON f.Id = m.FacultyId
    WHERE m.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR sec.CampusId = p_CampusId OR e.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR m.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR m.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR m.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR m.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR m.SectionId = p_SectionId)
      AND (p_ExaminationId IS NULL OR p_ExaminationId = 0 OR m.ExaminationId = p_ExaminationId)
      AND (p_SubjectId IS NULL OR p_SubjectId = 0 OR m.SubjectId = p_SubjectId)
      AND (p_StudentId IS NULL OR p_StudentId = 0 OR m.StudentId = p_StudentId)
      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR m.FacultyId = p_FacultyId)
      AND (p_Status IS NULL OR p_Status = 0 OR m.Status = p_Status)
    ORDER BY m.StudentId ASC, m.SubjectId ASC
    LIMIT p_Offset, p_Limit;
END //
DELIMITER ;

-- 3. Stored Procedure: sp_GetFilteredEvaluations (Grouped at MySQL Level for Admin Grid)
DROP PROCEDURE IF EXISTS `sp_GetFilteredEvaluations`;
DELIMITER //
CREATE PROCEDURE `sp_GetFilteredEvaluations`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_SubjectId INT,
    IN p_StudentId INT,
    IN p_FacultyId INT,
    IN p_Status INT,
    IN p_Offset INT,
    IN p_Limit INT,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        CONCAT(m.SubjectId, '_', m.SectionId, '_', m.ExaminationId) AS EvaluationId,
        m.SubjectId,
        COALESCE(MIN(s.SubjectCode), CONCAT('SUB', LPAD(m.SubjectId, 3, '0'))) AS SubjectCode,
        COALESCE(MIN(s.SubjectName), CONCAT('Subject #', m.SubjectId)) AS SubjectName,
        COALESCE(MIN(m.FacultyId), 0) AS FacultyId,
        COALESCE(CONCAT(MIN(f.FirstName), ' ', MIN(f.LastName)), 'Unassigned') AS FacultyName,
        COALESCE(MIN(f.EmployeeId), CONCAT('FAC', LPAD(COALESCE(MIN(m.FacultyId), 0), 4, '0'))) AS FacultyCode,
        COALESCE(MIN(b.BoardName), MIN(m.Board), 'AP State Board') AS BoardName,
        COALESCE(MIN(ay.AcademicYearName), CAST(MIN(m.AcademicYearId) AS CHAR), '2026-27') AS AcademicYear,
        COALESCE(MIN(g.GroupName), 'MPC') AS GroupName,
        COALESCE(MIN(sec.SectionName), 'Section A') AS SectionName,
        COALESCE(MIN(e.ExamName), 'Quarterly Examination') AS ExaminationName,
        COALESCE(MIN(e.ExamPattern), 'REGULAR_ACADEMIC') AS ExamPattern,
        COALESCE(MIN(at.AssessmentTypeName), 'Written') AS ExamType,
        COALESCE(MIN(e.TotalMarks), 600) AS ExamTotalMarks,
        COALESCE(MIN(e.PassPercentage), 35.00) AS ExamPassPercentage,
        COALESCE(MIN(s.TotalMarks), 100.00) AS SubjectMaxMarks,
        COALESCE(MIN(s.Practical), 0) AS IsPractical,
        COALESCE(MIN(s.SubjectType), 'Theory') AS SubjectType,
        COUNT(m.MarkId) AS TotalStudents,
        SUM(CASE WHEN m.IsAbsent = 0 THEN 1 ELSE 0 END) AS PresentStudents,
        SUM(CASE WHEN m.IsAbsent = 1 THEN 1 ELSE 0 END) AS AbsentStudents,
        ROUND(AVG(m.TotalMarks), 2) AS AverageMarks,
        ROUND(AVG(m.TotalMarks), 0) AS ObtainedMarks,
        COALESCE(MIN(s.TotalMarks), 100.00) AS TotalMarks,
        MAX(m.TotalMarks) AS HighestMarks,
        MIN(m.TotalMarks) AS LowestMarks,
        CASE 
            WHEN SUM(CASE WHEN (m.TotalMarks > 0 OR m.TheoryMarks > 0 OR m.InternalMarks > 0 OR m.PracticalMarks > 0 OR m.IsAbsent = 1) THEN 1 ELSE 0 END) = 0 THEN 'NOT STARTED'
            WHEN MIN(m.Status) = 1 THEN 'SUBMITTED'
            WHEN MIN(m.Status) = 2 THEN 'VERIFIED'
            WHEN MIN(m.Status) = 3 THEN 'APPROVED'
            WHEN MIN(m.Status) = 4 THEN 'REJECTED'
            ELSE 'DRAFT'
        END AS Status,
        MIN(m.Status) AS StatusCode,
        MAX(m.IsLocked) AS IsLocked,
        MIN(CASE WHEN m.Status = 2 THEN m.Remarks ELSE NULL END) AS AdminReviewMessage,
        MIN(CASE WHEN m.Status = 4 THEN m.Remarks ELSE NULL END) AS RejectionReason,
        MIN(m.Remarks) AS Remarks,
        MAX(COALESCE(m.SubmittedAt, m.UpdatedAt, m.CreatedAt)) AS LastSubmittedAt
    FROM `Marks` m
    LEFT JOIN `Subjects` s ON s.SubjectId = m.SubjectId
    LEFT JOIN `Sections` sec ON sec.SectionId = m.SectionId
    LEFT JOIN `Groups` g ON g.GroupId = m.GroupId
    LEFT JOIN `Examinations` e ON e.ExamId = m.ExaminationId
    LEFT JOIN `AssessmentTypes` at ON at.AssessmentTypeId = e.AssessmentTypeId
    LEFT JOIN `Boards` b ON b.BoardId = m.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = m.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = m.AcademicLevelId
    LEFT JOIN `Faculties` f ON f.Id = m.FacultyId
    WHERE m.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR sec.CampusId = p_CampusId OR e.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR m.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR m.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR m.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR m.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR m.SectionId = p_SectionId)
      AND (p_ExaminationId IS NULL OR p_ExaminationId = 0 OR m.ExaminationId = p_ExaminationId)
      AND (p_SubjectId IS NULL OR p_SubjectId = 0 OR m.SubjectId = p_SubjectId)
      AND (p_StudentId IS NULL OR p_StudentId = 0 OR m.StudentId = p_StudentId)
      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR m.FacultyId = p_FacultyId)
      AND (p_Status IS NULL OR p_Status = 0 OR m.Status = p_Status)
    GROUP BY m.SubjectId, m.SectionId, m.ExaminationId
    ORDER BY LastSubmittedAt DESC
    LIMIT p_Offset, p_Limit;
END //
DELIMITER ;

-- 4. Stored Procedure: sp_GetFilteredEvaluationsCount
DROP PROCEDURE IF EXISTS `sp_GetFilteredEvaluationsCount`;
DELIMITER //
CREATE PROCEDURE `sp_GetFilteredEvaluationsCount`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_SubjectId INT,
    IN p_StudentId INT,
    IN p_FacultyId INT,
    IN p_Status INT,
    IN p_CampusId INT
)
BEGIN
    SELECT COUNT(DISTINCT CONCAT(m.SubjectId, '_', m.SectionId, '_', m.ExaminationId)) AS TotalCount
    FROM `Marks` m
    LEFT JOIN `Sections` sec ON sec.SectionId = m.SectionId
    LEFT JOIN `Examinations` e ON e.ExamId = m.ExaminationId
    WHERE m.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR sec.CampusId = p_CampusId OR e.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR m.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR m.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR m.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR m.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR m.SectionId = p_SectionId)
      AND (p_ExaminationId IS NULL OR p_ExaminationId = 0 OR m.ExaminationId = p_ExaminationId)
      AND (p_SubjectId IS NULL OR p_SubjectId = 0 OR m.SubjectId = p_SubjectId)
      AND (p_StudentId IS NULL OR p_StudentId = 0 OR m.StudentId = p_StudentId)
      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR m.FacultyId = p_FacultyId)
      AND (p_Status IS NULL OR p_Status = 0 OR m.Status = p_Status);
END //
DELIMITER ;

-- 5. Stored Procedure: sp_GetEvaluationReadiness (Full GROUP BY & Aggregation Compliant)
DROP PROCEDURE IF EXISTS `sp_GetEvaluationReadiness`;
DELIMITER //
CREATE PROCEDURE `sp_GetEvaluationReadiness`(
    IN p_ExaminationId INT,
    IN p_SectionId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        s.SubjectId,
        s.SubjectCode,
        s.SubjectName,
        COALESCE(MIN(m.MarkId), 0) AS EvaluationId,
        CASE 
            WHEN COUNT(m.MarkId) = 0 THEN 'MISSING'
            WHEN MIN(m.Status) = 1 THEN 'SUBMITTED'
            WHEN MIN(m.Status) = 2 THEN 'VERIFIED'
            WHEN MIN(m.Status) = 3 THEN 'APPROVED'
            WHEN MIN(m.Status) = 4 THEN 'REJECTED'
            WHEN MIN(m.Status) = 0 THEN 'DRAFT'
            ELSE 'MISSING'
        END AS Status,
        COALESCE(MIN(m.Status), -1) AS StatusCode,
        COALESCE(MIN(m.FacultyId), 0) AS FacultyId,
        COALESCE(CONCAT(MIN(f.FirstName), ' ', MIN(f.LastName)), 'Unassigned') AS FacultyName,
        COALESCE(MIN(m.Remarks), '') AS Remarks,
        MAX(m.SubmittedAt) AS SubmittedAt,
        MAX(m.UpdatedAt) AS UpdatedAt
    FROM `Subjects` s
    INNER JOIN `Examinations` e ON e.ExamId = p_ExaminationId
    LEFT JOIN `Marks` m ON m.ExaminationId = p_ExaminationId 
        AND m.SubjectId = s.SubjectId 
        AND (p_SectionId IS NULL OR p_SectionId = 0 OR m.SectionId = p_SectionId)
        AND (p_CampusId IS NULL OR p_CampusId = 0 OR m.CampusId = p_CampusId)
        AND m.IsActive = 1
    LEFT JOIN `Faculties` f ON f.Id = m.FacultyId
    WHERE s.IsActive = 1
      AND s.GroupId = e.GroupId
      AND (s.BoardId = 0 OR s.BoardId = e.BoardId)
      AND (s.AcademicLevelId = 0 OR s.AcademicLevelId = e.AcademicLevelId)
    GROUP BY s.SubjectId, s.SubjectCode, s.SubjectName
    ORDER BY s.SubjectName ASC;
END //
DELIMITER ;

-- 6. Stored Procedure: sp_GetFacultyEvaluations (With Explicit UTF8MB4_UNICODE_CI Collation Fix)
DROP PROCEDURE IF EXISTS `sp_GetFacultyEvaluations`;
DELIMITER //
CREATE PROCEDURE `sp_GetFacultyEvaluations`(
    IN p_FacultyId INT,
    IN p_Status INT,
    IN p_ExaminationStatus VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        COALESCE(MIN(m.MarkId), 0) AS EvaluationId,
        m.ExaminationId,
        COALESCE(MIN(e.ExamName), CONCAT('Exam #', m.ExaminationId)) AS ExaminationName,
        m.SectionId,
        COALESCE(MIN(sec.SectionName), CONCAT('Section #', m.SectionId)) AS SectionName,
        m.SubjectId,
        COALESCE(MIN(s.SubjectName), CONCAT('Subject #', m.SubjectId)) AS SubjectName,
        COALESCE(MIN(s.SubjectCode), '') AS SubjectCode,
        m.FacultyId,
        COALESCE(CONCAT(MIN(f.FirstName), ' ', MIN(f.LastName)), 'Faculty Member') AS FacultyName,
        COALESCE(MIN(f.EmployeeId), CONCAT('FAC', LPAD(COALESCE(m.FacultyId, 0), 4, '0'))) AS FacultyCode,
        CASE MIN(m.Status)
            WHEN 1 THEN 'SUBMITTED'
            WHEN 2 THEN 'VERIFIED'
            WHEN 3 THEN 'APPROVED'
            WHEN 4 THEN 'REJECTED'
            ELSE 'DRAFT'
        END AS Status,
        CASE WHEN MIN(e.ExamPattern) LIKE '%OBJECTIVE%' OR MIN(e.ExamPattern) LIKE '%JEE%' OR MIN(e.ExamPattern) LIKE '%NEET%' THEN 'OBJECTIVE' ELSE 'REGULAR' END AS Mode,
        COALESCE(MIN(s.TotalMarks), 100) AS MaxMarks,
        COALESCE(MIN(s.InternalMarks), 30) AS InternalMax,
        COALESCE(MIN(s.PracticalMarks), 0) AS PracticalMax,
        COALESCE(MIN(s.ExternalMarks), 70) AS TheoryMax,
        COALESCE(MIN(e.PassPercentage), 35) AS PassPercentage,
        MIN(m.Remarks) AS RejectionReason,
        COALESCE(MAX(m.ResubmissionCount), 0) AS ResubmissionCount,
        1 AS RowVersion
    FROM `Marks` m
    INNER JOIN `Examinations` e ON e.ExamId = m.ExaminationId
    LEFT JOIN `Sections` sec ON sec.SectionId = m.SectionId
    LEFT JOIN `Subjects` s ON s.SubjectId = m.SubjectId
    LEFT JOIN `Faculties` f ON f.Id = m.FacultyId
    WHERE m.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR sec.CampusId = p_CampusId OR e.CampusId = p_CampusId)
      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR m.FacultyId = p_FacultyId)
      AND (p_Status IS NULL OR p_Status = 0 OR m.Status = p_Status)
      AND (p_ExaminationStatus IS NULL OR p_ExaminationStatus = '' OR LOWER(e.Status) = LOWER(p_ExaminationStatus COLLATE utf8mb4_unicode_ci))
    GROUP BY m.SubjectId, m.SectionId, m.ExaminationId, m.FacultyId
    ORDER BY m.ExaminationId DESC, m.SubjectId ASC;
END //
DELIMITER ;

-- 7. Stored Procedure: sp_GetFacultyEvaluationStudents
DROP PROCEDURE IF EXISTS `sp_GetFacultyEvaluationStudents`;
DELIMITER //
CREATE PROCEDURE `sp_GetFacultyEvaluationStudents`(
    IN p_SubjectId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_CampusId INT
)
BEGIN
    -- Result Set 1: Header and Maxima
    SELECT 
        COALESCE(MIN(m.MarkId), 0) AS EvaluationId,
        p_ExaminationId AS ExaminationId,
        COALESCE(MIN(e.ExamName), '') AS ExaminationName,
        p_SectionId AS SectionId,
        COALESCE(MIN(sec.SectionName), '') AS SectionName,
        p_SubjectId AS SubjectId,
        COALESCE(MIN(s.SubjectName), '') AS SubjectName,
        COALESCE(MIN(s.SubjectCode), '') AS SubjectCode,
        COALESCE(MIN(m.FacultyId), 0) AS FacultyId,
        COALESCE(CONCAT(MIN(f.FirstName), ' ', MIN(f.LastName)), '') AS FacultyName,
        COALESCE(MIN(f.EmployeeId), '') AS FacultyCode,
        CASE WHEN MIN(e.ExamPattern) LIKE '%OBJECTIVE%' OR MIN(e.ExamPattern) LIKE '%JEE%' OR MIN(e.ExamPattern) LIKE '%NEET%' THEN 'OBJECTIVE' ELSE 'REGULAR' END AS Mode,
        COALESCE(MIN(s.TotalMarks), 100) AS MaxMarks,
        COALESCE(MIN(s.ExternalMarks), 70) AS TheoryMax,
        COALESCE(MIN(s.PracticalMarks), 0) AS PracticalMax,
        COALESCE(MIN(s.InternalMarks), 30) AS InternalMax,
        COALESCE(MIN(e.PassPercentage), 35) AS PassPercentage,
        COALESCE(MIN(s.Practical), 0) AS IsPracticalApplicable,
        CASE COALESCE(MIN(m.Status), 0)
            WHEN 1 THEN 'SUBMITTED'
            WHEN 2 THEN 'VERIFIED'
            WHEN 3 THEN 'APPROVED'
            WHEN 4 THEN 'REJECTED'
            ELSE 'DRAFT'
        END AS Status,
        COALESCE(MIN(m.Status), 0) AS StatusCode,
        COALESCE(MAX(m.IsLocked), 0) AS IsLocked,
        COALESCE(MIN(m.Remarks), '') AS RejectionReason,
        COALESCE(MAX(m.ResubmissionCount), 0) AS ResubmissionCount,
        1 AS RowVersion
    FROM `Examinations` e
    LEFT JOIN `Sections` sec ON sec.SectionId = p_SectionId
    LEFT JOIN `Subjects` s ON s.SubjectId = p_SubjectId
    LEFT JOIN `Marks` m ON m.ExaminationId = p_ExaminationId AND m.SectionId = p_SectionId AND m.SubjectId = p_SubjectId AND m.IsActive = 1
    LEFT JOIN `Faculties` f ON f.Id = m.FacultyId
    WHERE e.ExamId = p_ExaminationId;

    -- Result Set 2: Student Marks Grid
    SELECT 
        st.StudentId,
        COALESCE(st.StudentName, '') AS StudentName,
        COALESCE(st.RollNo, st.AdmissionNo, CAST(st.StudentId AS CHAR)) AS RollNo,
        COALESCE(st.AdmissionNo, '') AS AdmissionNo,
        COALESCE(m.InternalMarks, 0) AS InternalMarks,
        COALESCE(m.PracticalMarks, 0) AS PracticalMarks,
        COALESCE(m.TheoryMarks, 0) AS TheoryMarks,
        COALESCE(m.TotalMarks, 0) AS TotalMarks,
        COALESCE(m.IsAbsent, 0) AS IsAbsent,
        COALESCE(m.Remarks, '') AS Remarks
    FROM `Students` st
    LEFT JOIN `Marks` m ON m.StudentId = st.StudentId 
        AND m.ExaminationId = p_ExaminationId 
        AND m.SubjectId = p_SubjectId 
        AND m.SectionId = p_SectionId
        AND m.IsActive = 1
    WHERE st.SectionId = p_SectionId
      AND st.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
    ORDER BY st.RollNo ASC, st.StudentName ASC;
END //
DELIMITER ;

-- 8. Stored Procedure: sp_UpdateEvaluationStatus
DROP PROCEDURE IF EXISTS `sp_UpdateEvaluationStatus`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateEvaluationStatus`(
    IN p_SubjectId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_Status INT,
    IN p_UserId INT,
    IN p_Remarks VARCHAR(250),
    IN p_CampusId INT
)
BEGIN
    UPDATE `Marks`
    SET 
        Status = p_Status,
        Remarks = COALESCE(p_Remarks, Remarks),
        UpdatedAt = UTC_TIMESTAMP(),
        VerifiedBy = CASE WHEN p_Status = 2 THEN CAST(p_UserId AS CHAR) ELSE VerifiedBy END,
        VerifiedAt = CASE WHEN p_Status = 2 THEN UTC_TIMESTAMP() ELSE VerifiedAt END,
        ApprovedBy = CASE WHEN p_Status = 3 THEN p_UserId ELSE ApprovedBy END,
        ApprovedAt = CASE WHEN p_Status = 3 THEN UTC_TIMESTAMP() ELSE ApprovedAt END,
        ResubmissionCount = CASE WHEN p_Status = 4 THEN ResubmissionCount + 1 ELSE ResubmissionCount END
    WHERE SubjectId = p_SubjectId 
      AND SectionId = p_SectionId 
      AND ExaminationId = p_ExaminationId
      AND IsActive = 1;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- 9. Stored Procedure: sp_GetExamFormatAndLimits
DROP PROCEDURE IF EXISTS `sp_GetExamFormatAndLimits`;
DELIMITER //
CREATE PROCEDURE `sp_GetExamFormatAndLimits`(
    IN p_ExaminationId INT,
    IN p_SubjectId INT
)
BEGIN
    SELECT 
        e.ExamId AS ExaminationId,
        e.ExamPattern,
        CASE WHEN UPPER(COALESCE(e.ExamPattern, '')) LIKE '%OBJECTIVE%' OR UPPER(COALESCE(e.ExamPattern, '')) LIKE '%JEE%' OR UPPER(COALESCE(e.ExamPattern, '')) LIKE '%NEET%' OR UPPER(COALESCE(e.ExamPattern, '')) LIKE '%PATTERN%' THEN 'Objective' ELSE 'Regular' END AS ExamCategory,
        COALESCE(at.AssessmentTypeName, '') AS AssessmentTypeName,
        COALESCE(es.ExamMode, '') AS ScheduleExamMode,
        COALESCE(es.ScheduleMode, '') AS ScheduleMode,
        COALESCE(es.PatternName, '') AS PatternName,
        COALESCE(es.MaxMarks, s.TotalMarks, 100.00) AS MaxMarks,
        COALESCE(es.PassingMarks, s.PassingMarks, 35.00) AS PassingMarks
    FROM `Examinations` e
    LEFT JOIN `AssessmentTypes` at ON at.AssessmentTypeId = e.AssessmentTypeId
    LEFT JOIN `ExamSchedules` es ON es.ExamId = e.ExamId AND es.IsActive = 1 AND (es.SubjectId = p_SubjectId OR es.IncludedSubjectIds LIKE CONCAT('%', p_SubjectId, '%'))
    LEFT JOIN `Subjects` s ON s.SubjectId = p_SubjectId
    WHERE e.ExamId = p_ExaminationId
    LIMIT 1;
END //
DELIMITER ;
