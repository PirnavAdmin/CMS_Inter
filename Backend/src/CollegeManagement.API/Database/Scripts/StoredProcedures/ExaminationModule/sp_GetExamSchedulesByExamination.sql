-- ====================================================================================
-- Stored Procedure: sp_GetExamSchedulesByExamination
-- Target Database: CollegeManagement (MySQL 8.0+)
-- Description: Retrieves schedules for an examination using LEFT JOIN to ensure
--              Objective/Pattern-wise examinations (SubjectId NULL or 0) are returned.
-- ====================================================================================

DROP PROCEDURE IF EXISTS sp_GetExamSchedulesByExamination;
DELIMITER //
CREATE PROCEDURE sp_GetExamSchedulesByExamination(
    IN p_ExaminationId INT
)
BEGIN
    SELECT 
        es.ScheduleId AS ExamScheduleId,
        es.ScheduleId,
        es.ExamId AS ExaminationId,
        es.ExamId,
        es.GroupId,
        es.SubjectId,
        COALESCE(s.SubjectName, es.PatternName, 'Objective Session') AS SubjectName,
        COALESCE(s.SubjectCode, 'OBJ') AS SubjectCode,
        es.PatternName,
        es.ScheduleMode,
        es.ExamDate,
        es.StartTime,
        es.EndTime,
        es.Hall,
        es.Invigilator,
        es.ExamMode,
        es.MaxMarks,
        es.PassingMarks,
        COALESCE(es.PassPercentage, 35.00) AS PassPercentage,
        es.IsActive,
        es.CreatedAt,
        es.UpdatedAt
    FROM ExamSchedules es
    LEFT JOIN Subjects s ON es.SubjectId = s.SubjectId   -- Critical: LEFT JOIN so NULL SubjectId rows are included
    WHERE es.ExamId = p_ExaminationId AND es.IsActive = 1
    ORDER BY es.ExamDate ASC, es.StartTime ASC;
END //
DELIMITER ;
