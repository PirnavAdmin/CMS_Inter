DROP PROCEDURE IF EXISTS sp_CreateAdmin;
DELIMITER //
CREATE PROCEDURE sp_CreateAdmin(IN p_Email VARCHAR(255), IN p_Password VARCHAR(255), IN p_IsActive TINYINT(1))
BEGIN
    INSERT INTO admins (Email, Password, IsActive) VALUES (p_Email, p_Password, p_IsActive);
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;
