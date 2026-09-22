DROP PROCEDURE IF EXISTS sp_GetEligibleSubjectsForExam;
DELIMITER //
CREATE PROCEDURE sp_GetEligibleSubjectsForExam(
    IN p_ExaminationId INT
)
BEGIN
    SELECT 
        s.SubjectId,
        s.SubjectId AS Id,
        s.BoardId,
        s.GroupId,
        s.AcademicLevelId,
        s.AcademicYearId,
        s.SubjectName,
        s.SubjectCode,
        s.SubjectType,
        s.Theory,
        s.Practical,
        s.Language,
        s.Elective,
        s.InternalMarks,
        s.PracticalMarks,
        s.ExternalMarks,
        s.TotalMarks,
        s.PassingMarks,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
    FROM Subjects s
    INNER JOIN Examinations e ON e.ExamId = p_ExaminationId
    WHERE s.IsActive = 1
      AND s.BoardId = e.BoardId
      AND s.AcademicLevelId = e.AcademicLevelId
      AND s.GroupId = e.GroupId
    ORDER BY s.SubjectName;
END //
DELIMITER ;
