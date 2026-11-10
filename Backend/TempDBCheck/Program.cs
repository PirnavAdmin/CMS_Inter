using System;
using MySqlConnector;

class Program
{
    static void Main()
    {
        string connStr = "Server=collegemanagementdb-mysql-3069cc62-manikesandeep-1393.g.aivencloud.com;Port=19182;Database=CollegeManagement;User ID=avnadmin;Password=AVNS_jgPZED4pphZib4tvJID;SslMode=Required;";
        using (var conn = new MySqlConnection(connStr))
        {
            conn.Open();

            Console.WriteLine("Updating sp_SuperAdmin_CreateCollegeAdmin to accept p_PhoneNumber...");
            using var dropCmd = conn.CreateCommand();
            dropCmd.CommandText = "DROP PROCEDURE IF EXISTS `sp_SuperAdmin_CreateCollegeAdmin`;";
            dropCmd.ExecuteNonQuery();

            using var createCmd = conn.CreateCommand();
            createCmd.CommandText = @"
CREATE PROCEDURE `sp_SuperAdmin_CreateCollegeAdmin`(
    IN p_CollegeId INT,
    IN p_FullName VARCHAR(150),
    IN p_Email VARCHAR(150),
    IN p_PhoneNumber VARCHAR(50),
    IN p_PasswordHash VARCHAR(255),
    IN p_CreatedBy INT,
    OUT p_NewUserId INT
)
BEGIN
    DECLARE v_AdminRoleId INT;

    IF EXISTS (SELECT 1 FROM `Users` WHERE `Email` = p_Email) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_USER_EMAIL: An account with this email already exists.';
    END IF;

    SELECT `RoleId` INTO v_AdminRoleId
    FROM `Roles`
    WHERE `RoleCode` = 'COLLEGE_ADMIN' OR `RoleName` = 'Admin'
    ORDER BY `RoleId` ASC LIMIT 1;

    INSERT INTO `Users` (
        `CollegeId`, `RoleId`, `Email`, `PhoneNumber`, `PasswordHash`, 
        `FullName`, `IsActive`, `IsFirstLogin`, `CreatedAt`
    )
    VALUES (
        p_CollegeId, v_AdminRoleId, p_Email, IFNULL(NULLIF(p_PhoneNumber, ''), '+91 9000000000'), p_PasswordHash, 
        p_FullName, 1, 1, CURRENT_TIMESTAMP(6)
    );

    SET p_NewUserId = LAST_INSERT_ID();
END;";
            createCmd.ExecuteNonQuery();
            Console.WriteLine("Successfully updated sp_SuperAdmin_CreateCollegeAdmin in MySQL!");
        }
    }
}
