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
        es.SubjectId,
        es.ExamDate,
        es.StartTime,
        es.EndTime,
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
    WHERE es.ExamId = p_ExaminationId AND es.IsActive = 1
    ORDER BY es.ExamDate ASC, es.StartTime ASC;
END //
DELIMITER ;
