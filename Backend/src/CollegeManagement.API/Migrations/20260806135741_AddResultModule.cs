using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddResultModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `Results` (
    `ResultId` int NOT NULL AUTO_INCREMENT,
    `StudentId` int NOT NULL,
    `BoardId` int NOT NULL,
    `AcademicYearId` int NOT NULL,
    `AcademicLevelId` int NOT NULL,
    `GroupId` int NOT NULL,
    `ExamId` int NOT NULL,
    `SubjectId` int NOT NULL,
    `InternalMarks` decimal(5,2) NOT NULL,
    `PracticalMarks` decimal(5,2) NOT NULL,
    `ExternalMarks` decimal(5,2) NOT NULL,
    `TotalMarks` decimal(5,2) NOT NULL,
    `Grade` varchar(10) CHARACTER SET utf8mb4 NOT NULL,
    `ResultStatus` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `Rank` int NULL,
    `PublishedDate` datetime(6) NULL,
    `IsPublished` tinyint(1) NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Results` PRIMARY KEY (`ResultId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Revaluations` (
    `RevaluationId` int NOT NULL AUTO_INCREMENT,
    `ResultId` int NOT NULL,
    `StudentId` int NOT NULL,
    `SubjectId` int NOT NULL,
    `Reason` varchar(500) CHARACTER SET utf8mb4 NOT NULL,
    `Status` varchar(20) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'Pending',
    `AppliedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedMarks` decimal(5,2) NULL,
    CONSTRAINT `PK_Revaluations` PRIMARY KEY (`RevaluationId`)
) CHARACTER SET=utf8mb4;
", suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
