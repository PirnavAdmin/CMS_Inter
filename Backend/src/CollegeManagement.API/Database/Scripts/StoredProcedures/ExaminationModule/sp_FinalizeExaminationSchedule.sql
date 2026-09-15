DROP PROCEDURE IF EXISTS sp_FinalizeExaminationSchedule;
DELIMITER //
CREATE PROCEDURE sp_FinalizeExaminationSchedule(
    IN p_ExaminationId INT
)
BEGIN
    UPDATE Examinations
    SET Status = 'SCHEDULED',
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ExamId = p_ExaminationId;
    
    UPDATE ExamSchedules
    SET IsActive = 1,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ExamId = p_ExaminationId;
END //
DELIMITER ;
