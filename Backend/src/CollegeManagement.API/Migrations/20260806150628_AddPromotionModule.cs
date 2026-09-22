using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPromotionModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `Admissions` (
    `AdmissionId` bigint NOT NULL AUTO_INCREMENT,
    `AdmissionNo` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `AdmissionDate` datetime(6) NOT NULL,
    `StudentPhoto` varchar(500) CHARACTER SET utf8mb4 NULL,
    `FirstName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `LastName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Gender` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `DOB` datetime(6) NOT NULL,
    `Aadhaar` varchar(12) CHARACTER SET utf8mb4 NOT NULL,
    `BloodGroup` varchar(10) CHARACTER SET utf8mb4 NULL,
    `Nationality` varchar(50) CHARACTER SET utf8mb4 NULL,
    `Religion` varchar(50) CHARACTER SET utf8mb4 NULL,
    `Caste` varchar(100) CHARACTER SET utf8mb4 NULL,
    `Category` varchar(50) CHARACTER SET utf8mb4 NULL,
    `FatherName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `MotherName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Guardian` varchar(100) CHARACTER SET utf8mb4 NULL,
    `ParentMobile` varchar(15) CHARACTER SET utf8mb4 NOT NULL,
    `ParentEmail` varchar(150) CHARACTER SET utf8mb4 NULL,
    `Occupation` varchar(100) CHARACTER SET utf8mb4 NULL,
    `AnnualIncome` decimal(65,30) NULL,
    `Address` varchar(500) CHARACTER SET utf8mb4 NULL,
    `City` varchar(100) CHARACTER SET utf8mb4 NULL,
    `District` varchar(100) CHARACTER SET utf8mb4 NULL,
    `State` varchar(100) CHARACTER SET utf8mb4 NULL,
    `Pincode` varchar(10) CHARACTER SET utf8mb4 NULL,
    `BoardId` int NOT NULL,
    `AcademicYearId` int NOT NULL,
    `AcademicLevelId` int NOT NULL,
    `GroupId` int NOT NULL,
    `SectionId` int NOT NULL,
    `PreviousSchool` varchar(200) CHARACTER SET utf8mb4 NULL,
    `PreviousBoard` varchar(100) CHARACTER SET utf8mb4 NULL,
    `PreviousPercentage` decimal(65,30) NULL,
    `BirthCertificatePath` varchar(500) CHARACTER SET utf8mb4 NULL,
    `TransferCertificatePath` varchar(500) CHARACTER SET utf8mb4 NULL,
    `StudyCertificatePath` varchar(500) CHARACTER SET utf8mb4 NULL,
    `AadhaarCardPath` varchar(500) CHARACTER SET utf8mb4 NULL,
    `CommunityCertificatePath` varchar(500) CHARACTER SET utf8mb4 NULL,
    `IncomeCertificatePath` varchar(500) CHARACTER SET utf8mb4 NULL,
    `PassportPhotoPath` varchar(500) CHARACTER SET utf8mb4 NULL,
    `Status` varchar(20) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'PENDING',
    `IsVerified` tinyint(1) NOT NULL DEFAULT '0',
    `IsApproved` tinyint(1) NOT NULL DEFAULT '0',
    `IsRejected` tinyint(1) NOT NULL DEFAULT '0',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Admissions` PRIMARY KEY (`AdmissionId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `PromotionHistories` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `StudentId` int NOT NULL,
    `FromAcademicYearId` int NOT NULL,
    `FromAcademicLevelId` int NOT NULL,
    `FromGroupId` int NOT NULL,
    `FromSectionId` int NOT NULL,
    `ToAcademicYearId` int NOT NULL,
    `ToAcademicLevelId` int NOT NULL,
    `ToGroupId` int NOT NULL,
    `ToSectionId` int NOT NULL,
    `PromotionStatus` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `PromotedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `Remarks` varchar(500) CHARACTER SET utf8mb4 NULL,
    `CreatedBy` int NOT NULL,
    CONSTRAINT `PK_PromotionHistories` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;
", suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
