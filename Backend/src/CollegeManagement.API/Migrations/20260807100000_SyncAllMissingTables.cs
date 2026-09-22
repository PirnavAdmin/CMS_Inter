using CollegeManagement.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260807100000_SyncAllMissingTables")]
    public partial class SyncAllMissingTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Sections' AND COLUMN_NAME = 'Board');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Sections` ADD COLUMN `Board` VARCHAR(100) NOT NULL DEFAULT \'\' AFTER `SectionId`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Sections' AND COLUMN_NAME = 'AcademicYearId');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Sections` ADD COLUMN `AcademicYearId` INT NOT NULL DEFAULT 1 AFTER `Board`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Sections' AND COLUMN_NAME = 'Group');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Sections` ADD COLUMN `Group` VARCHAR(100) NOT NULL DEFAULT \'\' AFTER `AcademicYearId`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Sections' AND COLUMN_NAME = 'AcademicLevel');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Sections` ADD COLUMN `AcademicLevel` VARCHAR(50) NOT NULL DEFAULT \'\' AFTER `Group`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Sections' AND COLUMN_NAME = 'RoomNumber');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Sections` ADD COLUMN `RoomNumber` VARCHAR(50) NULL AFTER `SectionName`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Sections' AND COLUMN_NAME = 'ClassTeacherId');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Sections` ADD COLUMN `ClassTeacherId` INT NULL AFTER `RoomNumber`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Sections' AND COLUMN_NAME = 'MaximumStrength');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Sections` ADD COLUMN `MaximumStrength` INT NOT NULL DEFAULT 60 AFTER `ClassTeacherId`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `Users` (
    `UserId` INT NOT NULL AUTO_INCREMENT,
    `Username` VARCHAR(100) NOT NULL,
    `Email` VARCHAR(100) NOT NULL,
    `PasswordHash` VARCHAR(255) NOT NULL,
    `PhoneNumber` VARCHAR(15) NULL,
    `RoleId` INT NOT NULL,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`UserId`),
    KEY `IX_Users_RoleId` (`RoleId`),
    CONSTRAINT `FK_Users_Roles_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `Roles` (`RoleId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `AcademicLevels` (
    `AcademicLevelId` INT NOT NULL AUTO_INCREMENT,
    `LevelCode` VARCHAR(50) NOT NULL,
    `LevelName` VARCHAR(100) NOT NULL,
    `Description` VARCHAR(500) NULL,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`AcademicLevelId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Students` (
    `StudentId` INT NOT NULL AUTO_INCREMENT,
    `AdmissionNo` VARCHAR(30) NOT NULL,
    `RollNo` VARCHAR(30) NOT NULL,
    `StudentName` VARCHAR(150) NOT NULL,
    `Photo` VARCHAR(500) NULL,
    `Gender` VARCHAR(20) NOT NULL,
    `DateOfBirth` DATE NOT NULL,
    `BloodGroup` VARCHAR(10) NULL,
    `Email` VARCHAR(150) NOT NULL,
    `MobileNumber` VARCHAR(20) NOT NULL,
    `AadhaarNumber` VARCHAR(20) NULL,
    `Address` VARCHAR(500) NULL,
    `Board` VARCHAR(100) NOT NULL,
    `AcademicYearId` INT NOT NULL,
    `AcademicLevel` VARCHAR(50) NOT NULL,
    `GroupId` INT NOT NULL,
    `Section` VARCHAR(20) NOT NULL,
    `AdmissionDate` DATE NOT NULL,
    `AdmissionType` VARCHAR(50) NULL,
    `Medium` VARCHAR(50) NULL,
    `PreviousSchool` VARCHAR(200) NULL,
    `PreviousHallTicketNumber` VARCHAR(50) NULL,
    `StudentCategory` VARCHAR(50) NULL,
    `ScholarshipStatus` VARCHAR(50) NULL,
    `FatherName` VARCHAR(150) NULL,
    `FatherMobile` VARCHAR(20) NULL,
    `MotherName` VARCHAR(150) NULL,
    `MotherMobile` VARCHAR(20) NULL,
    `GuardianName` VARCHAR(150) NULL,
    `GuardianMobile` VARCHAR(20) NULL,
    `FeeAmount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `FeePaid` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `ScholarshipAmount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `FeeStatus` VARCHAR(30) NULL,
    `AttendancePercentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `PerformanceGrade` VARCHAR(20) NULL,
    `CGPA` DECIMAL(5,2) NULL,
    `Rank` INT NULL,
    `Remarks` VARCHAR(500) NULL,
    `PasswordHash` VARCHAR(255) NOT NULL DEFAULT '',
    `IsFirstLogin` TINYINT(1) NOT NULL DEFAULT 1,
    `LastLogin` DATETIME(6) NULL,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`StudentId`),
    KEY `IX_Students_AcademicYearId` (`AcademicYearId`),
    KEY `IX_Students_GroupId` (`GroupId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Departments` (
    `DepartmentId` INT NOT NULL AUTO_INCREMENT,
    `DepartmentCode` VARCHAR(50) NOT NULL,
    `DepartmentName` VARCHAR(100) NOT NULL,
    `Description` VARCHAR(500) NULL,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`DepartmentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Assignments` (
    `AssignmentId` INT NOT NULL AUTO_INCREMENT,
    `Title` VARCHAR(200) NOT NULL,
    `SubjectId` INT NOT NULL,
    `FacultyId` INT NOT NULL,
    `AcademicYearId` INT NOT NULL,
    `AcademicLevel` VARCHAR(50) NOT NULL,
    `Description` VARCHAR(1000) NULL,
    `DueDate` DATETIME(6) NOT NULL,
    `Attachment` VARCHAR(500) NULL,
    `MaximumMarks` DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`AssignmentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `AssignmentSubmissions` (
    `SubmissionId` INT NOT NULL AUTO_INCREMENT,
    `AssignmentId` INT NOT NULL,
    `StudentId` INT NOT NULL,
    `SubmissionDate` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `FileUrl` VARCHAR(500) NULL,
    `Status` VARCHAR(30) NOT NULL DEFAULT 'Submitted',
    `MarksObtained` DECIMAL(10,2) NULL,
    `Feedback` VARCHAR(500) NULL,
    PRIMARY KEY (`SubmissionId`),
    KEY `IX_AssignmentSubmissions_AssignmentId` (`AssignmentId`),
    KEY `IX_AssignmentSubmissions_StudentId` (`StudentId`),
    CONSTRAINT `FK_AssignmentSubmissions_Assignments_AssignmentId` FOREIGN KEY (`AssignmentId`) REFERENCES `Assignments` (`AssignmentId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Examinations` (
    `ExamId` INT NOT NULL AUTO_INCREMENT,
    `ExamName` VARCHAR(150) NOT NULL,
    `BoardId` INT NOT NULL,
    `AcademicYearId` INT NOT NULL,
    `AcademicLevelId` INT NOT NULL,
    `GroupId` INT NOT NULL,
    `AssessmentTypeId` INT NOT NULL,
    `StartDate` DATETIME(6) NOT NULL,
    `EndDate` DATETIME(6) NOT NULL,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`ExamId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ExamSchedules` (
    `ScheduleId` INT NOT NULL AUTO_INCREMENT,
    `ExamId` INT NOT NULL,
    `SubjectId` INT NOT NULL,
    `ExamDate` DATETIME(6) NOT NULL,
    `StartTime` TIME NOT NULL,
    `EndTime` TIME NOT NULL,
    `MaxMarks` DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    `PassingMarks` DECIMAL(10,2) NOT NULL DEFAULT 35.00,
    PRIMARY KEY (`ScheduleId`),
    KEY `IX_ExamSchedules_ExamId` (`ExamId`),
    CONSTRAINT `FK_ExamSchedules_Examinations_ExamId` FOREIGN KEY (`ExamId`) REFERENCES `Examinations` (`ExamId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `HallTickets` (
    `HallTicketId` INT NOT NULL AUTO_INCREMENT,
    `ExamId` INT NOT NULL,
    `StudentId` INT NOT NULL,
    `HallTicketNumber` VARCHAR(50) NOT NULL,
    `IssueDate` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `Status` VARCHAR(30) NOT NULL DEFAULT 'Issued',
    PRIMARY KEY (`HallTicketId`),
    KEY `IX_HallTickets_ExamId` (`ExamId`),
    KEY `IX_HallTickets_StudentId` (`StudentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `InvigilatorAssignments` (
    `AssignmentId` INT NOT NULL AUTO_INCREMENT,
    `ScheduleId` INT NOT NULL,
    `FacultyId` INT NOT NULL,
    `RoomNumber` VARCHAR(50) NOT NULL,
    `DutyDate` DATETIME(6) NOT NULL,
    PRIMARY KEY (`AssignmentId`),
    KEY `IX_InvigilatorAssignments_ScheduleId` (`ScheduleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Marks` (
    `MarkId` INT NOT NULL AUTO_INCREMENT,
    `ExamId` INT NOT NULL,
    `SubjectId` INT NOT NULL,
    `StudentId` INT NOT NULL,
    `MarksObtained` DECIMAL(10,2) NOT NULL,
    `IsAbsent` TINYINT(1) NOT NULL DEFAULT 0,
    `Remarks` VARCHAR(250) NULL,
    PRIMARY KEY (`MarkId`),
    KEY `IX_Marks_ExamId` (`ExamId`),
    KEY `IX_Marks_StudentId` (`StudentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Results` (
    `ResultId` INT NOT NULL AUTO_INCREMENT,
    `ExamId` INT NOT NULL,
    `StudentId` INT NOT NULL,
    `TotalMarks` DECIMAL(10,2) NOT NULL,
    `Percentage` DECIMAL(5,2) NOT NULL,
    `Grade` VARCHAR(10) NOT NULL,
    `ResultStatus` VARCHAR(30) NOT NULL,
    `PublishedDate` DATETIME(6) NULL,
    PRIMARY KEY (`ResultId`),
    KEY `IX_Results_ExamId` (`ExamId`),
    KEY `IX_Results_StudentId` (`StudentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Revaluations` (
    `RevaluationId` INT NOT NULL AUTO_INCREMENT,
    `ResultId` INT NOT NULL,
    `StudentId` INT NOT NULL,
    `SubjectId` INT NOT NULL,
    `Reason` VARCHAR(500) NOT NULL,
    `Status` VARCHAR(30) NOT NULL DEFAULT 'Pending',
    `AppliedDate` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedMarks` DECIMAL(10,2) NULL,
    PRIMARY KEY (`RevaluationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `StudyMaterials` (
    `MaterialId` INT NOT NULL AUTO_INCREMENT,
    `Title` VARCHAR(200) NOT NULL,
    `SubjectId` INT NOT NULL,
    `FacultyId` INT NOT NULL,
    `AcademicYearId` INT NOT NULL,
    `FileUrl` VARCHAR(500) NOT NULL,
    `FileType` VARCHAR(50) NULL,
    `UploadedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`MaterialId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `StudentFees` (
    `StudentFeeId` INT NOT NULL AUTO_INCREMENT,
    `StudentId` INT NOT NULL,
    `FeeStructureId` INT NOT NULL,
    `TotalAmount` DECIMAL(10,2) NOT NULL,
    `PaidAmount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `DueAmount` DECIMAL(10,2) NOT NULL,
    `FeeStatus` VARCHAR(30) NOT NULL DEFAULT 'Pending',
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`StudentFeeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Periods` (
    `PeriodId` INT NOT NULL AUTO_INCREMENT,
    `PeriodName` VARCHAR(50) NOT NULL,
    `StartTime` TIME NOT NULL,
    `EndTime` TIME NOT NULL,
    `DisplayOrder` INT NOT NULL DEFAULT 1,
    `IsBreak` TINYINT(1) NOT NULL DEFAULT 0,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`PeriodId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Rooms` (
    `RoomId` INT NOT NULL AUTO_INCREMENT,
    `RoomNumber` VARCHAR(50) NOT NULL,
    `BuildingName` VARCHAR(100) NULL,
    `Floor` INT NULL,
    `Capacity` INT NOT NULL DEFAULT 60,
    `RoomType` VARCHAR(50) NULL DEFAULT 'Classroom',
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`RoomId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Timetables` (
    `TimetableId` INT NOT NULL AUTO_INCREMENT,
    `AcademicYearId` INT NOT NULL,
    `GroupId` INT NOT NULL,
    `SectionId` INT NOT NULL,
    `DayOfWeek` VARCHAR(20) NOT NULL,
    `PeriodId` INT NOT NULL,
    `SubjectId` INT NOT NULL,
    `FacultyId` INT NOT NULL,
    `RoomId` INT NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`TimetableId`),
    KEY `IX_Timetables_PeriodId` (`PeriodId`),
    KEY `IX_Timetables_RoomId` (`RoomId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
", suppressTransaction: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
