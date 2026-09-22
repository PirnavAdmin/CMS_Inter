using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddBoardModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `AcademicLevels` (
    `AcademicLevelId` int NOT NULL AUTO_INCREMENT,
    `LevelCode` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `LevelName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Description` varchar(500) CHARACTER SET utf8mb4 NULL,
    `DisplayOrder` int NOT NULL DEFAULT '1',
    `IsActive` tinyint(1) NOT NULL DEFAULT '1',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_AcademicLevels` PRIMARY KEY (`AcademicLevelId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `AcademicPatterns` (
    `AcademicPatternId` int NOT NULL AUTO_INCREMENT,
    `PatternCode` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `PatternName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Description` varchar(500) CHARACTER SET utf8mb4 NULL,
    `DisplayOrder` int NOT NULL DEFAULT '1',
    `IsActive` tinyint(1) NOT NULL DEFAULT '1',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_AcademicPatterns` PRIMARY KEY (`AcademicPatternId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `AssessmentTypes` (
    `AssessmentTypeId` int NOT NULL AUTO_INCREMENT,
    `TypeCode` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `TypeName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Description` varchar(500) CHARACTER SET utf8mb4 NULL,
    `DisplayOrder` int NOT NULL DEFAULT '1',
    `IsActive` tinyint(1) NOT NULL DEFAULT '1',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_AssessmentTypes` PRIMARY KEY (`AssessmentTypeId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Boards` (
    `BoardId` int NOT NULL AUTO_INCREMENT,
    `BoardCode` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `BoardName` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `CountryId` int NOT NULL,
    `StateId` int NOT NULL,
    `AcademicPatternId` int NOT NULL,
    `GradingSystemId` int NOT NULL,
    `PassingMarksPercentage` decimal(5,2) NOT NULL DEFAULT '35.00',
    `Description` varchar(500) CHARACTER SET utf8mb4 NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT '1',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Boards` PRIMARY KEY (`BoardId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Countries` (
    `CountryId` int NOT NULL AUTO_INCREMENT,
    `CountryCode` varchar(10) CHARACTER SET utf8mb4 NOT NULL,
    `CountryName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT '1',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT `PK_Countries` PRIMARY KEY (`CountryId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `GradingSystems` (
    `GradingSystemId` int NOT NULL AUTO_INCREMENT,
    `SystemCode` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `SystemName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Description` varchar(500) CHARACTER SET utf8mb4 NULL,
    `DisplayOrder` int NOT NULL DEFAULT '1',
    `IsActive` tinyint(1) NOT NULL DEFAULT '1',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_GradingSystems` PRIMARY KEY (`GradingSystemId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `States` (
    `StateId` int NOT NULL AUTO_INCREMENT,
    `CountryId` int NOT NULL,
    `StateCode` varchar(10) CHARACTER SET utf8mb4 NOT NULL,
    `StateName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT '1',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT `PK_States` PRIMARY KEY (`StateId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `BoardAcademicLevels` (
    `BoardId` int NOT NULL,
    `AcademicLevelId` int NOT NULL,
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT `PK_BoardAcademicLevels` PRIMARY KEY (`BoardId`, `AcademicLevelId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `BoardAssessments` (
    `BoardId` int NOT NULL,
    `AssessmentTypeId` int NOT NULL,
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT `PK_BoardAssessments` PRIMARY KEY (`BoardId`, `AssessmentTypeId`)
) CHARACTER SET=utf8mb4;
", suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
