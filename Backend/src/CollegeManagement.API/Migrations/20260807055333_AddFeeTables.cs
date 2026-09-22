using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddFeeTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `FeeStructures` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `BoardId` int NOT NULL,
    `AcademicYearId` int NOT NULL,
    `GroupId` int NOT NULL,
    `FeeType` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Amount` decimal(10,2) NOT NULL,
    `DueDate` datetime(6) NOT NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT '1',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT `PK_FeeStructures` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `FeeCollections` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `StudentId` int NOT NULL,
    `FeeStructureId` int NOT NULL,
    `PaidAmount` decimal(10,2) NOT NULL,
    `PaymentDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `PaymentMode` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `TransactionId` varchar(100) CHARACTER SET utf8mb4 NULL,
    `ReceiptNumber` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `Remarks` varchar(500) CHARACTER SET utf8mb4 NULL,
    CONSTRAINT `PK_FeeCollections` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `StudentFees` (
    `StudentFeeId` int NOT NULL AUTO_INCREMENT,
    `StudentId` int NOT NULL,
    `FeeStructureId` int NOT NULL,
    `TotalAmount` decimal(10,2) NOT NULL,
    `PaidAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
    `DueAmount` decimal(10,2) NOT NULL,
    `FeeStatus` varchar(30) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'Pending',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT `PK_StudentFees` PRIMARY KEY (`StudentFeeId`)
) CHARACTER SET=utf8mb4;
", suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
