using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddExaminationTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `Examinations` (
    `ExamId` int NOT NULL AUTO_INCREMENT,
    `ExamName` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `BoardId` int NOT NULL,
    `AcademicYearId` int NOT NULL,
    `AcademicLevelId` int NOT NULL,
    `GroupId` int NOT NULL,
    `AssessmentTypeId` int NOT NULL,
    `StartDate` datetime(6) NOT NULL,
    `EndDate` datetime(6) NOT NULL,
    `Status` varchar(50) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'Scheduled',
    `IsActive` tinyint(1) NOT NULL DEFAULT '1',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Examinations` PRIMARY KEY (`ExamId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ExamSchedules` (
    `ScheduleId` int NOT NULL AUTO_INCREMENT,
    `ExamId` int NOT NULL,
    `SubjectId` int NOT NULL,
    `ExamDate` datetime(6) NOT NULL,
    `StartTime` time NOT NULL,
    `EndTime` time NOT NULL,
    `MaxMarks` decimal(10,2) NOT NULL DEFAULT '100.00',
    `PassingMarks` decimal(10,2) NOT NULL DEFAULT '35.00',
    CONSTRAINT `PK_ExamSchedules` PRIMARY KEY (`ScheduleId`),
    CONSTRAINT `FK_ExamSchedules_Examinations_ExamId` FOREIGN KEY (`ExamId`) REFERENCES `Examinations` (`ExamId`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `HallTickets` (
    `HallTicketId` int NOT NULL AUTO_INCREMENT,
    `ExamId` int NOT NULL,
    `StudentId` int NOT NULL,
    `HallTicketNumber` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `IssueDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `Status` varchar(30) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'Issued',
    CONSTRAINT `PK_HallTickets` PRIMARY KEY (`HallTicketId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `InvigilatorAssignments` (
    `AssignmentId` int NOT NULL AUTO_INCREMENT,
    `ScheduleId` int NOT NULL,
    `FacultyId` int NOT NULL,
    `RoomNumber` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `DutyDate` datetime(6) NOT NULL,
    CONSTRAINT `PK_InvigilatorAssignments` PRIMARY KEY (`AssignmentId`)
) CHARACTER SET=utf8mb4;
", suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}