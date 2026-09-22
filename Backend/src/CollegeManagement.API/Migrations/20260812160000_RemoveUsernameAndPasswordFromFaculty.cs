using CollegeManagement.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260812160000_RemoveUsernameAndPasswordFromFaculty")]
    public partial class RemoveUsernameAndPasswordFromFaculty : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Faculties' AND COLUMN_NAME = 'Username');
SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE `Faculties` DROP COLUMN `Username`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Faculties' AND COLUMN_NAME = 'Password');
SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE `Faculties` DROP COLUMN `Password`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
