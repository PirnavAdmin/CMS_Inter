using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAssignmentsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `Assignments` (
    `AssignmentId` int NOT NULL AUTO_INCREMENT,
    `Title` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
    `SubjectId` int NOT NULL,
    `FacultyId` int NOT NULL,
    `AcademicYearId` int NOT NULL,
    `AcademicLevel` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `Description` varchar(1000) CHARACTER SET utf8mb4 NULL,
    `DueDate` datetime(6) NOT NULL,
    `Attachment` varchar(500) CHARACTER SET utf8mb4 NULL,
    `MaximumMarks` decimal(10,2) NOT NULL DEFAULT '100.00',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Assignments` PRIMARY KEY (`AssignmentId`)
) CHARACTER SET=utf8mb4;
", suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
