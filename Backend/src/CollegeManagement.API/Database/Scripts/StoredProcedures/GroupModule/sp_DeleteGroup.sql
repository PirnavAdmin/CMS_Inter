DROP PROCEDURE IF EXISTS sp_DeleteGroup;
DELIMITER //
CREATE PROCEDURE sp_DeleteGroup(
    IN p_GroupId INT
)
BEGIN
    DELETE FROM `Groups`
    WHERE GroupId = p_GroupId;

    SELECT
        IF(ROW_COUNT() > 0, 1, 0) AS Deleted;
END //
DELIMITER ;
