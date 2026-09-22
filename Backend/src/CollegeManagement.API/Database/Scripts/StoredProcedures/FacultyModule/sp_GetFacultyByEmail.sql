DROP PROCEDURE IF EXISTS sp_GetFacultyByEmail;
DELIMITER //
CREATE PROCEDURE sp_GetFacultyByEmail(
    IN p_Email VARCHAR(150)
)
BEGIN
    SELECT * FROM Faculties WHERE Email = p_Email AND (IsDeleted = 0 OR IsDeleted IS NULL);
END //
DELIMITER ;
