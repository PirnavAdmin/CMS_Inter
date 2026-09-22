using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `Students` (
    `StudentId` int NOT NULL AUTO_INCREMENT,
    `AdmissionNo` varchar(30) CHARACTER SET utf8mb4 NOT NULL,
    `RollNo` varchar(30) CHARACTER SET utf8mb4 NOT NULL,
    `StudentName` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `Photo` varchar(500) CHARACTER SET utf8mb4 NULL,
    `Board` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `AcademicYearId` int NOT NULL,
    `AcademicLevel` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `GroupId` int NOT NULL,
    `Section` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `AdmissionDate` date NOT NULL,
    `ParentName` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `ParentMobile` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `FeeAmount` decimal(10,2) NOT NULL,
    `FeePaid` decimal(10,2) NOT NULL,
    `AttendancePercentage` decimal(5,2) NOT NULL,
    `PerformanceGrade` varchar(20) CHARACTER SET utf8mb4 NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Students` PRIMARY KEY (`StudentId`)
) CHARACTER SET=utf8mb4;
", suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
