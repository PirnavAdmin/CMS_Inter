DROP PROCEDURE IF EXISTS sp_PromoteSingleStudent;
CREATE PROCEDURE sp_PromoteSingleStudent
(
    IN p_StudentId INT,
    IN p_ToAcademicYearId INT,
    IN p_ToAcademicLevel VARCHAR(50),
    IN p_ToSection VARCHAR(50),
    IN p_Remarks VARCHAR(500)
)
BEGIN
    CALL sp_PromoteStudents(
        JSON_ARRAY(p_StudentId),
        p_ToAcademicYearId,
        p_ToAcademicLevel,
        p_ToSection,
        p_Remarks
    );
END;
