using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `AcademicYears` (
    `AcademicYearId` int NOT NULL AUTO_INCREMENT,
    `AcademicYearName` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `StartDate` date NOT NULL,
    `EndDate` date NOT NULL,
    `AdmissionStartDate` date NOT NULL,
    `AdmissionEndDate` date NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    CONSTRAINT `PK_AcademicYears` PRIMARY KEY (`AcademicYearId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Groups` (
    `GroupId` int NOT NULL AUTO_INCREMENT,
    `Board` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `AcademicYearId` int NOT NULL,
    `AcademicLevel` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `GroupName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `GroupCode` varchar(30) CHARACTER SET utf8mb4 NOT NULL,
    `Description` varchar(500) CHARACTER SET utf8mb4 NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT '1',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Groups` PRIMARY KEY (`GroupId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `OTPs` (
    `OTPId` int NOT NULL AUTO_INCREMENT,
    `Email` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `OTPCode` varchar(6) CHARACTER SET utf8mb4 NOT NULL,
    `ExpiryTime` datetime(6) NOT NULL,
    `IsUsed` tinyint(1) NOT NULL,
    CONSTRAINT `PK_OTPs` PRIMARY KEY (`OTPId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Roles` (
    `RoleId` int NOT NULL AUTO_INCREMENT,
    `RoleName` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    CONSTRAINT `PK_Roles` PRIMARY KEY (`RoleId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Subjects` (
    `SubjectId` int NOT NULL AUTO_INCREMENT,
    `Board` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Group` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `AcademicLevel` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `SubjectName` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `SubjectCode` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `SubjectType` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `Theory` tinyint(1) NOT NULL,
    `Practical` tinyint(1) NOT NULL,
    `Language` tinyint(1) NOT NULL,
    `Elective` tinyint(1) NOT NULL,
    `InternalMarks` int NOT NULL,
    `PracticalMarks` int NOT NULL,
    `ExternalMarks` int NOT NULL,
    `TotalMarks` int NOT NULL,
    `PassingMarks` int NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    CONSTRAINT `PK_Subjects` PRIMARY KEY (`SubjectId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Users` (
    `UserId` int NOT NULL AUTO_INCREMENT,
    `FullName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Email` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `PasswordHash` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `PhoneNumber` varchar(15) CHARACTER SET utf8mb4 NOT NULL,
    `RoleId` int NOT NULL,
    CONSTRAINT `PK_Users` PRIMARY KEY (`UserId`)
) CHARACTER SET=utf8mb4;
", suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
