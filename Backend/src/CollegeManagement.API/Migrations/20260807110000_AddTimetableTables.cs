using System;
using CollegeManagement.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260807110000_AddTimetableTables")]
    public partial class AddTimetableTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Timetables' AND COLUMN_NAME = 'BoardId');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Timetables` ADD COLUMN `BoardId` INT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Timetables' AND COLUMN_NAME = 'AcademicLevelId');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Timetables` ADD COLUMN `AcademicLevelId` INT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Timetables' AND COLUMN_NAME = 'GroupId');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Timetables` ADD COLUMN `GroupId` INT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Timetables' AND COLUMN_NAME = 'IsPublished');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Timetables` ADD COLUMN `IsPublished` TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Timetables' AND COLUMN_NAME = 'Remarks');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Timetables` ADD COLUMN `Remarks` VARCHAR(250) NULL', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `Periods` (
    `PeriodId` int NOT NULL AUTO_INCREMENT,
    `PeriodName` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `StartTime` time NOT NULL,
    `EndTime` time NOT NULL,
    `DisplayOrder` int NOT NULL DEFAULT '1',
    `IsBreak` tinyint(1) NOT NULL DEFAULT '0',
    `IsActive` tinyint(1) NOT NULL DEFAULT '1',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Periods` PRIMARY KEY (`PeriodId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Rooms` (
    `RoomId` int NOT NULL AUTO_INCREMENT,
    `RoomCode` varchar(30) CHARACTER SET utf8mb4 NOT NULL,
    `RoomName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Capacity` int NOT NULL DEFAULT '60',
    `RoomType` varchar(50) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'Classroom',
    `Building` varchar(100) CHARACTER SET utf8mb4 NULL,
    `Floor` varchar(50) CHARACTER SET utf8mb4 NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT '1',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Rooms` PRIMARY KEY (`RoomId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Timetables` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `BoardId` int NOT NULL,
    `AcademicLevelId` int NOT NULL,
    `AcademicYearId` int NOT NULL,
    `GroupId` int NOT NULL,
    `SectionId` int NOT NULL,
    `DayOfWeek` int NOT NULL,
    `PeriodId` int NOT NULL,
    `SubjectId` int NOT NULL,
    `FacultyId` int NOT NULL,
    `RoomId` int NOT NULL,
    `IsPublished` tinyint(1) NOT NULL DEFAULT '0',
    `Remarks` varchar(250) CHARACTER SET utf8mb4 NULL,
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Timetables` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;
", suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
