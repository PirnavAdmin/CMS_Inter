-- ====================================================================================
-- College Management System - Unified Marks & Evaluation Module Stored Procedures
-- Run this script in MySQL Workbench or your MySQL CLI
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- STEP 1: DROP ALL EXISTING / OLD MARKS & EVALUATION PROCEDURES
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAllMarks`;
DROP PROCEDURE IF EXISTS `sp_GetMarkById`;
DROP PROCEDURE IF EXISTS `sp_GetMarksByStudent`;
DROP PROCEDURE IF EXISTS `sp_GetMarksBySubject`;
DROP PROCEDURE IF EXISTS `sp_GetMarksByExam`;
DROP PROCEDURE IF EXISTS `sp_GetMarkByExamSubjectStudent`;
DROP PROCEDURE IF EXISTS `sp_AddMark`;
DROP PROCEDURE IF EXISTS `sp_CreateMark`;
DROP PROCEDURE IF EXISTS `sp_UpdateMark`;
DROP PROCEDURE IF EXISTS `sp_DeleteMark`;
DROP PROCEDURE IF EXISTS `sp_RestoreMark`;
DROP PROCEDURE IF EXISTS `sp_VerifyMarks`;
DROP PROCEDURE IF EXISTS `sp_PublishMarks`;
DROP PROCEDURE IF EXISTS `sp_GetFilteredEvaluations`;
DROP PROCEDURE IF EXISTS `sp_GetFilteredEvaluationsCount`;
DROP PROCEDURE IF EXISTS `sp_GetEvaluationMarksList`;
DROP PROCEDURE IF EXISTS `sp_UpdateEvaluationStatus`;
DROP PROCEDURE IF EXISTS `sp_ToggleEvaluationLock`;
DROP PROCEDURE IF EXISTS `sp_GetActiveSectionsByGroup`;
DROP PROCEDURE IF EXISTS `sp_GetActiveSubjectsByGroup`;
DROP PROCEDURE IF EXISTS `sp_GetEvaluationReadiness`;
DROP PROCEDURE IF EXISTS `sp_GetFacultyEvaluations`;
DROP PROCEDURE IF EXISTS `sp_GetFacultyEvaluationStudents`;
DROP PROCEDURE IF EXISTS `sp_ExecuteGlobalApproval`;

DELIMITER //

-- ------------------------------------------------------------------------------------
-- 1. sp_GetAllMarks
-- Retrieves all active marks with fully joined academic, subject, student, and faculty data
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetAllMarks`()
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
        COALESCE(st.StudentName, m.StudentName, '') AS FullStudentName,
        COALESCE(st.RollNo, st.AdmissionNo, m.RollNo, '') AS FullRollNo,
        COALESCE(st.AdmissionNo, '') AS AdmissionNo,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(e.ExamName, '') AS ExamName,
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
    LEFT JOIN `Boards` b ON b.BoardId = m.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = m.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = m.AcademicLevelId
    LEFT JOIN `Faculties` f ON f.Id = m.FacultyId
    WHERE m.IsActive = 1
    ORDER BY m.MarkId DESC;
END //

-- ------------------------------------------------------------------------------------
-- 2. sp_GetMarkById
-- Retrieves single mark with fully joined details
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetMarkById`(
    IN p_MarkId INT
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
        COALESCE(st.StudentName, m.StudentName, '') AS FullStudentName,
        COALESCE(st.RollNo, st.AdmissionNo, m.RollNo, '') AS FullRollNo,
        COALESCE(st.AdmissionNo, '') AS AdmissionNo,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(e.ExamName, '') AS ExamName,
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
    LEFT JOIN `Boards` b ON b.BoardId = m.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = m.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = m.AcademicLevelId
    LEFT JOIN `Faculties` f ON f.Id = m.FacultyId
    WHERE m.MarkId = p_MarkId AND m.IsActive = 1
    LIMIT 1;
END //

-- ------------------------------------------------------------------------------------
-- 3. sp_GetMarksByStudent
-- Retrieves marks for a specific student
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetMarksByStudent`(
    IN p_StudentId INT
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
        COALESCE(st.StudentName, m.StudentName, '') AS FullStudentName,
        COALESCE(st.RollNo, st.AdmissionNo, m.RollNo, '') AS FullRollNo,
        COALESCE(st.AdmissionNo, '') AS AdmissionNo,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(e.ExamName, '') AS ExamName,
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
    LEFT JOIN `Boards` b ON b.BoardId = m.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = m.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = m.AcademicLevelId
    LEFT JOIN `Faculties` f ON f.Id = m.FacultyId
    WHERE m.StudentId = p_StudentId AND m.IsActive = 1
    ORDER BY m.ExaminationId ASC, m.SubjectId ASC;
END //

-- ------------------------------------------------------------------------------------
-- 4. sp_GetMarksBySubject
-- Retrieves marks for a specific subject
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetMarksBySubject`(
    IN p_SubjectId INT
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
        COALESCE(st.StudentName, m.StudentName, '') AS FullStudentName,
        COALESCE(st.RollNo, st.AdmissionNo, m.RollNo, '') AS FullRollNo,
        COALESCE(st.AdmissionNo, '') AS AdmissionNo,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(e.ExamName, '') AS ExamName,
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
    LEFT JOIN `Boards` b ON b.BoardId = m.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = m.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = m.AcademicLevelId
    LEFT JOIN `Faculties` f ON f.Id = m.FacultyId
    WHERE m.SubjectId = p_SubjectId AND m.IsActive = 1
    ORDER BY COALESCE(st.RollNo, m.RollNo, CAST(m.StudentId AS CHAR)) ASC;
END //

-- ------------------------------------------------------------------------------------
-- 5. sp_GetMarksByExam
-- Retrieves marks for an entire examination
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetMarksByExam`(
    IN p_ExaminationId INT
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
        COALESCE(st.StudentName, m.StudentName, '') AS FullStudentName,
        COALESCE(st.RollNo, st.AdmissionNo, m.RollNo, '') AS FullRollNo,
        COALESCE(st.AdmissionNo, '') AS AdmissionNo,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(e.ExamName, '') AS ExamName,
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
    LEFT JOIN `Boards` b ON b.BoardId = m.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = m.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = m.AcademicLevelId
    LEFT JOIN `Faculties` f ON f.Id = m.FacultyId
    WHERE m.ExaminationId = p_ExaminationId AND m.IsActive = 1
    ORDER BY m.SubjectId ASC, COALESCE(st.RollNo, m.RollNo, CAST(m.StudentId AS CHAR)) ASC;
END //

-- ------------------------------------------------------------------------------------
-- 6. sp_GetMarkByExamSubjectStudent
-- Retrieves a specific mark entry by Examination, Subject, and Student
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetMarkByExamSubjectStudent`(
    IN p_ExaminationId INT,
    IN p_SubjectId INT,
    IN p_StudentId INT
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
        COALESCE(st.StudentName, m.StudentName, '') AS FullStudentName,
        COALESCE(st.RollNo, st.AdmissionNo, m.RollNo, '') AS FullRollNo,
        COALESCE(st.AdmissionNo, '') AS AdmissionNo,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(e.ExamName, '') AS ExamName
    FROM `Marks` m
    LEFT JOIN `Subjects` s ON s.SubjectId = m.SubjectId
    LEFT JOIN `Students` st ON st.StudentId = m.StudentId
    LEFT JOIN `Sections` sec ON sec.SectionId = m.SectionId
    LEFT JOIN `Groups` g ON g.GroupId = m.GroupId
    LEFT JOIN `Examinations` e ON e.ExamId = m.ExaminationId
    WHERE m.ExaminationId = p_ExaminationId
      AND m.SubjectId = p_SubjectId
      AND m.StudentId = p_StudentId
      AND m.IsActive = 1
    LIMIT 1;
END //

-- ------------------------------------------------------------------------------------
-- 7. sp_AddMark
-- Inserts a new mark entry, calculates TotalMarks, and returns the new MarkId
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_AddMark`(
    IN p_Board VARCHAR(100),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_SubjectId INT,
    IN p_StudentId INT,
    IN p_FacultyId INT,
    IN p_RollNo VARCHAR(50),
    IN p_StudentName VARCHAR(150),
    IN p_InternalMarks INT,
    IN p_PracticalMarks INT,
    IN p_TheoryMarks INT,
    IN p_TotalMarks INT,
    IN p_PassingMarks INT,
    IN p_IsAbsent TINYINT(1),
    IN p_Remarks VARCHAR(250),
    IN p_Status INT
)
BEGIN
    DECLARE v_TotalMarks INT;
    DECLARE v_MarkId INT;
    
    IF p_TotalMarks IS NOT NULL AND p_TotalMarks > 0 THEN
        SET v_TotalMarks = p_TotalMarks;
    ELSE
        SET v_TotalMarks = IFNULL(p_InternalMarks, 0) + IFNULL(p_PracticalMarks, 0) + IFNULL(p_TheoryMarks, 0);
    END IF;

    IF p_IsAbsent = 1 THEN
        SET v_TotalMarks = 0;
    END IF;
    
    INSERT INTO `Marks` (
        Board, BoardId, AcademicYearId, AcademicLevel, AcademicLevelId, GroupId, SectionId, 
        ExaminationId, SubjectId, StudentId, FacultyId, RollNo, StudentName, 
        InternalMarks, PracticalMarks, TheoryMarks, TotalMarks, PassingMarks, 
        IsAbsent, Remarks, IsVerified, IsPublished, Status, IsLocked, IsActive, CreatedAt
    )
    VALUES (
        p_Board, p_BoardId, p_AcademicYearId, p_AcademicLevel, p_AcademicLevelId, p_GroupId, p_SectionId, 
        p_ExaminationId, p_SubjectId, p_StudentId, p_FacultyId, p_RollNo, p_StudentName, 
        IFNULL(p_InternalMarks, 0), IFNULL(p_PracticalMarks, 0), IFNULL(p_TheoryMarks, 0), 
        v_TotalMarks, IFNULL(p_PassingMarks, 35), 
        IFNULL(p_IsAbsent, 0), p_Remarks, 0, 0, IFNULL(p_Status, 1), 0, 1, UTC_TIMESTAMP()
    );
    
    SET v_MarkId = LAST_INSERT_ID();
    CALL sp_GetMarkById(v_MarkId);
END //

-- ------------------------------------------------------------------------------------
-- 8. sp_UpdateMark
-- Updates an existing mark entry
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_UpdateMark`(
    IN p_MarkId INT, 
    IN p_InternalMarks INT, 
    IN p_PracticalMarks INT, 
    IN p_TheoryMarks INT, 
    IN p_TotalMarks INT,
    IN p_PassingMarks INT,
    IN p_IsAbsent TINYINT(1),
    IN p_Remarks VARCHAR(250),
    IN p_FacultyId INT,
    IN p_Status INT
)
BEGIN
    DECLARE v_TotalMarks INT;

    IF p_TotalMarks IS NOT NULL AND p_TotalMarks > 0 THEN
        SET v_TotalMarks = p_TotalMarks;
    ELSE
        SET v_TotalMarks = IFNULL(p_InternalMarks, 0) + IFNULL(p_PracticalMarks, 0) + IFNULL(p_TheoryMarks, 0);
    END IF;

    IF p_IsAbsent = 1 THEN
        SET v_TotalMarks = 0;
    END IF;
    
    UPDATE `Marks`
    SET InternalMarks = IFNULL(p_InternalMarks, InternalMarks), 
        PracticalMarks = IFNULL(p_PracticalMarks, PracticalMarks),
        TheoryMarks = IFNULL(p_TheoryMarks, TheoryMarks), 
        TotalMarks = v_TotalMarks, 
        PassingMarks = IFNULL(p_PassingMarks, PassingMarks),
        IsAbsent = IFNULL(p_IsAbsent, IsAbsent),
        Remarks = p_Remarks,
        FacultyId = IFNULL(p_FacultyId, FacultyId),
        Status = IFNULL(p_Status, 1), -- Defaults to SUBMITTED on edit
        UpdatedAt = UTC_TIMESTAMP()
    WHERE MarkId = p_MarkId AND IsActive = 1;
    
    CALL sp_GetMarkById(p_MarkId);
END //

-- ------------------------------------------------------------------------------------
-- 9. sp_DeleteMark & sp_RestoreMark
-- Soft deletes or restores a mark entry
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_DeleteMark`(
    IN p_MarkId INT
)
BEGIN
    UPDATE `Marks` 
    SET IsActive = 0, 
        UpdatedAt = UTC_TIMESTAMP() 
    WHERE MarkId = p_MarkId AND IsActive = 1;

    SELECT ROW_COUNT() AS AffectedRows;
END //

CREATE PROCEDURE `sp_RestoreMark`(
    IN p_MarkId INT
)
BEGIN
    UPDATE `Marks` 
    SET IsActive = 1, 
        UpdatedAt = UTC_TIMESTAMP() 
    WHERE MarkId = p_MarkId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- ------------------------------------------------------------------------------------
-- 10. sp_VerifyMarks
-- Verifies marks for an examination context
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_VerifyMarks`(
    IN p_ExaminationId INT, 
    IN p_SubjectId INT, 
    IN p_SectionId INT, 
    IN p_VerifiedBy VARCHAR(100)
)
BEGIN
    UPDATE `Marks`
    SET IsVerified = 1, 
        Status = 2, -- VERIFIED
        VerifiedBy = TRIM(p_VerifiedBy), 
        VerifiedAt = UTC_TIMESTAMP(), 
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ExaminationId = p_ExaminationId 
      AND (p_SubjectId IS NULL OR p_SubjectId = 0 OR SubjectId = p_SubjectId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR SectionId = p_SectionId) 
      AND IsActive = 1;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- ------------------------------------------------------------------------------------
-- 11. sp_PublishMarks
-- Publishes marks for an examination context
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_PublishMarks`(
    IN p_ExaminationId INT, 
    IN p_SubjectId INT, 
    IN p_SectionId INT
)
BEGIN
    UPDATE `Marks`
    SET IsPublished = 1, 
        PublishedAt = UTC_TIMESTAMP(), 
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ExaminationId = p_ExaminationId 
      AND (p_SubjectId IS NULL OR p_SubjectId = 0 OR SubjectId = p_SubjectId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR SectionId = p_SectionId) 
      AND IsActive = 1;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- ------------------------------------------------------------------------------------
-- 12. sp_GetFilteredEvaluations
-- Searches evaluation records with rich filters and pagination
-- ------------------------------------------------------------------------------------
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
    IN p_Limit INT
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
    ORDER BY m.CreatedAt DESC
    LIMIT p_Offset, p_Limit;
END //

-- ------------------------------------------------------------------------------------
-- 13. sp_GetFilteredEvaluationsCount
-- Total count matching evaluation search filters
-- ------------------------------------------------------------------------------------
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
    IN p_Status INT
)
BEGIN
    SELECT COUNT(*) AS TotalCount
    FROM `Marks` m
    WHERE m.IsActive = 1
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

-- ------------------------------------------------------------------------------------
-- 14. sp_GetEvaluationMarksList
-- Retrieves marks list for a specific composite context (SubjectId, SectionId, ExaminationId)
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetEvaluationMarksList`(
    IN p_SubjectId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT
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
    WHERE m.SubjectId = p_SubjectId
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR m.SectionId = p_SectionId)
      AND (p_ExaminationId IS NULL OR p_ExaminationId = 0 OR m.ExaminationId = p_ExaminationId)
      AND m.IsActive = 1
    ORDER BY COALESCE(st.RollNo, m.RollNo, CAST(m.StudentId AS CHAR)) ASC;
END //

-- ------------------------------------------------------------------------------------
-- 15. sp_UpdateEvaluationStatus
-- Transitions evaluation status (SUBMITTED, VERIFIED, APPROVED, REJECTED)
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_UpdateEvaluationStatus`(
    IN p_SubjectId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_TargetStatus INT,
    IN p_UserId INT,
    IN p_Remarks VARCHAR(250)
)
BEGIN
    UPDATE `Marks`
    SET Status = p_TargetStatus,
        Remarks = COALESCE(p_Remarks, Remarks),
        IsVerified = IF(p_TargetStatus = 2, 1, IsVerified),
        VerifiedBy = IF(p_TargetStatus = 2, CAST(p_UserId AS CHAR), VerifiedBy),
        VerifiedAt = IF(p_TargetStatus = 2, UTC_TIMESTAMP(), VerifiedAt),
        ApprovedBy = IF(p_TargetStatus = 3, p_UserId, ApprovedBy),
        ApprovedAt = IF(p_TargetStatus = 3, UTC_TIMESTAMP(), ApprovedAt),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE SubjectId = p_SubjectId
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR SectionId = p_SectionId)
      AND (p_ExaminationId IS NULL OR p_ExaminationId = 0 OR ExaminationId = p_ExaminationId)
      AND IsActive = 1;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- ------------------------------------------------------------------------------------
-- 16. sp_ToggleEvaluationLock
-- Locks or unlocks evaluation entries for editing
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_ToggleEvaluationLock`(
    IN p_SubjectId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_IsLocked TINYINT(1)
)
BEGIN
    UPDATE `Marks`
    SET IsLocked = p_IsLocked,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE SubjectId = p_SubjectId
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR SectionId = p_SectionId)
      AND (p_ExaminationId IS NULL OR p_ExaminationId = 0 OR ExaminationId = p_ExaminationId)
      AND IsActive = 1;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- ------------------------------------------------------------------------------------
-- 17. sp_GetActiveSectionsByGroup
-- Retrieves active sections for a group
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetActiveSectionsByGroup`(
    IN p_GroupId INT
)
BEGIN
    SELECT 
        SectionId AS sectionId, 
        SectionName AS sectionName 
    FROM `Sections` 
    WHERE GroupId = p_GroupId AND IsActive = 1 
    ORDER BY SectionName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 18. sp_GetActiveSubjectsByGroup
-- Retrieves active subjects for a group
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetActiveSubjectsByGroup`(
    IN p_GroupId INT
)
BEGIN
    SELECT 
        SubjectId AS subjectId, 
        SubjectName AS subjectName, 
        SubjectCode AS subjectCode 
    FROM `Subjects` 
    WHERE GroupId = p_GroupId AND IsActive = 1 
    ORDER BY SubjectName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 19. sp_GetEvaluationReadiness
-- Computes readiness status across required examination subjects
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetEvaluationReadiness`(
    IN p_ExaminationId INT,
    IN p_SectionId INT
)
BEGIN
    SELECT 
        s.SubjectId,
        s.SubjectName,
        (
            SELECT m.FacultyId 
            FROM `Marks` m 
            WHERE m.ExaminationId = p_ExaminationId 
              AND m.SubjectId = s.SubjectId 
              AND (p_SectionId IS NULL OR p_SectionId = 0 OR m.SectionId = p_SectionId)
              AND m.IsActive = 1 
            LIMIT 1
        ) AS FacultyId,
        (
            SELECT m.MarkId 
            FROM `Marks` m 
            WHERE m.ExaminationId = p_ExaminationId 
              AND m.SubjectId = s.SubjectId 
              AND (p_SectionId IS NULL OR p_SectionId = 0 OR m.SectionId = p_SectionId)
              AND m.IsActive = 1 
            LIMIT 1
        ) AS EvaluationId,
        CASE 
            WHEN NOT EXISTS (
                SELECT 1 FROM `Marks` m 
                WHERE m.ExaminationId = p_ExaminationId 
                  AND m.SubjectId = s.SubjectId 
                  AND (p_SectionId IS NULL OR p_SectionId = 0 OR m.SectionId = p_SectionId)
                  AND m.IsActive = 1
            ) THEN 'MISSING'
            WHEN (
                SELECT COUNT(*) FROM `Marks` m 
                WHERE m.ExaminationId = p_ExaminationId 
                  AND m.SubjectId = s.SubjectId 
                  AND (p_SectionId IS NULL OR p_SectionId = 0 OR m.SectionId = p_SectionId)
                  AND m.Status = 3 AND m.IsActive = 1
            ) = (
                SELECT COUNT(*) FROM `Marks` m 
                WHERE m.ExaminationId = p_ExaminationId 
                  AND m.SubjectId = s.SubjectId 
                  AND (p_SectionId IS NULL OR p_SectionId = 0 OR m.SectionId = p_SectionId)
                  AND m.IsActive = 1
            ) THEN 'APPROVED'
            WHEN EXISTS (
                SELECT 1 FROM `Marks` m 
                WHERE m.ExaminationId = p_ExaminationId 
                  AND m.SubjectId = s.SubjectId 
                  AND (p_SectionId IS NULL OR p_SectionId = 0 OR m.SectionId = p_SectionId)
                  AND m.Status = 4 AND m.IsActive = 1
            ) THEN 'REJECTED'
            WHEN EXISTS (
                SELECT 1 FROM `Marks` m 
                WHERE m.ExaminationId = p_ExaminationId 
                  AND m.SubjectId = s.SubjectId 
                  AND (p_SectionId IS NULL OR p_SectionId = 0 OR m.SectionId = p_SectionId)
                  AND m.Status = 1 AND m.IsActive = 1
            ) THEN 'SUBMITTED'
            WHEN EXISTS (
                SELECT 1 FROM `Marks` m 
                WHERE m.ExaminationId = p_ExaminationId 
                  AND m.SubjectId = s.SubjectId 
                  AND (p_SectionId IS NULL OR p_SectionId = 0 OR m.SectionId = p_SectionId)
                  AND m.Status = 2 AND m.IsActive = 1
            ) THEN 'VERIFIED'
            ELSE 'DRAFT'
        END AS Status
    FROM `Subjects` s
    INNER JOIN `Examinations` e ON e.ExamId = p_ExaminationId
    WHERE s.IsActive = 1
      AND s.BoardId = e.BoardId
      AND s.AcademicLevelId = e.AcademicLevelId
      AND s.GroupId = e.GroupId
    ORDER BY s.SubjectName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 20. sp_GetFacultyEvaluations
-- Retrieves evaluations assigned to a faculty member
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetFacultyEvaluations`(
    IN p_FacultyId INT,
    IN p_Status INT,
    IN p_ExaminationStatus VARCHAR(50)
)
BEGIN
    SELECT 
        MIN(m.MarkId) AS EvaluationId,
        m.ExaminationId,
        COALESCE(e.ExamName, CONCAT('Exam #', m.ExaminationId)) AS ExaminationName,
        m.SectionId,
        COALESCE(sec.SectionName, CONCAT('Section #', m.SectionId)) AS SectionName,
        m.SubjectId,
        COALESCE(s.SubjectName, CONCAT('Subject #', m.SubjectId)) AS SubjectName,
        m.FacultyId,
        CASE m.Status
            WHEN 1 THEN 'SUBMITTED'
            WHEN 2 THEN 'VERIFIED'
            WHEN 3 THEN 'APPROVED'
            WHEN 4 THEN 'REJECTED'
            ELSE 'DRAFT'
        END AS Status,
        MIN(m.Remarks) AS RejectionReason,
        0 AS ResubmissionCount,
        1 AS RowVersion
    FROM `Marks` m
    INNER JOIN `Examinations` e ON e.ExamId = m.ExaminationId
    LEFT JOIN `Sections` sec ON sec.SectionId = m.SectionId
    LEFT JOIN `Subjects` s ON s.SubjectId = m.SubjectId
    WHERE m.IsActive = 1
      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR m.FacultyId = p_FacultyId)
      AND (p_Status IS NULL OR p_Status = 0 OR m.Status = p_Status)
      AND (p_ExaminationStatus IS NULL OR p_ExaminationStatus = '' OR LOWER(e.Status) = LOWER(p_ExaminationStatus))
    GROUP BY m.SubjectId, m.SectionId, m.ExaminationId, m.FacultyId, m.Status
    ORDER BY m.ExaminationId DESC, m.SubjectId ASC;
END //

-- ------------------------------------------------------------------------------------
-- 21. sp_GetFacultyEvaluationStudents
-- Retrieves student marks and subject maxima for faculty evaluation
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetFacultyEvaluationStudents`(
    IN p_SubjectId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT
)
BEGIN
    -- Result Set 1: Evaluation Header & Subject Maxima
    SELECT 
        COALESCE(MIN(m.MarkId), 0) AS EvaluationId,
        p_ExaminationId AS ExaminationId,
        COALESCE(e.ExamName, '') AS ExaminationName,
        p_SectionId AS SectionId,
        COALESCE(sec.SectionName, '') AS SectionName,
        p_SubjectId AS SubjectId,
        COALESCE(s.SubjectName, '') AS SubjectName,
        COALESCE(s.TotalMarks, 100) AS MaxMarks,
        COALESCE(s.ExternalMarks, 70) AS TheoryMax,
        COALESCE(s.PracticalMarks, 20) AS PracticalMax,
        COALESCE(s.InternalMarks, 10) AS InternalMax,
        COALESCE(s.Practical, 0) AS IsPracticalApplicable,
        CASE COALESCE(MIN(m.Status), 1)
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
        COALESCE(m.IsAbsent, 0) AS IsAbsent,
        m.Remarks
    FROM `Students` st
    LEFT JOIN `Marks` m ON m.StudentId = st.StudentId 
                       AND m.SubjectId = p_SubjectId 
                       AND m.SectionId = p_SectionId 
                       AND m.ExaminationId = p_ExaminationId 
                       AND m.IsActive = 1
    WHERE st.IsActive = 1
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR st.SectionId = p_SectionId)
    ORDER BY COALESCE(st.RollNo, st.AdmissionNo, CAST(st.StudentId AS CHAR)) ASC;
END //

-- ------------------------------------------------------------------------------------
-- 22. sp_ExecuteGlobalApproval
-- Approves all verified evaluations in the selected academic context
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_ExecuteGlobalApproval`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_ExaminationId INT,
    IN p_UserId INT
)
BEGIN
    UPDATE `Marks`
    SET Status = 3, -- APPROVED
        ApprovedBy = p_UserId,
        ApprovedAt = UTC_TIMESTAMP(),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE IsActive = 1
      AND Status = 2 -- Only verified evaluations can be globally approved
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR SectionId = p_SectionId)
      AND (p_ExaminationId IS NULL OR p_ExaminationId = 0 OR ExaminationId = p_ExaminationId);

    SELECT ROW_COUNT() AS AffectedRows;
END //

DELIMITER ;
