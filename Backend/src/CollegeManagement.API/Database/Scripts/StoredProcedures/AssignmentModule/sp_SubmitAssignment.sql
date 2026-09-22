DROP PROCEDURE IF EXISTS sp_SubmitAssignment;

DELIMITER $$

CREATE PROCEDURE sp_SubmitAssignment
(
    IN p_AssignmentId INT,
    IN p_StudentName VARCHAR(200),
    IN p_SubmissionFile VARCHAR(500)
)
BEGIN

    INSERT INTO AssignmentSubmissions
    (
        AssignmentId,
        StudentName,
        SubmissionFile,
        SubmittedAt
    )
    VALUES
    (
        p_AssignmentId,
        p_StudentName,
        p_SubmissionFile,
        NOW()
    );

END$$

DELIMITER ;