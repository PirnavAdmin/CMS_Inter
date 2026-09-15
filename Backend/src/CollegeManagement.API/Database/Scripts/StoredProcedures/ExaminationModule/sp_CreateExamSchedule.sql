DROP PROCEDURE IF EXISTS sp_CreateExamSchedule;
DELIMITER //
CREATE PROCEDURE sp_CreateExamSchedule(
    IN p_ExamId INT,
    IN p_SubjectId INT,
    IN p_ExamDate DATE,
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
)
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
        CreatedAt
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
        NOW()
    );

    SELECT LAST_INSERT_ID() AS ScheduleId;
END //
DELIMITER ;
