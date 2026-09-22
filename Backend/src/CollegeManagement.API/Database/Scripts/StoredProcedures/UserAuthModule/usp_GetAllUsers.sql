DROP PROCEDURE IF EXISTS usp_GetAllUsers;
DELIMITER //
CREATE PROCEDURE usp_GetAllUsers()
BEGIN
    SELECT 
        u.UserId,
        u.Username,
        u.Email,
        u.PhoneNumber,
        u.PasswordHash,
        u.RoleId,
        r.RoleName,
        u.IsActive,
        u.CreatedAt,
        u.UpdatedAt
    FROM Users u
    LEFT JOIN Roles r ON r.RoleId = u.RoleId
    ORDER BY u.UserId DESC;
END //
DELIMITER ;
