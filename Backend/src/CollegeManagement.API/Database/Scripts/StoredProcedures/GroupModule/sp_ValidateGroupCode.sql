DROP PROCEDURE IF EXISTS sp_ValidateGroupCode;
DELIMITER //
CREATE PROCEDURE sp_ValidateGroupCode(
    IN p_GroupCode VARCHAR(30),
    IN p_ExcludeGroupId INT
)
BEGIN
    SELECT
        EXISTS
        (
            SELECT 1
            FROM `Groups`
            WHERE GroupCode = TRIM(p_GroupCode)
              AND
              (
                  p_ExcludeGroupId IS NULL
                  OR GroupId <> p_ExcludeGroupId
              )
        ) AS `Exists`;
END //
DELIMITER ;
