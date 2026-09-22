using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `admins` (
    `id` int NOT NULL AUTO_INCREMENT,
    `Email` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `Password` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    CONSTRAINT `PK_admins` PRIMARY KEY (`id`)
) CHARACTER SET=utf8mb4;

DROP PROCEDURE IF EXISTS sp_GetAllAdmins;
CREATE PROCEDURE sp_GetAllAdmins()
BEGIN
    SELECT id, Email, IsActive FROM admins ORDER BY id DESC;
END;

DROP PROCEDURE IF EXISTS sp_GetAdminById;
CREATE PROCEDURE sp_GetAdminById(IN p_Id INT)
BEGIN
    SELECT id, Email, IsActive FROM admins WHERE id = p_Id;
END;

DROP PROCEDURE IF EXISTS sp_GetAdminByEmail;
CREATE PROCEDURE sp_GetAdminByEmail(IN p_Email VARCHAR(255))
BEGIN
    SELECT id, Email, Password, IsActive FROM admins WHERE Email = p_Email;
END;

DROP PROCEDURE IF EXISTS sp_CreateAdmin;
CREATE PROCEDURE sp_CreateAdmin(IN p_Email VARCHAR(255), IN p_Password VARCHAR(255), IN p_IsActive TINYINT(1))
BEGIN
    INSERT INTO admins (Email, Password, IsActive) VALUES (p_Email, p_Password, p_IsActive);
    SELECT LAST_INSERT_ID();
END;

DROP PROCEDURE IF EXISTS sp_UpdateAdminStatus;
CREATE PROCEDURE sp_UpdateAdminStatus(IN p_Id INT, IN p_IsActive TINYINT(1))
BEGIN
    UPDATE admins SET IsActive = p_IsActive WHERE id = p_Id;
END;

DROP PROCEDURE IF EXISTS sp_ChangeAdminPassword;
CREATE PROCEDURE sp_ChangeAdminPassword(IN p_Id INT, IN p_Password VARCHAR(255))
BEGIN
    UPDATE admins SET Password = p_Password WHERE id = p_Id;
END;
", suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
