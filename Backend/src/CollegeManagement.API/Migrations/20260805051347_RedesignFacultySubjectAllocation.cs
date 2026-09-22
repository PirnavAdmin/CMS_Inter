using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class RedesignFacultySubjectAllocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Data Preservation & Table Schema Update
            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS `Departments` (
                  `DepartmentId` int(11) NOT NULL AUTO_INCREMENT,
                  `DepartmentName` varchar(100) NOT NULL,
                  `DepartmentCode` varchar(20) NOT NULL,
                  `IsActive` tinyint(1) NOT NULL DEFAULT 1,
                  `CreatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
                  `UpdatedAt` datetime(6) DEFAULT NULL,
                  PRIMARY KEY (`DepartmentId`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

                CREATE TABLE IF NOT EXISTS `Sections` (
                  `SectionId` int(11) NOT NULL AUTO_INCREMENT,
                  `SectionName` varchar(50) NOT NULL,
                  `IsActive` tinyint(1) NOT NULL DEFAULT 1,
                  `CreatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
                  `UpdatedAt` datetime(6) DEFAULT NULL,
                  PRIMARY KEY (`SectionId`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

                CREATE TABLE IF NOT EXISTS `Faculties` (
                  `Id` int(11) NOT NULL AUTO_INCREMENT,
                  `EmployeeId` varchar(50) NOT NULL,
                  `FirstName` varchar(100) NOT NULL,
                  `LastName` varchar(100) NOT NULL,
                  `Gender` varchar(20) NOT NULL,
                  `DateOfBirth` datetime(6) NOT NULL,
                  `Aadhaar` varchar(12) NOT NULL,
                  `Mobile` varchar(15) NOT NULL,
                  `Email` varchar(150) NOT NULL,
                  `BloodGroup` varchar(10) DEFAULT NULL,
                  `Qualification` varchar(100) NOT NULL,
                  `Designation` varchar(100) NOT NULL,
                  `DepartmentId` int(11) NOT NULL DEFAULT 0,
                  `JoiningDate` datetime(6) NOT NULL,
                  `Experience` decimal(65,30) NOT NULL DEFAULT 0,
                  `Username` varchar(100) NOT NULL,
                  `Password` varchar(255) NOT NULL,
                  `Status` varchar(20) NOT NULL DEFAULT 'Active',
                  `PhotoPath` varchar(500) DEFAULT NULL,
                  `CreatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
                  `UpdatedAt` datetime(6) DEFAULT NULL,
                  `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
                  PRIMARY KEY (`Id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

                CREATE TABLE IF NOT EXISTS `FacultySubjectAllocations` (
                  `Id` int(11) NOT NULL AUTO_INCREMENT,
                  `FacultyId` int(11) NOT NULL,
                  `BoardId` int(11) NOT NULL DEFAULT 0,
                  `AcademicLevelId` int(11) NOT NULL DEFAULT 0,
                  `AcademicYearId` int(11) NOT NULL DEFAULT 0,
                  `GroupId` int(11) NOT NULL DEFAULT 0,
                  `SectionId` int(11) NOT NULL DEFAULT 0,
                  `SubjectId` int(11) NOT NULL DEFAULT 0,
                  `CreatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
                  `UpdatedAt` datetime(6) DEFAULT NULL,
                  PRIMARY KEY (`Id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

                -- Ensure BoardId column exists
                SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'FacultySubjectAllocations' AND COLUMN_NAME = 'BoardId');
                SET @stmt := IF(@col_exists = 0, 'ALTER TABLE `FacultySubjectAllocations` ADD COLUMN `BoardId` INT NOT NULL DEFAULT 0;', 'SELECT 1;');
                PREPARE stmt FROM @stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- Ensure AcademicLevelId column exists
                SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'FacultySubjectAllocations' AND COLUMN_NAME = 'AcademicLevelId');
                SET @stmt := IF(@col_exists = 0, 'ALTER TABLE `FacultySubjectAllocations` ADD COLUMN `AcademicLevelId` INT NOT NULL DEFAULT 0;', 'SELECT 1;');
                PREPARE stmt FROM @stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- Backfill BoardId from Boards table if Board column exists
                SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'FacultySubjectAllocations' AND COLUMN_NAME = 'Board');
                SET @stmt := IF(@col_exists > 0, 'UPDATE FacultySubjectAllocations fsa JOIN Boards b ON fsa.Board = b.BoardName OR fsa.Board = b.BoardCode SET fsa.BoardId = b.BoardId WHERE fsa.BoardId = 0 OR fsa.BoardId IS NULL;', 'SELECT 1;');
                PREPARE stmt FROM @stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- Backfill AcademicLevelId from AcademicLevels table if AcademicLevel column exists
                SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'FacultySubjectAllocations' AND COLUMN_NAME = 'AcademicLevel');
                SET @stmt := IF(@col_exists > 0, 'UPDATE FacultySubjectAllocations fsa JOIN AcademicLevels al ON fsa.AcademicLevel = al.LevelName OR fsa.AcademicLevel = al.LevelCode SET fsa.AcademicLevelId = al.AcademicLevelId WHERE fsa.AcademicLevelId = 0 OR fsa.AcademicLevelId IS NULL;', 'SELECT 1;');
                PREPARE stmt FROM @stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- Drop legacy text columns safely
                SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'FacultySubjectAllocations' AND COLUMN_NAME = 'Board');
                SET @stmt := IF(@col_exists > 0, 'ALTER TABLE `FacultySubjectAllocations` DROP COLUMN `Board`;', 'SELECT 1;');
                PREPARE stmt FROM @stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'FacultySubjectAllocations' AND COLUMN_NAME = 'AcademicYear');
                SET @stmt := IF(@col_exists > 0, 'ALTER TABLE `FacultySubjectAllocations` DROP COLUMN `AcademicYear`;', 'SELECT 1;');
                PREPARE stmt FROM @stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'FacultySubjectAllocations' AND COLUMN_NAME = 'Group');
                SET @stmt := IF(@col_exists > 0, 'ALTER TABLE `FacultySubjectAllocations` DROP COLUMN `Group`;', 'SELECT 1;');
                PREPARE stmt FROM @stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'FacultySubjectAllocations' AND COLUMN_NAME = 'AcademicLevel');
                SET @stmt := IF(@col_exists > 0, 'ALTER TABLE `FacultySubjectAllocations` DROP COLUMN `AcademicLevel`;', 'SELECT 1;');
                PREPARE stmt FROM @stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'FacultySubjectAllocations' AND COLUMN_NAME = 'Section');
                SET @stmt := IF(@col_exists > 0, 'ALTER TABLE `FacultySubjectAllocations` DROP COLUMN `Section`;', 'SELECT 1;');
                PREPARE stmt FROM @stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'FacultySubjectAllocations' AND COLUMN_NAME = 'Subject');
                SET @stmt := IF(@col_exists > 0, 'ALTER TABLE `FacultySubjectAllocations` DROP COLUMN `Subject`;', 'SELECT 1;');
                PREPARE stmt FROM @stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            """);

            // 2. Stored Procedures
            migrationBuilder.Sql("""
                DROP PROCEDURE IF EXISTS sp_CreateSubjectAllocation;
            """);
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_CreateSubjectAllocation(
                    IN p_FacultyId INT,
                    IN p_BoardId INT,
                    IN p_AcademicLevelId INT,
                    IN p_AcademicYearId INT,
                    IN p_GroupId INT,
                    IN p_SectionId INT,
                    IN p_SubjectId INT
                )
                BEGIN
                    INSERT INTO FacultySubjectAllocations (
                        FacultyId,
                        BoardId,
                        AcademicLevelId,
                        AcademicYearId,
                        GroupId,
                        SectionId,
                        SubjectId,
                        CreatedAt
                    ) VALUES (
                        p_FacultyId,
                        p_BoardId,
                        p_AcademicLevelId,
                        p_AcademicYearId,
                        p_GroupId,
                        p_SectionId,
                        p_SubjectId,
                        NOW()
                    );

                    SELECT LAST_INSERT_ID() AS Id;
                END;
            """);

            migrationBuilder.Sql("""
                DROP PROCEDURE IF EXISTS sp_UpdateSubjectAllocation;
            """);
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_UpdateSubjectAllocation(
                    IN p_Id INT,
                    IN p_BoardId INT,
                    IN p_AcademicLevelId INT,
                    IN p_AcademicYearId INT,
                    IN p_GroupId INT,
                    IN p_SectionId INT,
                    IN p_SubjectId INT
                )
                BEGIN
                    UPDATE FacultySubjectAllocations
                    SET
                        BoardId = p_BoardId,
                        AcademicLevelId = p_AcademicLevelId,
                        AcademicYearId = p_AcademicYearId,
                        GroupId = p_GroupId,
                        SectionId = p_SectionId,
                        SubjectId = p_SubjectId,
                        UpdatedAt = NOW()
                    WHERE Id = p_Id;
                END;
            """);

            migrationBuilder.Sql("""
                DROP PROCEDURE IF EXISTS sp_DeleteSubjectAllocation;
            """);
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_DeleteSubjectAllocation(
                    IN p_Id INT
                )
                BEGIN
                    DELETE FROM FacultySubjectAllocations
                    WHERE Id = p_Id;
                END;
            """);

            migrationBuilder.Sql("""
                DROP PROCEDURE IF EXISTS sp_GetSubjectAllocationById;
            """);
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetSubjectAllocationById(
                    IN p_Id INT
                )
                BEGIN
                    SELECT 
                        fsa.Id,
                        fsa.FacultyId,
                        fsa.BoardId,
                        fsa.AcademicLevelId,
                        fsa.AcademicYearId,
                        fsa.GroupId,
                        fsa.SectionId,
                        fsa.SubjectId,
                        fsa.CreatedAt,
                        fsa.UpdatedAt,

                        f.Id,
                        f.EmployeeId,
                        f.FirstName,
                        f.LastName,
                        f.Email,

                        b.BoardId,
                        b.BoardCode,
                        b.BoardName,

                        al.AcademicLevelId,
                        al.LevelCode,
                        al.LevelName,

                        ay.AcademicYearId,
                        ay.AcademicYearName,

                        g.GroupId,
                        g.GroupCode,
                        g.GroupName,

                        sec.SectionId,
                        sec.SectionName,

                        sub.SubjectId,
                        sub.SubjectCode,
                        sub.SubjectName
                    FROM FacultySubjectAllocations fsa
                    INNER JOIN Faculties f ON f.Id = fsa.FacultyId
                    INNER JOIN Boards b ON b.BoardId = fsa.BoardId
                    INNER JOIN AcademicLevels al ON al.AcademicLevelId = fsa.AcademicLevelId
                    INNER JOIN AcademicYears ay ON ay.AcademicYearId = fsa.AcademicYearId
                    INNER JOIN `Groups` g ON g.GroupId = fsa.GroupId
                    INNER JOIN Sections sec ON sec.SectionId = fsa.SectionId
                    INNER JOIN Subjects sub ON sub.SubjectId = fsa.SubjectId
                    WHERE fsa.Id = p_Id;
                END;
            """);

            migrationBuilder.Sql("""
                DROP PROCEDURE IF EXISTS sp_GetSubjectAllocationsByFacultyId;
            """);
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetSubjectAllocationsByFacultyId(
                    IN p_FacultyId INT
                )
                BEGIN
                    SELECT 
                        fsa.Id,
                        fsa.FacultyId,
                        fsa.BoardId,
                        fsa.AcademicLevelId,
                        fsa.AcademicYearId,
                        fsa.GroupId,
                        fsa.SectionId,
                        fsa.SubjectId,
                        fsa.CreatedAt,
                        fsa.UpdatedAt,

                        f.Id,
                        f.EmployeeId,
                        f.FirstName,
                        f.LastName,
                        f.Email,

                        b.BoardId,
                        b.BoardCode,
                        b.BoardName,

                        al.AcademicLevelId,
                        al.LevelCode,
                        al.LevelName,

                        ay.AcademicYearId,
                        ay.AcademicYearName,

                        g.GroupId,
                        g.GroupCode,
                        g.GroupName,

                        sec.SectionId,
                        sec.SectionName,

                        sub.SubjectId,
                        sub.SubjectCode,
                        sub.SubjectName
                    FROM FacultySubjectAllocations fsa
                    INNER JOIN Faculties f ON f.Id = fsa.FacultyId
                    INNER JOIN Boards b ON b.BoardId = fsa.BoardId
                    INNER JOIN AcademicLevels al ON al.AcademicLevelId = fsa.AcademicLevelId
                    INNER JOIN AcademicYears ay ON ay.AcademicYearId = fsa.AcademicYearId
                    INNER JOIN `Groups` g ON g.GroupId = fsa.GroupId
                    INNER JOIN Sections sec ON sec.SectionId = fsa.SectionId
                    INNER JOIN Subjects sub ON sub.SubjectId = fsa.SubjectId
                    WHERE fsa.FacultyId = p_FacultyId
                    ORDER BY fsa.Id DESC;
                END;
            """);

            migrationBuilder.Sql("""
                DROP PROCEDURE IF EXISTS sp_CheckDuplicateSubjectAllocation;
            """);
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_CheckDuplicateSubjectAllocation(
                    IN p_FacultyId INT,
                    IN p_BoardId INT,
                    IN p_AcademicLevelId INT,
                    IN p_AcademicYearId INT,
                    IN p_GroupId INT,
                    IN p_SectionId INT,
                    IN p_SubjectId INT,
                    IN p_ExcludeId INT
                )
                BEGIN
                    SELECT COUNT(*) 
                    FROM FacultySubjectAllocations
                    WHERE FacultyId = p_FacultyId
                      AND BoardId = p_BoardId
                      AND AcademicLevelId = p_AcademicLevelId
                      AND AcademicYearId = p_AcademicYearId
                      AND GroupId = p_GroupId
                      AND SectionId = p_SectionId
                      AND SubjectId = p_SubjectId
                      AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
                END;
            """);

            migrationBuilder.Sql("""
                DROP PROCEDURE IF EXISTS sp_GetFacultyById;
            """);
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetFacultyById(
                    IN p_Id INT
                )
                BEGIN
                    -- Result Set 1: Faculty Details
                    SELECT 
                        f.Id,
                        f.EmployeeId,
                        f.FirstName,
                        f.LastName,
                        f.Gender,
                        f.DateOfBirth,
                        f.Aadhaar,
                        f.Mobile,
                        f.Email,
                        f.BloodGroup,
                        f.Qualification,
                        f.Designation,
                        f.DepartmentId,
                        d.DepartmentName AS Department,
                        f.JoiningDate,
                        f.Experience,
                        f.Username,
                        f.Password,
                        f.Status,
                        f.PhotoPath,
                        f.CreatedAt,
                        f.UpdatedAt,
                        f.IsDeleted
                    FROM Faculties f
                    LEFT JOIN Departments d ON d.DepartmentId = f.DepartmentId
                    WHERE f.Id = p_Id AND f.IsDeleted = 0;

                    -- Result Set 2: Subject Allocations
                    SELECT 
                        fsa.Id,
                        fsa.FacultyId,
                        fsa.BoardId,
                        fsa.AcademicLevelId,
                        fsa.AcademicYearId,
                        fsa.GroupId,
                        fsa.SectionId,
                        fsa.SubjectId,
                        fsa.CreatedAt,
                        fsa.UpdatedAt
                    FROM FacultySubjectAllocations fsa
                    WHERE fsa.FacultyId = p_Id
                    ORDER BY fsa.Id DESC;
                END;
            """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CreateSubjectAllocation;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_UpdateSubjectAllocation;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_DeleteSubjectAllocation;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetSubjectAllocationById;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetSubjectAllocationsByFacultyId;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CheckDuplicateSubjectAllocation;");
        }
    }
}
