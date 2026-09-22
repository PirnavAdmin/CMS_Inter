using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddApprovalStatusToTimetable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Timetables' AND COLUMN_NAME = 'ApprovalStatus');
                SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Timetables` ADD COLUMN `ApprovalStatus` INT NOT NULL DEFAULT 0', 'SELECT 1');
                PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                UPDATE `Timetables`
                SET `ApprovalStatus` = IF(`IsPublished` = 1, 2, 0);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Timetables' AND COLUMN_NAME = 'ApprovalStatus');
                SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE `Timetables` DROP COLUMN `ApprovalStatus`', 'SELECT 1');
                PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");
        }
    }
}
