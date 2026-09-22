DROP PROCEDURE IF EXISTS sp_SoftDeleteFaculty;
DELIMITER //
CREATE PROCEDURE sp_SoftDeleteFaculty(
    IN p_Id INT
)
BEGIN
    UPDATE Faculties SET IsDeleted = 1, UpdatedAt = NOW() WHERE Id = p_Id;
END //
DELIMITER ;
