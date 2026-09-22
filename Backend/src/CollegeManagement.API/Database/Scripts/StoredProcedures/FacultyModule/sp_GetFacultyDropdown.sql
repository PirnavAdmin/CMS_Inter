DROP PROCEDURE IF EXISTS sp_GetFacultyDropdown;
DELIMITER //
CREATE PROCEDURE sp_GetFacultyDropdown()
BEGIN
    SELECT 
        Id,
        EmployeeId,
        CONCAT(FirstName, ' ', LastName) AS FullName
    FROM Faculties
    WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
    ORDER BY FirstName ASC;
END //
DELIMITER ;
