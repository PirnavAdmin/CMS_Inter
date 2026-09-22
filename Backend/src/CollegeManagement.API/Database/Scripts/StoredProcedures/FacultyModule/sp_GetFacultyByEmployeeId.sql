DROP PROCEDURE IF EXISTS sp_GetFacultyByEmployeeId;
DELIMITER //
CREATE PROCEDURE sp_GetFacultyByEmployeeId(
    IN p_EmployeeId VARCHAR(50)
)
BEGIN
    SELECT * FROM Faculties WHERE EmployeeId = p_EmployeeId AND (IsDeleted = 0 OR IsDeleted IS NULL);
END //
DELIMITER ;
