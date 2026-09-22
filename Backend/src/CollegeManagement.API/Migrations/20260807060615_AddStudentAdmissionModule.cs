using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentAdmissionModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `StudentAdmissions` (
    `AdmissionId` int NOT NULL AUTO_INCREMENT,
    `AdmissionNo` varchar(30) CHARACTER SET utf8mb4 NOT NULL,
    `AdmissionDate` datetime(6) NOT NULL,
    `FirstName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `LastName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Gender` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `DateOfBirth` datetime(6) NOT NULL,
    `BloodGroup` varchar(10) CHARACTER SET utf8mb4 NULL,
    `StudentPhoto` varchar(500) CHARACTER SET utf8mb4 NULL,
    `AadhaarNumber` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `Nationality` varchar(100) CHARACTER SET utf8mb4 NULL,
    `Religion` varchar(100) CHARACTER SET utf8mb4 NULL,
    `Category` varchar(100) CHARACTER SET utf8mb4 NULL,
    `FatherName` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `MotherName` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `GuardianName` varchar(150) CHARACTER SET utf8mb4 NULL,
    `ParentMobile` varchar(15) CHARACTER SET utf8mb4 NOT NULL,
    `ParentEmail` varchar(150) CHARACTER SET utf8mb4 NULL,
    `Occupation` varchar(100) CHARACTER SET utf8mb4 NULL,
    `AnnualIncome` decimal(18,2) NULL,
    `Address` varchar(500) CHARACTER SET utf8mb4 NULL,
    `City` varchar(100) CHARACTER SET utf8mb4 NULL,
    `District` varchar(100) CHARACTER SET utf8mb4 NULL,
    `State` varchar(100) CHARACTER SET utf8mb4 NULL,
    `Pincode` varchar(10) CHARACTER SET utf8mb4 NULL,
    `BoardId` int NOT NULL,
    `AcademicYearId` int NOT NULL,
    `AcademicLevel` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `GroupId` int NOT NULL,
    `SectionId` int NOT NULL,
    `PreviousSchool` varchar(200) CHARACTER SET utf8mb4 NULL,
    `PreviousBoard` varchar(100) CHARACTER SET utf8mb4 NULL,
    `PreviousPercentage` decimal(5,2) NULL,
    `BirthCertificate` varchar(500) CHARACTER SET utf8mb4 NULL,
    `TransferCertificate` varchar(500) CHARACTER SET utf8mb4 NULL,
    `StudyCertificate` varchar(500) CHARACTER SET utf8mb4 NULL,
    `AadhaarDocument` varchar(500) CHARACTER SET utf8mb4 NULL,
    `CommunityCertificate` varchar(500) CHARACTER SET utf8mb4 NULL,
    `IncomeCertificate` varchar(500) CHARACTER SET utf8mb4 NULL,
    `PassportPhoto` varchar(500) CHARACTER SET utf8mb4 NULL,
    `Status` varchar(50) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'Pending',
    `IsVerified` tinyint(1) NOT NULL DEFAULT '0',
    `IsApproved` tinyint(1) NOT NULL DEFAULT '0',
    `IsRejected` tinyint(1) NOT NULL DEFAULT '0',
    `IsActive` tinyint(1) NOT NULL DEFAULT '1',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_StudentAdmissions` PRIMARY KEY (`AdmissionId`)
) CHARACTER SET=utf8mb4;
", suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
