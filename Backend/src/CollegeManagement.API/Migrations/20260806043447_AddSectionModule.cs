using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSectionModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `Sections` (
    `SectionId` int NOT NULL AUTO_INCREMENT,
    `Board` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `AcademicYearId` int NOT NULL,
    `Group` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `AcademicLevel` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `SectionName` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `RoomNumber` varchar(50) CHARACTER SET utf8mb4 NULL,
    `ClassTeacherId` int NULL,
    `MaximumStrength` int NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Sections` PRIMARY KEY (`SectionId`)
) CHARACTER SET=utf8mb4;

DROP PROCEDURE IF EXISTS sp_GetAllSections;
CREATE PROCEDURE sp_GetAllSections()
BEGIN
    SELECT s.SectionId, s.Board, s.AcademicYearId, ay.AcademicYearName, s.Group, s.AcademicLevel,
           s.SectionName, s.RoomNumber, s.ClassTeacherId, 
           COALESCE(CONCAT(f.FirstName, ' ', f.LastName), '') AS ClassTeacherName,
           s.MaximumStrength, s.IsActive, s.CreatedAt, s.UpdatedAt
    FROM Sections s
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN Faculties f ON f.Id = s.ClassTeacherId
    ORDER BY s.SectionId DESC;
END;

DROP PROCEDURE IF EXISTS sp_GetSectionById;
CREATE PROCEDURE sp_GetSectionById(IN p_SectionId INT)
BEGIN
    SELECT s.SectionId, s.Board, s.AcademicYearId, ay.AcademicYearName, s.Group, s.AcademicLevel,
           s.SectionName, s.RoomNumber, s.ClassTeacherId, 
           COALESCE(CONCAT(f.FirstName, ' ', f.LastName), '') AS ClassTeacherName,
           s.MaximumStrength, s.IsActive, s.CreatedAt, s.UpdatedAt
    FROM Sections s
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN Faculties f ON f.Id = s.ClassTeacherId
    WHERE s.SectionId = p_SectionId;
END;

DROP PROCEDURE IF EXISTS sp_CreateSection;
CREATE PROCEDURE sp_CreateSection(
    IN p_Board VARCHAR(100),
    IN p_AcademicYearId INT,
    IN p_Group VARCHAR(100),
    IN p_AcademicLevel VARCHAR(50),
    IN p_SectionName VARCHAR(50),
    IN p_RoomNumber VARCHAR(50),
    IN p_ClassTeacherId INT,
    IN p_MaximumStrength INT,
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO Sections (Board, AcademicYearId, `Group`, AcademicLevel, SectionName, RoomNumber, ClassTeacherId, MaximumStrength, IsActive, CreatedAt)
    VALUES (p_Board, p_AcademicYearId, p_Group, p_AcademicLevel, p_SectionName, p_RoomNumber, p_ClassTeacherId, p_MaximumStrength, p_IsActive, UTC_TIMESTAMP());
    SELECT LAST_INSERT_ID();
END;
", suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
