DROP PROCEDURE IF EXISTS sp_GetAssignmentSubmissions;

DELIMITER $$

CREATE PROCEDURE sp_GetAssignmentSubmissions
(
    IN p_AssignmentId INT
)
BEGIN

    SELECT *
    FROM AssignmentSubmissions
    WHERE AssignmentId = p_AssignmentId
    ORDER BY SubmittedAt DESC;

END$$

DELIMITER ;