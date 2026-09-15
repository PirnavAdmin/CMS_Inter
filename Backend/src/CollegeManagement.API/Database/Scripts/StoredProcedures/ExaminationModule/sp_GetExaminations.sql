DROP PROCEDURE IF EXISTS sp_GetExaminations;
DELIMITER //
CREATE PROCEDURE sp_GetExaminations(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_AssessmentTypeId INT,
    IN p_Status VARCHAR(50),
    IN p_SearchTerm VARCHAR(150)
)
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
DELIMITER ;
