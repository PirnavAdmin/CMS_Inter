using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAssignmentSubmissionsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `AssignmentSubmissions` (
    `SubmissionId` int NOT NULL AUTO_INCREMENT,
    `AssignmentId` int NOT NULL,
    `StudentId` int NOT NULL,
    `SubmissionDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `FileUrl` varchar(500) CHARACTER SET utf8mb4 NULL,
    `Status` varchar(30) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'Submitted',
    `MarksObtained` decimal(10,2) NULL,
    `Feedback` varchar(500) CHARACTER SET utf8mb4 NULL,
    CONSTRAINT `PK_AssignmentSubmissions` PRIMARY KEY (`SubmissionId`),
    CONSTRAINT `FK_AssignmentSubmissions_Assignments_AssignmentId` FOREIGN KEY (`AssignmentId`) REFERENCES `Assignments` (`AssignmentId`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;
", suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
