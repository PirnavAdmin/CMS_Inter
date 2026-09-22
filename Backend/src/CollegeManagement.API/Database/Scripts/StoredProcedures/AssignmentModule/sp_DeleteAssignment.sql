DROP PROCEDURE IF EXISTS sp_DeleteAssignment;

DELIMITER $$

CREATE PROCEDURE sp_DeleteAssignment
(
IN p_AssignmentId INT
)
BEGIN

DELETE FROM Assignments
WHERE AssignmentId=p_AssignmentId;

END$$

DELIMITER ;