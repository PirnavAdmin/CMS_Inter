CREATE TABLE IF NOT EXISTS `__EFMigrationsHistory` (
    `MigrationId` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `ProductVersion` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
    CONSTRAINT `PK___EFMigrationsHistory` PRIMARY KEY (`MigrationId`)
) CHARACTER SET=utf8mb4;

START TRANSACTION;

ALTER DATABASE CHARACTER SET utf8mb4;

COMMIT;


CREATE TABLE IF NOT EXISTS `AcademicYears` (
    `AcademicYearId` int NOT NULL AUTO_INCREMENT,
    `AcademicYearName` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `StartDate` date NOT NULL,
    `EndDate` date NOT NULL,
    `AdmissionStartDate` date NOT NULL,
    `AdmissionEndDate` date NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    CONSTRAINT `PK_AcademicYears` PRIMARY KEY (`AcademicYearId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Groups` (
    `GroupId` int NOT NULL AUTO_INCREMENT,
    `Board` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `AcademicYearId` int NOT NULL,
    `AcademicLevel` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `GroupName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `GroupCode` varchar(30) CHARACTER SET utf8mb4 NOT NULL,
    `Description` varchar(500) CHARACTER SET utf8mb4 NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT '1',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Groups` PRIMARY KEY (`GroupId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `OTPs` (
    `OTPId` int NOT NULL AUTO_INCREMENT,
    `Email` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `OTPCode` varchar(6) CHARACTER SET utf8mb4 NOT NULL,
    `ExpiryTime` datetime(6) NOT NULL,
    `IsUsed` tinyint(1) NOT NULL,
    CONSTRAINT `PK_OTPs` PRIMARY KEY (`OTPId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Roles` (
    `RoleId` int NOT NULL AUTO_INCREMENT,
    `RoleName` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    CONSTRAINT `PK_Roles` PRIMARY KEY (`RoleId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Subjects` (
    `SubjectId` int NOT NULL AUTO_INCREMENT,
    `Board` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Group` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `AcademicLevel` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `SubjectName` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `SubjectCode` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `SubjectType` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `Theory` tinyint(1) NOT NULL,
    `Practical` tinyint(1) NOT NULL,
    `Language` tinyint(1) NOT NULL,
    `Elective` tinyint(1) NOT NULL,
    `InternalMarks` int NOT NULL,
    `PracticalMarks` int NOT NULL,
    `ExternalMarks` int NOT NULL,
    `TotalMarks` int NOT NULL,
    `PassingMarks` int NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    CONSTRAINT `PK_Subjects` PRIMARY KEY (`SubjectId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Users` (
    `UserId` int NOT NULL AUTO_INCREMENT,
    `FullName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Email` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `PasswordHash` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `PhoneNumber` varchar(15) CHARACTER SET utf8mb4 NOT NULL,
    `RoleId` int NOT NULL,
    CONSTRAINT `PK_Users` PRIMARY KEY (`UserId`)
) CHARACTER SET=utf8mb4;


START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260803110355_InitialCreate', '8.0.13');

COMMIT;


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


START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260803145604_AddBoardModule', '8.0.13');

COMMIT;

DROP PROCEDURE IF EXISTS sp_GetAllGroups;

    CREATE PROCEDURE sp_GetAllGroups()
BEGIN
    SELECT
        g.GroupId,
        g.Board,
        g.AcademicYearId,
        ay.AcademicYearName,
        g.AcademicLevel,
        g.GroupName,
        g.GroupCode,
        g.Description,
        0 AS TotalSubjects,
        g.IsActive,
        CASE
            WHEN g.IsActive = 1 THEN 'Active'
            ELSE 'Inactive'
        END AS Status,
        g.CreatedAt,
        g.UpdatedAt
    FROM `Groups` g
    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = g.AcademicYearId
    ORDER BY g.GroupId DESC;
END;

DROP PROCEDURE IF EXISTS sp_GetGroupById;

CREATE PROCEDURE sp_GetGroupById(
    IN p_GroupId INT
)
BEGIN
    SELECT
        g.GroupId,
        g.Board,
        g.AcademicYearId,
        ay.AcademicYearName,
        g.AcademicLevel,
        g.GroupName,
        g.GroupCode,
        g.Description,
        0 AS TotalSubjects,
        g.IsActive,
        CASE
            WHEN g.IsActive = 1 THEN 'Active'
            ELSE 'Inactive'
        END AS Status,
        g.CreatedAt,
        g.UpdatedAt
    FROM `Groups` g
    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = g.AcademicYearId
    WHERE g.GroupId = p_GroupId
    LIMIT 1;
END;

DROP PROCEDURE IF EXISTS sp_GetGroupsByBoard;

CREATE PROCEDURE sp_GetGroupsByBoard(
    IN p_Board VARCHAR(100)
)
BEGIN
    SELECT
        g.GroupId,
        g.Board,
        g.AcademicYearId,
        ay.AcademicYearName,
        g.AcademicLevel,
        g.GroupName,
        g.GroupCode,
        g.Description,
        0 AS TotalSubjects,
        g.IsActive,
        CASE
            WHEN g.IsActive = 1 THEN 'Active'
            ELSE 'Inactive'
        END AS Status,
        g.CreatedAt,
        g.UpdatedAt
    FROM `Groups` g
    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = g.AcademicYearId
    WHERE g.Board = p_Board
    ORDER BY g.GroupName ASC;
END;

DROP PROCEDURE IF EXISTS sp_CreateGroup;

CREATE PROCEDURE sp_CreateGroup(
    IN p_Board VARCHAR(100),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupName VARCHAR(100),
    IN p_GroupCode VARCHAR(30),
    IN p_Description VARCHAR(500),
    IN p_IsActive BOOLEAN
)
BEGIN
    DECLARE v_GroupId INT;

    IF p_Board IS NULL OR TRIM(p_Board) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Board is required';
    END IF;

    IF p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Valid AcademicYearId is required';
    END IF;

    IF p_AcademicLevel IS NULL OR TRIM(p_AcademicLevel) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Academic level is required';
    END IF;

    IF p_GroupName IS NULL OR TRIM(p_GroupName) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Group name is required';
    END IF;

    IF p_GroupCode IS NULL OR TRIM(p_GroupCode) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Group code is required';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM `Groups`
        WHERE GroupCode = TRIM(p_GroupCode)
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Group code already exists';
    END IF;

    INSERT INTO `Groups`
    (
        Board,
        AcademicYearId,
        AcademicLevel,
        GroupName,
        GroupCode,
        Description,
        IsActive,
        CreatedAt,
        UpdatedAt
    )
    VALUES
    (
        TRIM(p_Board),
        p_AcademicYearId,
        TRIM(p_AcademicLevel),
        TRIM(p_GroupName),
        TRIM(p_GroupCode),
        NULLIF(TRIM(p_Description), ''),
        IFNULL(p_IsActive, 1),
        UTC_TIMESTAMP(),
        NULL
    );

    SET v_GroupId = LAST_INSERT_ID();

    SELECT
        g.GroupId,
        g.Board,
        g.AcademicYearId,
        ay.AcademicYearName,
        g.AcademicLevel,
        g.GroupName,
        g.GroupCode,
        g.Description,
        0 AS TotalSubjects,
        g.IsActive,
        CASE
            WHEN g.IsActive = 1 THEN 'Active'
            ELSE 'Inactive'
        END AS Status,
        g.CreatedAt,
        g.UpdatedAt
    FROM `Groups` g
    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = g.AcademicYearId
    WHERE g.GroupId = v_GroupId;
END;

DROP PROCEDURE IF EXISTS sp_UpdateGroup;

CREATE PROCEDURE sp_UpdateGroup(
    IN p_GroupId INT,
    IN p_Board VARCHAR(100),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupName VARCHAR(100),
    IN p_GroupCode VARCHAR(30),
    IN p_Description VARCHAR(500),
    IN p_IsActive BOOLEAN
)
BEGIN
    IF NOT EXISTS
    (
        SELECT 1
        FROM `Groups`
        WHERE GroupId = p_GroupId
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Group not found';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM `Groups`
        WHERE GroupCode = TRIM(p_GroupCode)
          AND GroupId <> p_GroupId
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Group code already exists';
    END IF;

    UPDATE `Groups`
    SET
        Board = TRIM(p_Board),
        AcademicYearId = p_AcademicYearId,
        AcademicLevel = TRIM(p_AcademicLevel),
        GroupName = TRIM(p_GroupName),
        GroupCode = TRIM(p_GroupCode),
        Description = NULLIF(TRIM(p_Description), ''),
        IsActive = p_IsActive,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE GroupId = p_GroupId;

    SELECT
        g.GroupId,
        g.Board,
        g.AcademicYearId,
        ay.AcademicYearName,
        g.AcademicLevel,
        g.GroupName,
        g.GroupCode,
        g.Description,
        0 AS TotalSubjects,
        g.IsActive,
        CASE
            WHEN g.IsActive = 1 THEN 'Active'
            ELSE 'Inactive'
        END AS Status,
        g.CreatedAt,
        g.UpdatedAt
    FROM `Groups` g
    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = g.AcademicYearId
    WHERE g.GroupId = p_GroupId;
END;

DROP PROCEDURE IF EXISTS sp_DeleteGroup;

CREATE PROCEDURE sp_DeleteGroup(
    IN p_GroupId INT
)
BEGIN
    DELETE FROM `Groups`
    WHERE GroupId = p_GroupId;

    SELECT
        IF(ROW_COUNT() > 0, 1, 0) AS Deleted;
END;

DROP PROCEDURE IF EXISTS sp_ValidateGroupCode;

CREATE PROCEDURE sp_ValidateGroupCode(
    IN p_GroupCode VARCHAR(30),
    IN p_ExcludeGroupId INT
)
BEGIN
    SELECT
        EXISTS
        (
            SELECT 1
            FROM `Groups`
            WHERE GroupCode = TRIM(p_GroupCode)
              AND
              (
                  p_ExcludeGroupId IS NULL
                  OR GroupId <> p_ExcludeGroupId
              )
        ) AS `Exists`;
END;

START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260804104526_AddGroupStoredProcedures', '8.0.13');

COMMIT;

START TRANSACTION;

    DROP PROCEDURE IF EXISTS sp_GetAllGroups;

    CREATE PROCEDURE sp_GetAllGroups()
    BEGIN
        SELECT
            g.GroupId,
            g.Board,
            g.AcademicYearId,
            ay.AcademicYearName,
            g.AcademicLevel,
            g.GroupName,
            g.GroupCode,
            g.Description,
            0 AS TotalSubjects,
            g.IsActive,
            CASE
                WHEN g.IsActive = 1 THEN 'Active'
                ELSE 'Inactive'
            END AS Status,
            g.CreatedAt,
            g.UpdatedAt
        FROM `Groups` g
        LEFT JOIN AcademicYears ay
            ON ay.AcademicYearId = g.AcademicYearId
        ORDER BY g.GroupId DESC;
    END;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260804110954_UpdateGroupStoredProcedures', '8.0.13');

COMMIT;

START TRANSACTION;

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

    DROP PROCEDURE IF EXISTS sp_CreateSubjectAllocation;

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

    DROP PROCEDURE IF EXISTS sp_UpdateSubjectAllocation;

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

    DROP PROCEDURE IF EXISTS sp_DeleteSubjectAllocation;

    CREATE PROCEDURE sp_DeleteSubjectAllocation(
        IN p_Id INT
    )
    BEGIN
        DELETE FROM FacultySubjectAllocations
        WHERE Id = p_Id;
    END;

    DROP PROCEDURE IF EXISTS sp_GetSubjectAllocationById;

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

    DROP PROCEDURE IF EXISTS sp_GetSubjectAllocationsByFacultyId;

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

    DROP PROCEDURE IF EXISTS sp_CheckDuplicateSubjectAllocation;

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

    DROP PROCEDURE IF EXISTS sp_GetFacultyById;

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

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260805051347_RedesignFacultySubjectAllocation', '8.0.13');

COMMIT;

START TRANSACTION;

    DROP PROCEDURE IF EXISTS sp_GetFacultyById;

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

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260805072041_UpdateGetFacultyByIdProcedure', '8.0.13');

COMMIT;


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


START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260805095436_AddStudentModule', '8.0.13');

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS sp_GetAllStudents;

CREATE PROCEDURE sp_GetAllStudents()
BEGIN

    SELECT

        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,

        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,

        s.Board,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.Section,
        s.AdmissionDate,

        s.AdmissionType,
        s.Medium,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.StudentCategory,
        s.ScholarshipStatus,

        s.FatherName,
        s.FatherMobile,

        s.MotherName,
        s.MotherMobile,

        s.GuardianName,
        s.GuardianMobile,

        s.FeeAmount,
        s.FeePaid,
        s.ScholarshipAmount,
        s.FeeStatus,

        s.AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.Rank,
        s.Remarks,

        s.IsFirstLogin,
        s.LastLogin,

        s.IsActive,

        CASE
            WHEN s.IsActive = 1
            THEN 'Active'
            ELSE 'Inactive'
        END AS Status,

        s.CreatedAt,
        s.UpdatedAt

    FROM Students s

    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = s.AcademicYearId

    LEFT JOIN `Groups` g
        ON g.GroupId = s.GroupId

    ORDER BY s.StudentId DESC;

END;

DROP PROCEDURE IF EXISTS sp_GetStudentById;

CREATE PROCEDURE sp_GetStudentById
(
    IN p_StudentId INT
)
BEGIN

    SELECT

        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,

        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,
        s.AadhaarNumber,
        s.Address,

        s.Board,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.Section,
        s.AdmissionDate,

        s.AdmissionType,
        s.Medium,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.StudentCategory,
        s.ScholarshipStatus,

        s.FatherName,
        s.FatherMobile,

        s.MotherName,
        s.MotherMobile,

        s.GuardianName,
        s.GuardianMobile,

        s.FeeAmount,
        s.FeePaid,
        s.ScholarshipAmount,
        s.FeeStatus,

        s.AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.Rank,
        s.Remarks,

        s.IsFirstLogin,
        s.LastLogin,

        s.IsActive,

        CASE
            WHEN s.IsActive = 1
            THEN 'Active'
            ELSE 'Inactive'
        END AS Status,

        s.CreatedAt,
        s.UpdatedAt

    FROM Students s

    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = s.AcademicYearId

    LEFT JOIN `Groups` g
        ON g.GroupId = s.GroupId

    WHERE s.StudentId = p_StudentId

    LIMIT 1;

END;

DROP PROCEDURE IF EXISTS sp_CreateStudent;

CREATE PROCEDURE sp_CreateStudent
(
    IN p_AdmissionNo VARCHAR(30),
    IN p_RollNo VARCHAR(30),
    IN p_StudentName VARCHAR(150),
    IN p_Photo VARCHAR(500),

    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATE,
    IN p_BloodGroup VARCHAR(10),
    IN p_Email VARCHAR(150),
    IN p_MobileNumber VARCHAR(20),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Address VARCHAR(500),

    IN p_Board VARCHAR(100),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,
    IN p_Section VARCHAR(20),
    IN p_AdmissionDate DATE,

    IN p_AdmissionType VARCHAR(50),
    IN p_Medium VARCHAR(50),
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousHallTicketNumber VARCHAR(50),
    IN p_StudentCategory VARCHAR(50),
    IN p_ScholarshipStatus VARCHAR(50),

    IN p_FatherName VARCHAR(150),
    IN p_FatherMobile VARCHAR(20),
    IN p_MotherName VARCHAR(150),
    IN p_MotherMobile VARCHAR(20),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),

    IN p_FeeAmount DECIMAL(10,2),
    IN p_FeePaid DECIMAL(10,2),
    IN p_ScholarshipAmount DECIMAL(10,2),
    IN p_FeeStatus VARCHAR(30),

    IN p_AttendancePercentage DECIMAL(5,2),
    IN p_PerformanceGrade VARCHAR(20),
    IN p_CGPA DECIMAL(5,2),
    IN p_Rank INT,
    IN p_Remarks VARCHAR(500),

    IN p_PasswordHash VARCHAR(255),
    IN p_IsFirstLogin BOOLEAN,
    IN p_IsActive BOOLEAN
)
BEGIN

    DECLARE v_StudentId INT;

    IF p_AdmissionNo IS NULL OR TRIM(p_AdmissionNo) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Admission Number is required';
    END IF;

    IF p_RollNo IS NULL OR TRIM(p_RollNo) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Roll Number is required';
    END IF;

    IF p_StudentName IS NULL OR TRIM(p_StudentName) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student Name is required';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM Students
        WHERE AdmissionNo = p_AdmissionNo
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Admission Number already exists';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM Students
        WHERE RollNo = p_RollNo
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Roll Number already exists';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM Students
        WHERE Email = p_Email
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Email already exists';
    END IF;
        INSERT INTO Students
    (
        AdmissionNo,
        RollNo,
        StudentName,
        Photo,

        Gender,
        DateOfBirth,
        BloodGroup,
        Email,
        MobileNumber,
        AadhaarNumber,
        Address,

        Board,
        AcademicYearId,
        AcademicLevel,
        GroupId,
        Section,
        AdmissionDate,

        AdmissionType,
        Medium,
        PreviousSchool,
        PreviousHallTicketNumber,
        StudentCategory,
        ScholarshipStatus,

        FatherName,
        FatherMobile,
        MotherName,
        MotherMobile,
        GuardianName,
        GuardianMobile,

        FeeAmount,
        FeePaid,
        ScholarshipAmount,
        FeeStatus,

        AttendancePercentage,
        PerformanceGrade,
        CGPA,
        `Rank`,
        Remarks,

        PasswordHash,
        IsFirstLogin,
        IsActive,
        CreatedAt
    )
    VALUES
    (
        TRIM(p_AdmissionNo),
        TRIM(p_RollNo),
        TRIM(p_StudentName),
        p_Photo,

        p_Gender,
        p_DateOfBirth,
        p_BloodGroup,
        TRIM(p_Email),
        p_MobileNumber,
        p_AadhaarNumber,
        p_Address,

        p_Board,
        p_AcademicYearId,
        p_AcademicLevel,
        p_GroupId,
        p_Section,
        p_AdmissionDate,

        p_AdmissionType,
        p_Medium,
        p_PreviousSchool,
        p_PreviousHallTicketNumber,
        p_StudentCategory,
        p_ScholarshipStatus,

        p_FatherName,
        p_FatherMobile,
        p_MotherName,
        p_MotherMobile,
        p_GuardianName,
        p_GuardianMobile,

        p_FeeAmount,
        p_FeePaid,
        p_ScholarshipAmount,
        p_FeeStatus,

        p_AttendancePercentage,
        p_PerformanceGrade,
        p_CGPA,
        p_Rank,
        p_Remarks,

        p_PasswordHash,
        IFNULL(p_IsFirstLogin, TRUE),
        IFNULL(p_IsActive, TRUE),
        UTC_TIMESTAMP()
    );

    SET v_StudentId = LAST_INSERT_ID();
        SELECT

        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,

        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,
        s.AadhaarNumber,
        s.Address,

        s.Board,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.Section,
        s.AdmissionDate,

        s.AdmissionType,
        s.Medium,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.StudentCategory,
        s.ScholarshipStatus,

        s.FatherName,
        s.FatherMobile,

        s.MotherName,
        s.MotherMobile,

        s.GuardianName,
        s.GuardianMobile,

        s.FeeAmount,
        s.FeePaid,
        s.ScholarshipAmount,
        s.FeeStatus,

        s.AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.`Rank`,
        s.Remarks,

        s.IsFirstLogin,
        s.LastLogin,

        s.IsActive,

        CASE
            WHEN s.IsActive = 1
            THEN 'Active'
            ELSE 'Inactive'
        END AS Status,

        s.CreatedAt,
        s.UpdatedAt

    FROM Students s

    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = s.AcademicYearId

    LEFT JOIN `Groups` g
        ON g.GroupId = s.GroupId

    WHERE s.StudentId = v_StudentId;

END;

DROP PROCEDURE IF EXISTS sp_UpdateStudent;

CREATE PROCEDURE sp_UpdateStudent
(
    IN p_StudentId INT,

    IN p_AdmissionNo VARCHAR(30),
    IN p_RollNo VARCHAR(30),
    IN p_StudentName VARCHAR(150),
    IN p_Photo VARCHAR(500),

    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATE,
    IN p_BloodGroup VARCHAR(10),
    IN p_Email VARCHAR(150),
    IN p_MobileNumber VARCHAR(20),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Address VARCHAR(500),

    IN p_Board VARCHAR(100),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,
    IN p_Section VARCHAR(20),
    IN p_AdmissionDate DATE,

    IN p_AdmissionType VARCHAR(50),
    IN p_Medium VARCHAR(50),
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousHallTicketNumber VARCHAR(50),
    IN p_StudentCategory VARCHAR(50),
    IN p_ScholarshipStatus VARCHAR(50),

    IN p_FatherName VARCHAR(150),
    IN p_FatherMobile VARCHAR(20),
    IN p_MotherName VARCHAR(150),
    IN p_MotherMobile VARCHAR(20),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),

    IN p_FeeAmount DECIMAL(10,2),
    IN p_FeePaid DECIMAL(10,2),
    IN p_ScholarshipAmount DECIMAL(10,2),
    IN p_FeeStatus VARCHAR(30),

    IN p_AttendancePercentage DECIMAL(5,2),
    IN p_PerformanceGrade VARCHAR(20),
    IN p_CGPA DECIMAL(5,2),
    IN p_Rank INT,
    IN p_Remarks VARCHAR(500),

    IN p_PasswordHash VARCHAR(255),
    IN p_IsFirstLogin BOOLEAN,
    IN p_IsActive BOOLEAN
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM Students
        WHERE AdmissionNo = p_AdmissionNo
          AND StudentId <> p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Admission Number already exists';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM Students
        WHERE RollNo = p_RollNo
          AND StudentId <> p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Roll Number already exists';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM Students
        WHERE Email = p_Email
          AND StudentId <> p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Email already exists';
    END IF;
        UPDATE Students
    SET

        AdmissionNo = TRIM(p_AdmissionNo),
        RollNo = TRIM(p_RollNo),
        StudentName = TRIM(p_StudentName),
        Photo = p_Photo,

        -- Personal Information
        Gender = p_Gender,
        DateOfBirth = p_DateOfBirth,
        BloodGroup = p_BloodGroup,
        Email = TRIM(p_Email),
        MobileNumber = p_MobileNumber,
        AadhaarNumber = p_AadhaarNumber,
        Address = p_Address,

        -- Academic Information
        Board = p_Board,
        AcademicYearId = p_AcademicYearId,
        AcademicLevel = p_AcademicLevel,
        GroupId = p_GroupId,
        Section = p_Section,
        AdmissionDate = p_AdmissionDate,
        AdmissionType = p_AdmissionType,
        Medium = p_Medium,
        PreviousSchool = p_PreviousSchool,
        PreviousHallTicketNumber = p_PreviousHallTicketNumber,
        StudentCategory = p_StudentCategory,
        ScholarshipStatus = p_ScholarshipStatus,

        -- Parent Details
        FatherName = p_FatherName,
        FatherMobile = p_FatherMobile,
        MotherName = p_MotherName,
        MotherMobile = p_MotherMobile,
        GuardianName = p_GuardianName,
        GuardianMobile = p_GuardianMobile,

        -- Fee Information
        FeeAmount = p_FeeAmount,
        FeePaid = p_FeePaid,
        ScholarshipAmount = p_ScholarshipAmount,
        FeeStatus = p_FeeStatus,

        -- Performance
        AttendancePercentage = p_AttendancePercentage,
        PerformanceGrade = p_PerformanceGrade,
        CGPA = p_CGPA,
        `Rank` = p_Rank,
        Remarks = p_Remarks,

        -- Login
        PasswordHash = p_PasswordHash,
        IsFirstLogin = p_IsFirstLogin,

        -- Status
        IsActive = p_IsActive,
        UpdatedAt = UTC_TIMESTAMP()

    WHERE StudentId = p_StudentId;
        SELECT

        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,

        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,
        s.AadhaarNumber,
        s.Address,

        s.Board,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.Section,
        s.AdmissionDate,

        s.AdmissionType,
        s.Medium,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.StudentCategory,
        s.ScholarshipStatus,

        s.FatherName,
        s.FatherMobile,

        s.MotherName,
        s.MotherMobile,

        s.GuardianName,
        s.GuardianMobile,

        s.FeeAmount,
        s.FeePaid,
        s.ScholarshipAmount,
        s.FeeStatus,

        s.AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.`Rank`,
        s.Remarks,

        s.IsFirstLogin,
        s.LastLogin,

        s.IsActive,

        CASE
            WHEN s.IsActive = 1
            THEN 'Active'
            ELSE 'Inactive'
        END AS Status,

        s.CreatedAt,
        s.UpdatedAt

    FROM Students s

    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = s.AcademicYearId

    LEFT JOIN `Groups` g
        ON g.GroupId = s.GroupId

    WHERE s.StudentId = p_StudentId;

END;

DROP PROCEDURE IF EXISTS sp_DeleteStudent;

CREATE PROCEDURE sp_DeleteStudent
(
    IN p_StudentId INT
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    DELETE
    FROM Students
    WHERE StudentId = p_StudentId;

    SELECT
        IF(ROW_COUNT() > 0, 1, 0) AS Deleted;

END;

DROP PROCEDURE IF EXISTS sp_GetStudentProfile;

CREATE PROCEDURE sp_GetStudentProfile
(
    IN p_StudentId INT
)
BEGIN

    SELECT

        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,

        -- Personal Information
        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,
        s.AadhaarNumber,
        s.Address,

        -- Academic Information
        s.Board,
        ay.AcademicYearName,
        s.AcademicLevel,
        g.GroupName,
        s.Section,
        s.AdmissionDate,
        s.AdmissionType,
        s.Medium,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.StudentCategory,
        s.ScholarshipStatus,

        -- Parent Details
        s.FatherName,
        s.FatherMobile,
        s.MotherName,
        s.MotherMobile,
        s.GuardianName,
        s.GuardianMobile,

        -- Fee Information
        s.FeeAmount,
        s.FeePaid,
        s.ScholarshipAmount,
        s.FeeStatus,

        -- Performance
        s.AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.`Rank`,
        s.Remarks,

        -- Status
        s.IsActive,

        CASE
            WHEN s.IsActive = 1
            THEN 'Active'
            ELSE 'Inactive'
        END AS Status

    FROM Students s

    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = s.AcademicYearId

    LEFT JOIN `Groups` g
        ON g.GroupId = s.GroupId

    WHERE s.StudentId = p_StudentId

    LIMIT 1;

END;

DROP PROCEDURE IF EXISTS sp_UpdateStudentProfile;

CREATE PROCEDURE sp_UpdateStudentProfile
(
    IN p_StudentId INT,

    IN p_Photo VARCHAR(500),
    IN p_Email VARCHAR(150),
    IN p_MobileNumber VARCHAR(20),
    IN p_Address VARCHAR(500),

    IN p_FatherName VARCHAR(150),
    IN p_FatherMobile VARCHAR(20),

    IN p_MotherName VARCHAR(150),
    IN p_MotherMobile VARCHAR(20),

    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20)
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM Students
        WHERE Email = p_Email
          AND StudentId <> p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Email already exists';
    END IF;

    UPDATE Students
    SET
        Photo = p_Photo,
        Email = TRIM(p_Email),
        MobileNumber = p_MobileNumber,
        Address = p_Address,

        FatherName = p_FatherName,
        FatherMobile = p_FatherMobile,

        MotherName = p_MotherName,
        MotherMobile = p_MotherMobile,

        GuardianName = p_GuardianName,
        GuardianMobile = p_GuardianMobile,

        UpdatedAt = UTC_TIMESTAMP()

    WHERE StudentId = p_StudentId;

    SELECT

        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,

        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,
        s.AadhaarNumber,
        s.Address,

        s.Board,
        ay.AcademicYearName,
        s.AcademicLevel,
        g.GroupName,
        s.Section,
        s.AdmissionDate,

        s.AdmissionType,
        s.Medium,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.StudentCategory,
        s.ScholarshipStatus,

        s.FatherName,
        s.FatherMobile,

        s.MotherName,
        s.MotherMobile,

        s.GuardianName,
        s.GuardianMobile,

        s.FeeAmount,
        s.FeePaid,
        s.ScholarshipAmount,
        s.FeeStatus,

        s.AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.`Rank`,
        s.Remarks,

        s.IsActive,

        CASE
            WHEN s.IsActive = 1
            THEN 'Active'
            ELSE 'Inactive'
        END AS Status

    FROM Students s

    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = s.AcademicYearId

    LEFT JOIN `Groups` g
        ON g.GroupId = s.GroupId

    WHERE s.StudentId = p_StudentId;

END;

DROP PROCEDURE IF EXISTS sp_ChangeStudentSection;
DROP PROCEDURE IF EXISTS sp_ChangeStudentGroup;
DROP PROCEDURE IF EXISTS sp_TransferStudent;

CREATE PROCEDURE sp_ChangeStudentSection
(
    IN p_StudentId INT,
    IN p_Section VARCHAR(20)
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    UPDATE Students
    SET
        Section = TRIM(p_Section),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StudentId = p_StudentId;

END;

CREATE PROCEDURE sp_ChangeStudentGroup
(
    IN p_StudentId INT,
    IN p_GroupId INT
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    UPDATE Students
    SET
        GroupId = p_GroupId,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StudentId = p_StudentId;

END;

CREATE PROCEDURE sp_TransferStudent
(
    IN p_StudentId INT,
    IN p_Board VARCHAR(100),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,
    IN p_Section VARCHAR(20)
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    UPDATE Students
    SET
        Board = p_Board,
        AcademicYearId = p_AcademicYearId,
        AcademicLevel = p_AcademicLevel,
        GroupId = p_GroupId,
        Section = p_Section,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StudentId = p_StudentId;

END;

DROP PROCEDURE IF EXISTS sp_SuspendStudent;
DROP PROCEDURE IF EXISTS sp_ActivateStudent;
DROP PROCEDURE IF EXISTS sp_ResetStudentLogin;

CREATE PROCEDURE sp_SuspendStudent
(
    IN p_StudentId INT
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    UPDATE Students
    SET
        IsActive = 0,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS Success;

END;

CREATE PROCEDURE sp_ActivateStudent
(
    IN p_StudentId INT
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    UPDATE Students
    SET
        IsActive = 1,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS Success;

END;

CREATE PROCEDURE sp_ResetStudentLogin
(
    IN p_StudentId INT
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    UPDATE Students
    SET
        PasswordHash = '',
        IsFirstLogin = 1,
        LastLogin = NULL,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS Success;

END;

DROP PROCEDURE IF EXISTS sp_GetStudentDashboard;

CREATE PROCEDURE sp_GetStudentDashboard
(
    IN p_StudentId INT
)
BEGIN

    SELECT

        s.StudentId,
        s.StudentName,

        s.AttendancePercentage,

        (s.FeeAmount - s.FeePaid) AS FeeDue,

        s.PerformanceGrade,

        (
            SELECT COUNT(*)
            FROM Subjects sub
            WHERE sub.GroupId = s.GroupId
        ) AS TotalSubjects,

        0 AS CompletedSubjects

    FROM Students s

    WHERE s.StudentId = p_StudentId

    LIMIT 1;

END;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260805101442_AddStudentStoredProcedures', '8.0.13');

COMMIT;


-- Safely handle column renames if old columns exist
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Students' AND COLUMN_NAME = 'ParentName');
SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE `Students` RENAME COLUMN `ParentName` TO `Email`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Students' AND COLUMN_NAME = 'ParentMobile');
SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE `Students` RENAME COLUMN `ParentMobile` TO `MobileNumber`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260805113827_UpdateStudentModule', '8.0.13');

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS sp_GetPagedFaculties;

    CREATE PROCEDURE sp_GetPagedFaculties(
        IN p_SearchTerm VARCHAR(100),
        IN p_Department VARCHAR(100),
        IN p_Designation VARCHAR(100),
        IN p_Status VARCHAR(50),
        IN p_SortBy VARCHAR(50),
        IN p_SortOrder VARCHAR(10),
        IN p_PageNumber INT,
        IN p_PageSize INT
    )
    BEGIN
        DECLARE v_Offset INT;
        SET v_Offset = (IFNULL(p_PageNumber, 1) - 1) * IFNULL(p_PageSize, 10);

        -- Result Set 1: Total Count
        SELECT COUNT(*) 
        FROM Faculties f
        LEFT JOIN Departments d ON d.DepartmentId = f.DepartmentId
        WHERE f.IsDeleted = 0
          AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR 
               f.FirstName LIKE CONCAT('%', p_SearchTerm, '%') OR 
               f.LastName LIKE CONCAT('%', p_SearchTerm, '%') OR 
               f.EmployeeId LIKE CONCAT('%', p_SearchTerm, '%') OR 
               f.Email LIKE CONCAT('%', p_SearchTerm, '%') OR
               f.Mobile LIKE CONCAT('%', p_SearchTerm, '%'))
          AND (p_Department IS NULL OR p_Department = '' OR d.DepartmentName = p_Department OR d.DepartmentCode = p_Department)
          AND (p_Designation IS NULL OR p_Designation = '' OR f.Designation = p_Designation)
          AND (p_Status IS NULL OR p_Status = '' OR f.Status = p_Status);

        -- Result Set 2: Paged Items
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
        WHERE f.IsDeleted = 0
          AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR 
               f.FirstName LIKE CONCAT('%', p_SearchTerm, '%') OR 
               f.LastName LIKE CONCAT('%', p_SearchTerm, '%') OR 
               f.EmployeeId LIKE CONCAT('%', p_SearchTerm, '%') OR 
               f.Email LIKE CONCAT('%', p_SearchTerm, '%') OR
               f.Mobile LIKE CONCAT('%', p_SearchTerm, '%'))
          AND (p_Department IS NULL OR p_Department = '' OR d.DepartmentName = p_Department OR d.DepartmentCode = p_Department)
          AND (p_Designation IS NULL OR p_Designation = '' OR f.Designation = p_Designation)
          AND (p_Status IS NULL OR p_Status = '' OR f.Status = p_Status)
        ORDER BY 
            CASE WHEN p_SortBy = 'FirstName' AND (p_SortOrder IS NULL OR p_SortOrder = 'ASC') THEN f.FirstName END ASC,
            CASE WHEN p_SortBy = 'FirstName' AND p_SortOrder = 'DESC' THEN f.FirstName END DESC,
            CASE WHEN p_SortBy = 'LastName' AND (p_SortOrder IS NULL OR p_SortOrder = 'ASC') THEN f.LastName END ASC,
            CASE WHEN p_SortBy = 'LastName' AND p_SortOrder = 'DESC' THEN f.LastName END DESC,
            CASE WHEN p_SortBy = 'EmployeeId' AND (p_SortOrder IS NULL OR p_SortOrder = 'ASC') THEN f.EmployeeId END ASC,
            CASE WHEN p_SortBy = 'EmployeeId' AND p_SortOrder = 'DESC' THEN f.EmployeeId END DESC,
            CASE WHEN (p_SortBy IS NULL OR p_SortBy = '' OR p_SortBy = 'Id') THEN f.Id END DESC
        LIMIT p_PageSize OFFSET v_Offset;
    END;

DROP PROCEDURE IF EXISTS sp_CreateFaculty;

    CREATE PROCEDURE sp_CreateFaculty(
        IN p_EmployeeId VARCHAR(50),
        IN p_FirstName VARCHAR(100),
        IN p_LastName VARCHAR(100),
        IN p_Gender VARCHAR(20),
        IN p_DateOfBirth DATETIME(6),
        IN p_Aadhaar VARCHAR(12),
        IN p_Mobile VARCHAR(15),
        IN p_Email VARCHAR(150),
        IN p_BloodGroup VARCHAR(10),
        IN p_Qualification VARCHAR(100),
        IN p_Designation VARCHAR(100),
        IN p_DepartmentId INT,
        IN p_JoiningDate DATETIME(6),
        IN p_Experience DECIMAL(65,30),
        IN p_Username VARCHAR(100),
        IN p_Password VARCHAR(255),
        IN p_Status VARCHAR(20),
        IN p_PhotoPath VARCHAR(500)
    )
    BEGIN
        INSERT INTO Faculties (
            EmployeeId, FirstName, LastName, Gender, DateOfBirth, Aadhaar, Mobile, Email, BloodGroup, Qualification, Designation, DepartmentId, JoiningDate, Experience, Username, Password, Status, PhotoPath, CreatedAt, IsDeleted
        ) VALUES (
            p_EmployeeId, p_FirstName, p_LastName, p_Gender, p_DateOfBirth, p_Aadhaar, p_Mobile, p_Email, p_BloodGroup, p_Qualification, p_Designation, p_DepartmentId, p_JoiningDate, p_Experience, p_Username, p_Password, p_Status, p_PhotoPath, NOW(), 0
        );
        SELECT LAST_INSERT_ID() AS Id;
    END;

DROP PROCEDURE IF EXISTS sp_UpdateFaculty;

    CREATE PROCEDURE sp_UpdateFaculty(
        IN p_Id INT,
        IN p_FirstName VARCHAR(100),
        IN p_LastName VARCHAR(100),
        IN p_Gender VARCHAR(20),
        IN p_DateOfBirth DATETIME(6),
        IN p_Aadhaar VARCHAR(12),
        IN p_Mobile VARCHAR(15),
        IN p_Email VARCHAR(150),
        IN p_BloodGroup VARCHAR(10),
        IN p_Qualification VARCHAR(100),
        IN p_Designation VARCHAR(100),
        IN p_DepartmentId INT,
        IN p_JoiningDate DATETIME(6),
        IN p_Experience DECIMAL(65,30),
        IN p_Status VARCHAR(20),
        IN p_PhotoPath VARCHAR(500)
    )
    BEGIN
        UPDATE Faculties SET
            FirstName = p_FirstName,
            LastName = p_LastName,
            Gender = p_Gender,
            DateOfBirth = p_DateOfBirth,
            Aadhaar = p_Aadhaar,
            Mobile = p_Mobile,
            Email = p_Email,
            BloodGroup = p_BloodGroup,
            Qualification = p_Qualification,
            Designation = p_Designation,
            DepartmentId = p_DepartmentId,
            JoiningDate = p_JoiningDate,
            Experience = p_Experience,
            Status = p_Status,
            PhotoPath = p_PhotoPath,
            UpdatedAt = NOW()
        WHERE Id = p_Id;
    END;

DROP PROCEDURE IF EXISTS sp_SoftDeleteFaculty;

    CREATE PROCEDURE sp_SoftDeleteFaculty(IN p_Id INT)
    BEGIN
        UPDATE Faculties SET IsDeleted = 1, UpdatedAt = NOW() WHERE Id = p_Id;
    END;

DROP PROCEDURE IF EXISTS sp_GetFacultyDropdown;

    CREATE PROCEDURE sp_GetFacultyDropdown()
    BEGIN
        SELECT 
            Id,
            EmployeeId,
            CONCAT(FirstName, ' ', LastName) AS FullName
        FROM Faculties
        WHERE IsDeleted = 0 AND Status = 'Active'
        ORDER BY FirstName ASC;
    END;

DROP PROCEDURE IF EXISTS sp_GetFacultyByEmployeeId;

    CREATE PROCEDURE sp_GetFacultyByEmployeeId(IN p_EmployeeId VARCHAR(50))
    BEGIN
        SELECT f.*, d.DepartmentName AS Department 
        FROM Faculties f 
        LEFT JOIN Departments d ON d.DepartmentId = f.DepartmentId 
        WHERE f.EmployeeId = p_EmployeeId AND f.IsDeleted = 0;
    END;

DROP PROCEDURE IF EXISTS sp_GetFacultyByEmail;

    CREATE PROCEDURE sp_GetFacultyByEmail(IN p_Email VARCHAR(150))
    BEGIN
        SELECT f.*, d.DepartmentName AS Department 
        FROM Faculties f 
        LEFT JOIN Departments d ON d.DepartmentId = f.DepartmentId 
        WHERE f.Email = p_Email AND f.IsDeleted = 0;
    END;

DROP PROCEDURE IF EXISTS sp_GetFacultyByMobile;

    CREATE PROCEDURE sp_GetFacultyByMobile(IN p_Mobile VARCHAR(15))
    BEGIN
        SELECT f.*, d.DepartmentName AS Department 
        FROM Faculties f 
        LEFT JOIN Departments d ON d.DepartmentId = f.DepartmentId 
        WHERE f.Mobile = p_Mobile AND f.IsDeleted = 0;
    END;

DROP PROCEDURE IF EXISTS sp_GetFacultyByAadhaar;

    CREATE PROCEDURE sp_GetFacultyByAadhaar(IN p_Aadhaar VARCHAR(12))
    BEGIN
        SELECT f.*, d.DepartmentName AS Department 
        FROM Faculties f 
        LEFT JOIN Departments d ON d.DepartmentId = f.DepartmentId 
        WHERE f.Aadhaar = p_Aadhaar AND f.IsDeleted = 0;
    END;

DROP PROCEDURE IF EXISTS sp_GetFacultyByUsername;

    CREATE PROCEDURE sp_GetFacultyByUsername(IN p_Username VARCHAR(100))
    BEGIN
        SELECT f.*, d.DepartmentName AS Department 
        FROM Faculties f 
        LEFT JOIN Departments d ON d.DepartmentId = f.DepartmentId 
        WHERE f.Username = p_Username AND f.IsDeleted = 0;
    END;

DROP PROCEDURE IF EXISTS sp_GetFacultyPhotoPath;

    CREATE PROCEDURE sp_GetFacultyPhotoPath(IN p_Id INT)
    BEGIN
        SELECT PhotoPath FROM Faculties WHERE Id = p_Id AND IsDeleted = 0;
    END;

DROP PROCEDURE IF EXISTS sp_UpdateFacultyPhotoPath;

    CREATE PROCEDURE sp_UpdateFacultyPhotoPath(IN p_Id INT, IN p_PhotoPath VARCHAR(500))
    BEGIN
        UPDATE Faculties SET PhotoPath = p_PhotoPath, UpdatedAt = NOW() WHERE Id = p_Id;
    END;

DROP PROCEDURE IF EXISTS sp_CheckEmployeeIdUnique;

    CREATE PROCEDURE sp_CheckEmployeeIdUnique(IN p_EmployeeId VARCHAR(50), IN p_ExcludeId INT)
    BEGIN
        SELECT COUNT(*) FROM Faculties WHERE EmployeeId = p_EmployeeId AND IsDeleted = 0 AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
    END;

DROP PROCEDURE IF EXISTS sp_CheckEmailUnique;

    CREATE PROCEDURE sp_CheckEmailUnique(IN p_Email VARCHAR(150), IN p_ExcludeId INT)
    BEGIN
        SELECT COUNT(*) FROM Faculties WHERE Email = p_Email AND IsDeleted = 0 AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
    END;

DROP PROCEDURE IF EXISTS sp_CheckMobileUnique;

    CREATE PROCEDURE sp_CheckMobileUnique(IN p_Mobile VARCHAR(15), IN p_ExcludeId INT)
    BEGIN
        SELECT COUNT(*) FROM Faculties WHERE Mobile = p_Mobile AND IsDeleted = 0 AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
    END;

DROP PROCEDURE IF EXISTS sp_CheckAadhaarUnique;

    CREATE PROCEDURE sp_CheckAadhaarUnique(IN p_Aadhaar VARCHAR(12), IN p_ExcludeId INT)
    BEGIN
        SELECT COUNT(*) FROM Faculties WHERE Aadhaar = p_Aadhaar AND IsDeleted = 0 AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
    END;

DROP PROCEDURE IF EXISTS sp_CheckUsernameUnique;

    CREATE PROCEDURE sp_CheckUsernameUnique(IN p_Username VARCHAR(100), IN p_ExcludeId INT)
    BEGIN
        SELECT COUNT(*) FROM Faculties WHERE Username = p_Username AND IsDeleted = 0 AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
    END;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260805124310_AddFacultyStoredProcedures', '8.0.13');

COMMIT;


CREATE TABLE IF NOT EXISTS `Assignments` (
    `AssignmentId` int NOT NULL AUTO_INCREMENT,
    `Title` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
    `SubjectId` int NOT NULL,
    `FacultyId` int NOT NULL,
    `AcademicYearId` int NOT NULL,
    `AcademicLevel` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `Description` varchar(1000) CHARACTER SET utf8mb4 NULL,
    `DueDate` datetime(6) NOT NULL,
    `Attachment` varchar(500) CHARACTER SET utf8mb4 NULL,
    `MaximumMarks` decimal(10,2) NOT NULL DEFAULT '100.00',
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Assignments` PRIMARY KEY (`AssignmentId`)
) CHARACTER SET=utf8mb4;


START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260805132440_AddAssignmentsTable', '8.0.13');

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS sp_GetBoards;

    CREATE PROCEDURE sp_GetBoards(
        IN p_BoardName VARCHAR(100),
        IN p_BoardCode VARCHAR(30),
        IN p_CountryId INT,
        IN p_StateId INT,
        IN p_Status VARCHAR(20)
    )
    BEGIN
        SELECT 
            b.BoardId, b.BoardCode, b.BoardName, b.Description, b.PassPercentage, b.IsActive, b.CreatedAt, b.UpdatedAt,
            c.CountryId, c.CountryCode, c.CountryName,
            s.StateId, s.StateCode, s.StateName,
            ap.AcademicPatternId, ap.PatternCode, ap.PatternName,
            gs.GradingSystemId, gs.GradingSystemCode, gs.GradingSystemName
        FROM Boards b
        LEFT JOIN Countries c ON c.CountryId = b.CountryId
        LEFT JOIN States s ON s.StateId = b.StateId
        LEFT JOIN AcademicPatterns ap ON ap.AcademicPatternId = b.AcademicPatternId
        LEFT JOIN GradingSystems gs ON gs.GradingSystemId = b.GradingSystemId
        WHERE (p_BoardName IS NULL OR p_BoardName = '' OR b.BoardName LIKE CONCAT('%', p_BoardName, '%'))
          AND (p_BoardCode IS NULL OR p_BoardCode = '' OR b.BoardCode LIKE CONCAT('%', p_BoardCode, '%'))
          AND (p_CountryId IS NULL OR p_CountryId = 0 OR b.CountryId = p_CountryId)
          AND (p_StateId IS NULL OR p_StateId = 0 OR b.StateId = p_StateId)
          AND (p_Status IS NULL OR p_Status = '' OR (p_Status = 'Active' AND b.IsActive = 1) OR (p_Status = 'Inactive' AND b.IsActive = 0));
    END;

DROP PROCEDURE IF EXISTS sp_GetBoardById;

    CREATE PROCEDURE sp_GetBoardById(IN p_BoardId INT)
    BEGIN
        SELECT 
            b.BoardId, b.BoardCode, b.BoardName, b.Description, b.PassPercentage, b.IsActive, b.CreatedAt, b.UpdatedAt,
            c.CountryId, c.CountryCode, c.CountryName,
            s.StateId, s.StateCode, s.StateName,
            ap.AcademicPatternId, ap.PatternCode, ap.PatternName,
            gs.GradingSystemId, gs.GradingSystemCode, gs.GradingSystemName
        FROM Boards b
        LEFT JOIN Countries c ON c.CountryId = b.CountryId
        LEFT JOIN States s ON s.StateId = b.StateId
        LEFT JOIN AcademicPatterns ap ON ap.AcademicPatternId = b.AcademicPatternId
        LEFT JOIN GradingSystems gs ON gs.GradingSystemId = b.GradingSystemId
        WHERE b.BoardId = p_BoardId;

        SELECT 
            bal.BoardAcademicLevelId, bal.BoardId, bal.AcademicLevelId, bal.IsActive, bal.CreatedAt, bal.UpdatedAt,
            al.AcademicLevelId, al.LevelCode, al.LevelName
        FROM BoardAcademicLevels bal
        INNER JOIN AcademicLevels al ON al.AcademicLevelId = bal.AcademicLevelId
        WHERE bal.BoardId = p_BoardId;
    END;

DROP PROCEDURE IF EXISTS sp_GetCountries;

    CREATE PROCEDURE sp_GetCountries()
    BEGIN
        SELECT * FROM Countries WHERE IsActive = 1 ORDER BY CountryName ASC;
    END;

DROP PROCEDURE IF EXISTS sp_GetStatesByCountry;

    CREATE PROCEDURE sp_GetStatesByCountry(IN p_CountryId INT)
    BEGIN
        SELECT * FROM States WHERE CountryId = p_CountryId AND IsActive = 1 ORDER BY StateName ASC;
    END;

DROP PROCEDURE IF EXISTS sp_GetAcademicPatterns;

    CREATE PROCEDURE sp_GetAcademicPatterns()
    BEGIN
        SELECT * FROM AcademicPatterns WHERE IsActive = 1 ORDER BY PatternName ASC;
    END;

DROP PROCEDURE IF EXISTS sp_GetAcademicLevels;

    CREATE PROCEDURE sp_GetAcademicLevels()
    BEGIN
        SELECT * FROM AcademicLevels WHERE IsActive = 1 ORDER BY DisplayOrder ASC, LevelName ASC;
    END;

DROP PROCEDURE IF EXISTS sp_GetGradingSystems;

    CREATE PROCEDURE sp_GetGradingSystems()
    BEGIN
        SELECT * FROM GradingSystems WHERE IsActive = 1 ORDER BY GradingSystemName ASC;
    END;

DROP PROCEDURE IF EXISTS sp_AcademicLevelExists;

    CREATE PROCEDURE sp_AcademicLevelExists(IN p_AcademicLevelId INT)
    BEGIN
        SELECT COUNT(*) FROM AcademicLevels WHERE AcademicLevelId = p_AcademicLevelId AND IsActive = 1;
    END;

DROP PROCEDURE IF EXISTS sp_CountryExists;

    CREATE PROCEDURE sp_CountryExists(IN p_CountryId INT)
    BEGIN
        SELECT COUNT(*) FROM Countries WHERE CountryId = p_CountryId AND IsActive = 1;
    END;

DROP PROCEDURE IF EXISTS sp_StateExists;

    CREATE PROCEDURE sp_StateExists(IN p_StateId INT)
    BEGIN
        SELECT COUNT(*) FROM States WHERE StateId = p_StateId AND IsActive = 1;
    END;

DROP PROCEDURE IF EXISTS sp_AcademicPatternExists;

    CREATE PROCEDURE sp_AcademicPatternExists(IN p_AcademicPatternId INT)
    BEGIN
        SELECT COUNT(*) FROM AcademicPatterns WHERE AcademicPatternId = p_AcademicPatternId AND IsActive = 1;
    END;

DROP PROCEDURE IF EXISTS sp_GradingSystemExists;

    CREATE PROCEDURE sp_GradingSystemExists(IN p_AcademicPatternId INT)
    BEGIN
        SELECT COUNT(*) FROM GradingSystems WHERE GradingSystemId = p_AcademicPatternId AND IsActive = 1;
    END;

DROP PROCEDURE IF EXISTS sp_StateBelongsToCountry;

    CREATE PROCEDURE sp_StateBelongsToCountry(IN p_StateId INT, IN p_CountryId INT)
    BEGIN
        SELECT COUNT(*) FROM States WHERE StateId = p_StateId AND CountryId = p_CountryId AND IsActive = 1;
    END;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260805132940_AddMissingBoardProcedures', '8.0.13');

COMMIT;

DROP PROCEDURE IF EXISTS sp_CreateAssignment;

CREATE PROCEDURE sp_CreateAssignment
(
    IN p_Title VARCHAR(200),
    IN p_Subject VARCHAR(100),
    IN p_Faculty VARCHAR(100),
    IN p_Description VARCHAR(1000),
    IN p_DueDate DATE,
    IN p_Attachment VARCHAR(500),
    IN p_MaximumMarks INT
)
BEGIN

    DECLARE v_AssignmentId INT;

    IF p_Title IS NULL OR TRIM(p_Title) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Assignment Title is required';
    END IF;

    IF p_Subject IS NULL OR TRIM(p_Subject) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Subject is required';
    END IF;

    IF p_Faculty IS NULL OR TRIM(p_Faculty) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Faculty is required';
    END IF;

    IF p_DueDate IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Due Date is required';
    END IF;

    IF p_Attachment IS NULL OR TRIM(p_Attachment) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Attachment is required';
    END IF;

    INSERT INTO Assignments
    (
        Title,
        Subject,
        Faculty,
        Description,
        DueDate,
        Attachment,
        MaximumMarks
    )

    VALUES
    (
        TRIM(p_Title),
        TRIM(p_Subject),
        TRIM(p_Faculty),
        NULLIF(TRIM(p_Description), ''),
        p_DueDate,
        TRIM(p_Attachment),
        p_MaximumMarks
    );

    SET v_AssignmentId = LAST_INSERT_ID();

    SELECT
        AssignmentId,
        Title,
        Subject,
        Faculty,
        Description,
        DueDate,
        Attachment,
        MaximumMarks
    FROM Assignments
    WHERE AssignmentId = v_AssignmentId;

END;

DROP PROCEDURE IF EXISTS sp_GetAllAssignments;

CREATE PROCEDURE sp_GetAllAssignments()
BEGIN

    SELECT
        AssignmentId,
        Title,
        Subject,
        Faculty,
        Description,
        DueDate,
        Attachment,
        MaximumMarks
    FROM Assignments
    ORDER BY AssignmentId DESC;

END;

DROP PROCEDURE IF EXISTS sp_GetAssignmentById;

CREATE PROCEDURE sp_GetAssignmentById
(
    IN p_AssignmentId INT
)
BEGIN

    SELECT
        AssignmentId,
        Title,
        Subject,
        Faculty,
        Description,
        DueDate,
        Attachment,
        MaximumMarks
    FROM Assignments
    WHERE AssignmentId = p_AssignmentId
    LIMIT 1;

END;

DROP PROCEDURE IF EXISTS sp_UpdateAssignment;

CREATE PROCEDURE sp_UpdateAssignment
(
    IN p_AssignmentId INT,
    IN p_Title VARCHAR(200),
    IN p_Subject VARCHAR(100),
    IN p_Faculty VARCHAR(100),
    IN p_Description VARCHAR(1000),
    IN p_DueDate DATE,
    IN p_Attachment VARCHAR(500),
    IN p_MaximumMarks INT
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Assignments
        WHERE AssignmentId = p_AssignmentId
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Assignment not found';
    END IF;

    UPDATE Assignments
    SET
        Title = TRIM(p_Title),
        Subject = TRIM(p_Subject),
        Faculty = TRIM(p_Faculty),
        Description = NULLIF(TRIM(p_Description), ''),
        DueDate = p_DueDate,
        Attachment = TRIM(p_Attachment),
        MaximumMarks = p_MaximumMarks
    WHERE AssignmentId = p_AssignmentId;

    SELECT
        AssignmentId,
        Title,
        Subject,
        Faculty,
        Description,
        DueDate,
        Attachment,
        MaximumMarks
    FROM Assignments
    WHERE AssignmentId = p_AssignmentId;

END;

DROP PROCEDURE IF EXISTS sp_DeleteAssignment;

CREATE PROCEDURE sp_DeleteAssignment
(
    IN p_AssignmentId INT
)
BEGIN

    DELETE
    FROM Assignments
    WHERE AssignmentId = p_AssignmentId;

    SELECT
        IF(ROW_COUNT() > 0, 1, 0) AS Deleted;

END;

START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260805133243_AddAssignmentStoredProcedures', '8.0.13');

COMMIT;


CREATE TABLE IF NOT EXISTS `AssignmentSubmissions` (
    `SubmissionId` int NOT NULL AUTO_INCREMENT,
    `AssignmentId` int NOT NULL,
    `StudentId` int NOT NULL,
    `SubmissionDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `FileUrl` varchar(500) CHARACTER SET utf8mb4 NULL,
    `Status` varchar(30) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'Submitted',
    `MarksObtained` decimal(10,2) NULL,
    `Feedback` varchar(500) CHARACTER SET utf8mb4 NULL,
    CONSTRAINT `PK_AssignmentSubmissions` PRIMARY KEY (`SubmissionId`),
    CONSTRAINT `FK_AssignmentSubmissions_Assignments_AssignmentId` FOREIGN KEY (`AssignmentId`) REFERENCES `Assignments` (`AssignmentId`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;


START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260806040332_AddAssignmentSubmissionsTable', '8.0.13');

COMMIT;

DROP PROCEDURE IF EXISTS sp_SubmitAssignment;

CREATE PROCEDURE sp_SubmitAssignment
(
    IN p_AssignmentId INT,
    IN p_StudentName VARCHAR(100),
    IN p_SubmissionFile VARCHAR(500)
)
BEGIN

    INSERT INTO `AssignmentSubmissions`
    (
        AssignmentId,
        StudentName,
        SubmissionFile,
        SubmittedAt
    )
    VALUES
    (
        p_AssignmentId,
        p_StudentName,
        p_SubmissionFile,
        UTC_TIMESTAMP()
    );

    SELECT *
    FROM `AssignmentSubmissions`
    WHERE AssignmentSubmissionId = LAST_INSERT_ID();

END;

DROP PROCEDURE IF EXISTS sp_GetAssignmentSubmissions;

CREATE PROCEDURE sp_GetAssignmentSubmissions
(
    IN p_AssignmentId INT
)
BEGIN

    SELECT
        AssignmentSubmissionId,
        AssignmentId,
        StudentName,
        SubmissionFile,
        SubmittedAt
    FROM `AssignmentSubmissions`
    WHERE AssignmentId = p_AssignmentId
    ORDER BY SubmittedAt DESC;

END;

START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260806042039_AddAssignmentSubmissionStoredProcedures', '8.0.13');

COMMIT;


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


START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260806043447_AddSectionModule', '8.0.13');

COMMIT;

START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260806062051_AddPeriodAndRoomMaster', '8.0.13');

COMMIT;


CREATE TABLE IF NOT EXISTS `admins` (
    `id` int NOT NULL AUTO_INCREMENT,
    `Email` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `Password` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    CONSTRAINT `PK_admins` PRIMARY KEY (`id`)
) CHARACTER SET=utf8mb4;

DROP PROCEDURE IF EXISTS sp_GetAllAdmins;
CREATE PROCEDURE sp_GetAllAdmins()
BEGIN
    SELECT id, Email, IsActive FROM admins ORDER BY id DESC;
END;

DROP PROCEDURE IF EXISTS sp_GetAdminById;
CREATE PROCEDURE sp_GetAdminById(IN p_Id INT)
BEGIN
    SELECT id, Email, IsActive FROM admins WHERE id = p_Id;
END;

DROP PROCEDURE IF EXISTS sp_GetAdminByEmail;
CREATE PROCEDURE sp_GetAdminByEmail(IN p_Email VARCHAR(255))
BEGIN
    SELECT id, Email, Password, IsActive FROM admins WHERE Email = p_Email;
END;

DROP PROCEDURE IF EXISTS sp_CreateAdmin;
CREATE PROCEDURE sp_CreateAdmin(IN p_Email VARCHAR(255), IN p_Password VARCHAR(255), IN p_IsActive TINYINT(1))
BEGIN
    INSERT INTO admins (Email, Password, IsActive) VALUES (p_Email, p_Password, p_IsActive);
    SELECT LAST_INSERT_ID();
END;

DROP PROCEDURE IF EXISTS sp_UpdateAdminStatus;
CREATE PROCEDURE sp_UpdateAdminStatus(IN p_Id INT, IN p_IsActive TINYINT(1))
BEGIN
    UPDATE admins SET IsActive = p_IsActive WHERE id = p_Id;
END;

DROP PROCEDURE IF EXISTS sp_ChangeAdminPassword;
CREATE PROCEDURE sp_ChangeAdminPassword(IN p_Id INT, IN p_Password VARCHAR(255))
BEGIN
    UPDATE admins SET Password = p_Password WHERE id = p_Id;
END;


START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260806064643_AddAdminModule', '8.0.13');

COMMIT;


CREATE TABLE IF NOT EXISTS `Results` (
    `ResultId` int NOT NULL AUTO_INCREMENT,
    `StudentId` int NOT NULL,
    `BoardId` int NOT NULL,
    `AcademicYearId` int NOT NULL,
    `AcademicLevelId` int NOT NULL,
    `GroupId` int NOT NULL,
    `ExamId` int NOT NULL,
    `SubjectId` int NOT NULL,
    `InternalMarks` decimal(5,2) NOT NULL,
    `PracticalMarks` decimal(5,2) NOT NULL,
    `ExternalMarks` decimal(5,2) NOT NULL,
    `TotalMarks` decimal(5,2) NOT NULL,
    `Grade` varchar(10) CHARACTER SET utf8mb4 NOT NULL,
    `ResultStatus` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `Rank` int NULL,
    `PublishedDate` datetime(6) NULL,
    `IsPublished` tinyint(1) NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Results` PRIMARY KEY (`ResultId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Revaluations` (
    `RevaluationId` int NOT NULL AUTO_INCREMENT,
    `ResultId` int NOT NULL,
    `StudentId` int NOT NULL,
    `SubjectId` int NOT NULL,
    `Reason` varchar(500) CHARACTER SET utf8mb4 NOT NULL,
    `Status` varchar(20) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'Pending',
    `AppliedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedMarks` decimal(5,2) NULL,
    CONSTRAINT `PK_Revaluations` PRIMARY KEY (`RevaluationId`)
) CHARACTER SET=utf8mb4;


START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260806135741_AddResultModule', '8.0.13');

COMMIT;

DROP PROCEDURE IF EXISTS sp_GetResults;

CREATE PROCEDURE sp_GetResults()
BEGIN

    SELECT
        ResultId,
        StudentId,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        ExamId,
        SubjectId,
        InternalMarks,
        PracticalMarks,
        ExternalMarks,
        TotalMarks,
        Grade,
        ResultStatus,
        Rank,
        IsPublished,
        PublishedDate,
        CreatedAt,
        UpdatedAt

    FROM Results

    ORDER BY ResultId DESC;

END;

DROP PROCEDURE IF EXISTS sp_GetResultById;

CREATE PROCEDURE sp_GetResultById
(
    IN p_ResultId INT
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Results
        WHERE ResultId = p_ResultId
    )
    THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT='Result not found';
    END IF;

    SELECT
        ResultId,
        StudentId,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        ExamId,
        SubjectId,
        InternalMarks,
        PracticalMarks,
        ExternalMarks,
        TotalMarks,
        Grade,
        ResultStatus,
        Rank,
        IsPublished,
        PublishedDate,
        CreatedAt,
        UpdatedAt

    FROM Results

    WHERE ResultId = p_ResultId;

END;

DROP PROCEDURE IF EXISTS sp_ProcessResults;

CREATE PROCEDURE sp_ProcessResults
(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT
)
BEGIN

    UPDATE Results

    SET

        TotalMarks =
            IFNULL(InternalMarks,0)+
            IFNULL(PracticalMarks,0)+
            IFNULL(ExternalMarks,0),

        Grade =
        CASE

            WHEN (IFNULL(InternalMarks,0)+IFNULL(PracticalMarks,0)+IFNULL(ExternalMarks,0))>=90 THEN 'A+'

            WHEN (IFNULL(InternalMarks,0)+IFNULL(PracticalMarks,0)+IFNULL(ExternalMarks,0))>=80 THEN 'A'

            WHEN (IFNULL(InternalMarks,0)+IFNULL(PracticalMarks,0)+IFNULL(ExternalMarks,0))>=70 THEN 'B'

            WHEN (IFNULL(InternalMarks,0)+IFNULL(PracticalMarks,0)+IFNULL(ExternalMarks,0))>=60 THEN 'C'

            WHEN (IFNULL(InternalMarks,0)+IFNULL(PracticalMarks,0)+IFNULL(ExternalMarks,0))>=50 THEN 'D'

            ELSE 'F'

        END,

        ResultStatus =
        CASE

            WHEN (IFNULL(InternalMarks,0)+IFNULL(PracticalMarks,0)+IFNULL(ExternalMarks,0))>=35

            THEN 'Pass'

            ELSE 'Fail'

        END,

        UpdatedAt = UTC_TIMESTAMP()

    WHERE

        BoardId = p_BoardId

        AND AcademicYearId = p_AcademicYearId

        AND AcademicLevelId = p_AcademicLevelId

        AND GroupId = p_GroupId

        AND ExamId = p_ExamId;

    SELECT ROW_COUNT() AS ProcessedResults;

END;

DROP PROCEDURE IF EXISTS sp_PublishResults;

CREATE PROCEDURE sp_PublishResults
(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT
)
BEGIN

    UPDATE Results

    SET

        IsPublished = TRUE,

        PublishedDate = UTC_TIMESTAMP(),

        UpdatedAt = UTC_TIMESTAMP()

    WHERE

        BoardId = p_BoardId

        AND AcademicYearId = p_AcademicYearId

        AND AcademicLevelId = p_AcademicLevelId

        AND GroupId = p_GroupId

        AND ExamId = p_ExamId;

    SELECT ROW_COUNT() AS PublishedResults;

END;

DROP PROCEDURE IF EXISTS sp_UpdateResult;

CREATE PROCEDURE sp_UpdateResult
(
    IN p_ResultId INT,
    IN p_InternalMarks DECIMAL(5,2),
    IN p_PracticalMarks DECIMAL(5,2),
    IN p_ExternalMarks DECIMAL(5,2),
    IN p_Grade VARCHAR(10),
    IN p_ResultStatus VARCHAR(20),
    IN p_Rank INT
)
BEGIN

    DECLARE v_TotalMarks DECIMAL(5,2);

    IF NOT EXISTS
    (
        SELECT 1
        FROM Results
        WHERE ResultId = p_ResultId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Result not found';
    END IF;

    SET v_TotalMarks =
        IFNULL(p_InternalMarks,0)
      + IFNULL(p_PracticalMarks,0)
      + IFNULL(p_ExternalMarks,0);

    UPDATE Results
    SET

        InternalMarks=p_InternalMarks,
        PracticalMarks=p_PracticalMarks,
        ExternalMarks=p_ExternalMarks,
        TotalMarks=v_TotalMarks,
        Grade=p_Grade,
        ResultStatus=p_ResultStatus,
        Rank=p_Rank,
        UpdatedAt=UTC_TIMESTAMP()

    WHERE ResultId=p_ResultId;

    CALL sp_GetResultById(p_ResultId);

END;

DROP PROCEDURE IF EXISTS sp_DeleteResult;

CREATE PROCEDURE sp_DeleteResult
(
    IN p_ResultId INT
)
BEGIN

    DELETE FROM Results
    WHERE ResultId=p_ResultId;

    SELECT IF(ROW_COUNT()>0,1,0) AS Deleted;

END;

DROP PROCEDURE IF EXISTS sp_GetResultsByStudent;

CREATE PROCEDURE sp_GetResultsByStudent
(
    IN p_StudentId INT
)
BEGIN

SELECT

r.ResultId,

s.StudentId,
s.StudentName,
s.RollNo,

sub.SubjectId,
sub.SubjectName,
sub.SubjectCode,

e.ExaminationId,
e.ExamName,

ay.AcademicYearName,

r.InternalMarks,
r.PracticalMarks,
r.ExternalMarks,
r.TotalMarks,
r.Grade,
r.ResultStatus,
r.Rank,
r.IsPublished

FROM Results r

LEFT JOIN Students s
ON s.StudentId=r.StudentId

LEFT JOIN Subjects sub
ON sub.SubjectId=r.SubjectId

LEFT JOIN Examinations e
ON e.ExaminationId=r.ExamId

LEFT JOIN AcademicYears ay
ON ay.AcademicYearId=r.AcademicYearId

WHERE r.StudentId=p_StudentId

ORDER BY sub.SubjectName;

END;

DROP PROCEDURE IF EXISTS sp_GetResultsByExam;

CREATE PROCEDURE sp_GetResultsByExam
(
    IN p_ExamId INT
)
BEGIN

SELECT

r.ResultId,

s.StudentName,
s.RollNo,

sub.SubjectName,

e.ExamName,

r.TotalMarks,
r.Grade,
r.ResultStatus,
r.Rank,
r.IsPublished

FROM Results r

LEFT JOIN Students s
ON s.StudentId=r.StudentId

LEFT JOIN Subjects sub
ON sub.SubjectId=r.SubjectId

LEFT JOIN Examinations e
ON e.ExaminationId=r.ExamId

WHERE r.ExamId=p_ExamId

ORDER BY s.RollNo;

END;

DROP PROCEDURE IF EXISTS sp_GetResultsBySubject;

CREATE PROCEDURE sp_GetResultsBySubject
(
    IN p_SubjectId INT
)
BEGIN

SELECT

r.ResultId,

s.StudentName,
s.RollNo,

sub.SubjectName,

r.InternalMarks,
r.PracticalMarks,
r.ExternalMarks,
r.TotalMarks,
r.Grade,
r.ResultStatus

FROM Results r

LEFT JOIN Students s
ON s.StudentId=r.StudentId

LEFT JOIN Subjects sub
ON sub.SubjectId=r.SubjectId

WHERE r.SubjectId=p_SubjectId

ORDER BY s.RollNo;

END;

DROP PROCEDURE IF EXISTS sp_PublishResult;

CREATE PROCEDURE sp_PublishResult
(
    IN p_ResultId INT
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Results
        WHERE ResultId = p_ResultId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Result not found';
    END IF;

    UPDATE Results
    SET

        IsPublished = 1,
        PublishedDate = UTC_TIMESTAMP(),
        UpdatedAt = UTC_TIMESTAMP()

    WHERE ResultId = p_ResultId;

    CALL sp_GetResultById(p_ResultId);

END;

DROP PROCEDURE IF EXISTS sp_GetPublishedResults;

CREATE PROCEDURE sp_GetPublishedResults()
BEGIN

SELECT

r.ResultId,

s.StudentName,
s.RollNo,

sub.SubjectName,

e.ExamName,

ay.AcademicYearName,

r.TotalMarks,
r.Grade,
r.ResultStatus,
r.Rank,
r.PublishedDate

FROM Results r

LEFT JOIN Students s
ON s.StudentId = r.StudentId

LEFT JOIN Subjects sub
ON sub.SubjectId = r.SubjectId

LEFT JOIN Examinations e
ON e.ExaminationId = r.ExamId

LEFT JOIN AcademicYears ay
ON ay.AcademicYearId = r.AcademicYearId

WHERE r.IsPublished = 1

ORDER BY s.RollNo;

END;

DROP PROCEDURE IF EXISTS sp_GetRankList;

CREATE PROCEDURE sp_GetRankList
(
    IN p_ExamId INT
)
BEGIN

SELECT

s.StudentId,
s.StudentName,
s.RollNo,

SUM(r.TotalMarks) AS TotalMarks,

RANK() OVER
(
ORDER BY SUM(r.TotalMarks) DESC
) AS RankPosition

FROM Results r

INNER JOIN Students s
ON s.StudentId = r.StudentId

WHERE r.ExamId = p_ExamId

GROUP BY

s.StudentId,
s.StudentName,
s.RollNo

ORDER BY TotalMarks DESC;

END;

DROP PROCEDURE IF EXISTS sp_GetStudentResultSummary;

CREATE PROCEDURE sp_GetStudentResultSummary
(
    IN p_StudentId INT
)
BEGIN

SELECT

s.StudentId,
s.StudentName,
s.RollNo,

COUNT(r.ResultId) AS TotalSubjects,

SUM(r.TotalMarks) AS TotalMarks,

AVG(r.TotalMarks) AS AverageMarks,

MAX(r.TotalMarks) AS HighestMarks,

MIN(r.TotalMarks) AS LowestMarks

FROM Students s

LEFT JOIN Results r
ON r.StudentId = s.StudentId

WHERE s.StudentId = p_StudentId

GROUP BY

s.StudentId,
s.StudentName,
s.RollNo;

END;

START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260806143000_AddResultStoredProcedures', '8.0.13');

COMMIT;


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


START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260806150628_AddPromotionModule', '8.0.13');

COMMIT;

START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260807034631_AddIsActiveColumnToStudents', '8.0.13');

COMMIT;

START TRANSACTION;


DROP PROCEDURE IF EXISTS sp_GetEligibleStudents;



CREATE PROCEDURE sp_GetEligibleStudents()
BEGIN
    SELECT
        StudentId,
        AdmissionNo AS AdmissionNumber,
        StudentName,
        AcademicYearId,
        GroupId,
        Section
    FROM Students
    WHERE AcademicYearId = 1;
END;



DROP PROCEDURE IF EXISTS sp_GetPromotionHistory;



CREATE PROCEDURE sp_GetPromotionHistory()
BEGIN
    SELECT *
    FROM PromotionHistories
    ORDER BY PromotionDate DESC;
END;



DROP PROCEDURE IF EXISTS sp_PromoteStudent;



CREATE PROCEDURE sp_PromoteStudent
(
    IN pStudentId INT,
    IN pAcademicYearId INT,
    IN pClassId INT,
    IN pRemarks VARCHAR(500)
)
BEGIN

    UPDATE Students
    SET AcademicYearId = pAcademicYearId
    WHERE StudentId = pStudentId;

    INSERT INTO PromotionHistories
    (
        StudentId,
        FromAcademicYearId,
        ToAcademicYearId,
        FromClassId,
        ToClassId,
        PromotionDate,
        PromotedBy,
        Remarks,
        IsRollback
    )
    VALUES
    (
        pStudentId,
        1,
        pAcademicYearId,
        1,
        pClassId,
        NOW(),
        'Admin',
        pRemarks,
        0
    );

END;



DROP PROCEDURE IF EXISTS sp_RollbackPromotion;



CREATE PROCEDURE sp_RollbackPromotion
(
    IN pPromotionId INT
)
BEGIN

    UPDATE PromotionHistories
    SET
        IsRollback = 1,
        RollbackDate = NOW(),
        RollbackBy = 'Admin'
    WHERE Id = pPromotionId;

END;



DROP PROCEDURE IF EXISTS sp_UpdateSection;



CREATE PROCEDURE sp_UpdateSection
(
    IN pStudentId INT,
    IN pSection VARCHAR(20)
)
BEGIN

    UPDATE Students
    SET Section = pSection
    WHERE StudentId = pStudentId;

END;



DROP PROCEDURE IF EXISTS sp_UpdateGroup;



CREATE PROCEDURE sp_UpdateGroup
(
    IN pStudentId INT,
    IN pGroupId INT
)
BEGIN

    UPDATE Students
    SET GroupId = pGroupId
    WHERE StudentId = pStudentId;

END;



DROP PROCEDURE IF EXISTS sp_GetPromotionReport;



CREATE PROCEDURE sp_GetPromotionReport()
BEGIN

    SELECT
        COUNT(*) AS TotalStudents,

        SUM(
            CASE
                WHEN AcademicYearId = 2 THEN 1
                ELSE 0
            END
        ) AS PromotedStudents,

        SUM(
            CASE
                WHEN AcademicYearId = 1 THEN 1
                ELSE 0
            END
        ) AS PendingStudents

    FROM Students;

END;


INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260807043234_AddPromotionStoredProcedures', '8.0.13');

COMMIT;

DROP PROCEDURE IF EXISTS sp_AttendanceExists;

DROP PROCEDURE IF EXISTS sp_ChangeAttendanceStatus;

DROP PROCEDURE IF EXISTS sp_CreateAttendance;

DROP PROCEDURE IF EXISTS sp_CreateBulkAttendance;

DROP PROCEDURE IF EXISTS sp_GetAttendanceById;

DROP PROCEDURE IF EXISTS sp_GetAttendancePercentage;

DROP PROCEDURE IF EXISTS sp_GetAttendanceReport;

DROP PROCEDURE IF EXISTS sp_GetAttendanceSummary;

DROP PROCEDURE IF EXISTS sp_GetAttendances;

DROP PROCEDURE IF EXISTS sp_GetStudentsForAttendance;

DROP PROCEDURE IF EXISTS sp_UpdateAttendance;

CREATE PROCEDURE sp_AttendanceExists(
    IN p_StudentId INT,
    IN p_SubjectId INT,
    IN p_AttendanceDate DATETIME
)
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM Attendances 
        WHERE StudentId = p_StudentId 
          AND SubjectId = p_SubjectId 
          AND DATE(AttendanceDate) = DATE(p_AttendanceDate)
          AND IsActive = 1
    ) AS AttendanceExists;
END;

CREATE PROCEDURE sp_ChangeAttendanceStatus(
    IN p_AttendanceId INT,
    IN p_IsActive BOOLEAN
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    UPDATE Attendances
    SET IsActive = p_IsActive,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE AttendanceId = p_AttendanceId;

    COMMIT;

    SELECT ROW_COUNT() AS AffectedRows;
END;

CREATE PROCEDURE sp_CreateAttendance(
    IN p_AttendanceDate DATETIME,
    IN p_StudentId INT,
    IN p_FacultyId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_SubjectId INT,
    IN p_Status TINYINT,
    IN p_Remarks VARCHAR(500)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO Attendances (
        AttendanceDate, 
        StudentId, 
        FacultyId, 
        BoardId, 
        AcademicYearId, 
        AcademicLevelId, 
        GroupId, 
        SectionId, 
        SubjectId, 
        Status, 
        Remarks,
        IsActive,
        CreatedAt
    ) VALUES (
        p_AttendanceDate, 
        p_StudentId, 
        p_FacultyId, 
        p_BoardId, 
        p_AcademicYearId, 
        p_AcademicLevelId, 
        p_GroupId, 
        p_SectionId, 
        p_SubjectId, 
        p_Status, 
        p_Remarks, 
        1, 
        UTC_TIMESTAMP()
    );

    COMMIT;

    SELECT LAST_INSERT_ID() AS AttendanceId;
END;

CREATE PROCEDURE sp_CreateBulkAttendance(
    IN p_AttendanceJson JSON
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO Attendances (
        AttendanceDate, 
        StudentId, 
        FacultyId, 
        BoardId, 
        AcademicYearId, 
        AcademicLevelId, 
        GroupId, 
        SectionId, 
        SubjectId, 
        Status, 
        Remarks, 
        IsActive, 
        CreatedAt
    )
    SELECT 
        jt.AttendanceDate, 
        jt.StudentId, 
        jt.FacultyId, 
        jt.BoardId, 
        jt.AcademicYearId, 
        jt.AcademicLevelId, 
        jt.GroupId, 
        jt.SectionId, 
        jt.SubjectId, 
        jt.Status, 
        jt.Remarks, 
        IFNULL(jt.IsActive, 1), 
        UTC_TIMESTAMP()
    FROM JSON_TABLE(
        p_AttendanceJson,
        '$[*]' COLUMNS(
            AttendanceDate DATETIME PATH '$.AttendanceDate',
            StudentId INT PATH '$.StudentId',
            FacultyId INT PATH '$.FacultyId',
            BoardId INT PATH '$.BoardId',
            AcademicYearId INT PATH '$.AcademicYearId',
            AcademicLevelId INT PATH '$.AcademicLevelId',
            GroupId INT PATH '$.GroupId',
            SectionId INT PATH '$.SectionId',
            SubjectId INT PATH '$.SubjectId',
            Status TINYINT PATH '$.Status',
            Remarks VARCHAR(500) PATH '$.Remarks',
            IsActive BOOLEAN PATH '$.IsActive'
        )
    ) jt;

    COMMIT;

    SELECT ROW_COUNT() AS AffectedRows;
END;

CREATE PROCEDURE sp_GetAttendanceById(
    IN p_AttendanceId INT
)
BEGIN
    SELECT 
        a.AttendanceId,
        a.AttendanceDate,
        a.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNumber, '') AS RollNumber,
        a.FacultyId,
        TRIM(CONCAT(COALESCE(f.FirstName, ''), ' ', COALESCE(f.LastName, ''))) AS FacultyName,
        a.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        a.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        a.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        a.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        a.SectionId,
        COALESCE(sec.SectionName, '') AS SectionName,
        a.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        a.Status,
        a.Remarks,
        a.CreatedAt,
        a.UpdatedAt
    FROM Attendances a
    INNER JOIN Students s ON a.StudentId = s.StudentId
    INNER JOIN Faculties f ON a.FacultyId = f.Id
    INNER JOIN Boards b ON a.BoardId = b.BoardId
    INNER JOIN AcademicYears ay ON a.AcademicYearId = ay.AcademicYearId
    INNER JOIN AcademicLevels al ON a.AcademicLevelId = al.AcademicLevelId
    INNER JOIN Groups g ON a.GroupId = g.GroupId
    INNER JOIN Sections sec ON a.SectionId = sec.SectionId
    INNER JOIN Subjects sub ON a.SubjectId = sub.SubjectId
    WHERE a.AttendanceId = p_AttendanceId;
END;

CREATE PROCEDURE sp_GetAttendancePercentage(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_SubjectId INT,
    IN p_FacultyId INT,
    IN p_StudentId INT,
    IN p_Status TINYINT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME,
    IN p_PageNumber INT,
    IN p_PageSize INT,
    IN p_SearchText VARCHAR(100)
)
BEGIN
    SELECT 
        a.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNumber, '') AS RollNumber,
        COUNT(a.AttendanceId) AS TotalClasses,
        SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END) AS PresentClasses,
        SUM(CASE WHEN a.Status = 2 THEN 1 ELSE 0 END) AS AbsentClasses,
        SUM(CASE WHEN a.Status = 3 THEN 1 ELSE 0 END) AS LateClasses,
        SUM(CASE WHEN a.Status = 4 THEN 1 ELSE 0 END) AS LeaveClasses,
        ROUND(
            IFNULL(
                (SUM(CASE WHEN a.Status = 1 OR a.Status = 3 THEN 1 ELSE 0 END) / NULLIF(COUNT(a.AttendanceId), 0)) * 100, 
                0.00
            ), 
            2
        ) AS AttendancePercentage
    FROM Attendances a
    INNER JOIN Students s ON a.StudentId = s.StudentId
    INNER JOIN Faculties f ON a.FacultyId = f.Id
    INNER JOIN Subjects sub ON a.SubjectId = sub.SubjectId
    WHERE a.IsActive = 1
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR a.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR a.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR a.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR a.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR a.SectionId = p_SectionId)
      AND (p_SubjectId IS NULL OR p_SubjectId = 0 OR a.SubjectId = p_SubjectId)
      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR a.FacultyId = p_FacultyId)
      AND (p_StudentId IS NULL OR p_StudentId = 0 OR a.StudentId = p_StudentId)
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (p_FromDate IS NULL OR DATE(a.AttendanceDate) >= DATE(p_FromDate))
      AND (p_ToDate IS NULL OR DATE(a.AttendanceDate) <= DATE(p_ToDate))
      AND (p_SearchText IS NULL OR p_SearchText = '' OR 
           s.StudentName LIKE CONCAT('%', p_SearchText, '%') OR 
           s.RollNumber LIKE CONCAT('%', p_SearchText, '%') OR 
           CONCAT(f.FirstName,' ',f.LastName) LIKE CONCAT('%', p_SearchText, '%'))
    GROUP BY a.StudentId, s.StudentName, s.RollNumber
    ORDER BY s.RollNumber ASC, s.StudentName ASC;
END;

CREATE PROCEDURE sp_GetAttendanceReport(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_SubjectId INT,
    IN p_FacultyId INT,
    IN p_StudentId INT,
    IN p_Status TINYINT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME,
    IN p_PageNumber INT,
    IN p_PageSize INT,
    IN p_SearchText VARCHAR(100)
)
BEGIN
    SELECT 
        a.AttendanceDate,
        COALESCE(b.BoardName, '') AS BoardName,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        TRIM(CONCAT(COALESCE(f.FirstName, ''), ' ', COALESCE(f.LastName, ''))) AS FacultyName,
        COALESCE(s.RollNumber, '') AS RollNumber,
        COALESCE(s.StudentName, '') AS StudentName,
        a.Status,
        a.Remarks
    FROM Attendances a
    INNER JOIN Students s ON a.StudentId = s.StudentId
    INNER JOIN Faculties f ON a.FacultyId = f.Id
    INNER JOIN Boards b ON a.BoardId = b.BoardId
    INNER JOIN AcademicYears ay ON a.AcademicYearId = ay.AcademicYearId
    INNER JOIN AcademicLevels al ON a.AcademicLevelId = al.AcademicLevelId
    INNER JOIN Groups g ON a.GroupId = g.GroupId
    INNER JOIN Sections sec ON a.SectionId = sec.SectionId
    INNER JOIN Subjects sub ON a.SubjectId = sub.SubjectId
    WHERE a.IsActive = 1
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR a.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR a.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR a.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR a.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR a.SectionId = p_SectionId)
      AND (p_SubjectId IS NULL OR p_SubjectId = 0 OR a.SubjectId = p_SubjectId)
      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR a.FacultyId = p_FacultyId)
      AND (p_StudentId IS NULL OR p_StudentId = 0 OR a.StudentId = p_StudentId)
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (p_FromDate IS NULL OR DATE(a.AttendanceDate) >= DATE(p_FromDate))
      AND (p_ToDate IS NULL OR DATE(a.AttendanceDate) <= DATE(p_ToDate))
      AND (p_SearchText IS NULL OR p_SearchText = '' OR 
           s.StudentName LIKE CONCAT('%', p_SearchText, '%') OR 
           s.RollNumber LIKE CONCAT('%', p_SearchText, '%') OR 
           CONCAT(f.FirstName,' ',f.LastName) LIKE CONCAT('%', p_SearchText, '%'))
    ORDER BY a.AttendanceDate DESC, s.RollNumber ASC;
END;

CREATE PROCEDURE sp_GetAttendanceSummary(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_SubjectId INT,
    IN p_FacultyId INT,
    IN p_StudentId INT,
    IN p_Status TINYINT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME,
    IN p_PageNumber INT,
    IN p_PageSize INT,
    IN p_SearchText VARCHAR(100)
)
BEGIN
    SELECT 
        COUNT(a.AttendanceId) AS TotalStudents,
        SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END) AS PresentCount,
        SUM(CASE WHEN a.Status = 2 THEN 1 ELSE 0 END) AS AbsentCount,
        SUM(CASE WHEN a.Status = 3 THEN 1 ELSE 0 END) AS LateCount,
        SUM(CASE WHEN a.Status = 4 THEN 1 ELSE 0 END) AS LeaveCount,
        ROUND(
            IFNULL(
                (SUM(CASE WHEN a.Status = 1 OR a.Status = 3 THEN 1 ELSE 0 END) / NULLIF(COUNT(a.AttendanceId), 0)) * 100, 
                0.00
            ), 
            2
        ) AS AttendancePercentage,
        COALESCE(MAX(a.AttendanceDate), p_FromDate, UTC_TIMESTAMP()) AS AttendanceDate
    FROM Attendances a
    INNER JOIN Students s ON a.StudentId = s.StudentId
    INNER JOIN Faculties f ON a.FacultyId = f.Id
    INNER JOIN Subjects sub ON a.SubjectId = sub.SubjectId
    WHERE a.IsActive = 1
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR a.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR a.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR a.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR a.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR a.SectionId = p_SectionId)
      AND (p_SubjectId IS NULL OR p_SubjectId = 0 OR a.SubjectId = p_SubjectId)
      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR a.FacultyId = p_FacultyId)
      AND (p_StudentId IS NULL OR p_StudentId = 0 OR a.StudentId = p_StudentId)
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (p_FromDate IS NULL OR DATE(a.AttendanceDate) >= DATE(p_FromDate))
      AND (p_ToDate IS NULL OR DATE(a.AttendanceDate) <= DATE(p_ToDate))
      AND (p_SearchText IS NULL OR p_SearchText = '' OR 
           s.StudentName LIKE CONCAT('%', p_SearchText, '%') OR 
           s.RollNumber LIKE CONCAT('%', p_SearchText, '%') OR 
           CONCAT(f.FirstName,' ',f.LastName) LIKE CONCAT('%', p_SearchText, '%'));
END;

CREATE PROCEDURE sp_GetAttendances(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_SubjectId INT,
    IN p_FacultyId INT,
    IN p_StudentId INT,
    IN p_Status TINYINT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME,
    IN p_PageNumber INT,
    IN p_PageSize INT,
    IN p_SearchText VARCHAR(100)
)
BEGIN
    DECLARE v_Offset INT;
    DECLARE v_Limit INT;

    SET v_Limit = IFNULL(p_PageSize, 10);
    IF v_Limit <= 0 THEN 
        SET v_Limit = 10; 
    END IF;

    IF p_PageNumber IS NULL OR p_PageNumber <= 0 THEN
        SET v_Offset = 0;
    ELSE
        SET v_Offset = (p_PageNumber - 1) * v_Limit;
    END IF;

    SELECT 
        a.AttendanceId,
        a.AttendanceDate,
        a.StudentId,
        COALESCE(s.RollNumber, '') AS RollNumber,
        COALESCE(s.StudentName, '') AS StudentName,
        TRIM(CONCAT(COALESCE(f.FirstName, ''), ' ', COALESCE(f.LastName, ''))) AS FacultyName,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        a.Status
    FROM Attendances a
    INNER JOIN Students s ON a.StudentId = s.StudentId
    INNER JOIN Faculties f ON a.FacultyId = f.Id
    INNER JOIN Subjects sub ON a.SubjectId = sub.SubjectId
    WHERE a.IsActive = 1
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR a.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR a.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR a.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR a.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR a.SectionId = p_SectionId)
      AND (p_SubjectId IS NULL OR p_SubjectId = 0 OR a.SubjectId = p_SubjectId)
      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR a.FacultyId = p_FacultyId)
      AND (p_StudentId IS NULL OR p_StudentId = 0 OR a.StudentId = p_StudentId)
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (p_FromDate IS NULL OR DATE(a.AttendanceDate) >= DATE(p_FromDate))
      AND (p_ToDate IS NULL OR DATE(a.AttendanceDate) <= DATE(p_ToDate))
      AND (p_SearchText IS NULL OR p_SearchText = '' OR 
           s.StudentName LIKE CONCAT('%', p_SearchText, '%') OR 
           s.RollNumber LIKE CONCAT('%', p_SearchText, '%') OR 
           CONCAT(f.FirstName,' ',f.LastName) LIKE CONCAT('%',p_SearchText,'%'))
    ORDER BY a.AttendanceDate DESC, a.AttendanceId DESC
    LIMIT v_Limit OFFSET v_Offset;
END;

CREATE PROCEDURE sp_GetStudentsForAttendance(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_SubjectId INT,
    IN p_FacultyId INT,
    IN p_StudentId INT,
    IN p_Status TINYINT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME,
    IN p_PageNumber INT,
    IN p_PageSize INT,
    IN p_SearchText VARCHAR(100)
)
BEGIN
    SELECT 
        s.StudentId,
        COALESCE(s.AdmissionNumber, '') AS AdmissionNumber,
        COALESCE(s.RollNumber, '') AS RollNumber,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(a.Status, 0) AS Status,
        COALESCE(a.Remarks,'') AS Remarks,
        (CASE WHEN a.AttendanceId IS NOT NULL THEN 1 ELSE 0 END) AS IsAttendanceMarked
    FROM Students s
    LEFT JOIN Attendances a ON s.StudentId = a.StudentId 
                          AND a.SubjectId = p_SubjectId 
                          AND DATE(a.AttendanceDate) = DATE(p_FromDate)
                          AND a.IsActive = 1
    WHERE s.IsActive = 1
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR s.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR s.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR s.SectionId = p_SectionId)
      AND (p_StudentId IS NULL OR p_StudentId = 0 OR s.StudentId = p_StudentId)
      AND (p_SearchText IS NULL OR p_SearchText = '' OR 
           s.StudentName LIKE CONCAT('%', p_SearchText, '%') OR 
           s.RollNumber LIKE CONCAT('%', p_SearchText, '%') OR
           s.AdmissionNumber LIKE CONCAT('%', p_SearchText, '%'))
    ORDER BY s.RollNumber ASC, s.StudentName ASC;
END;

CREATE PROCEDURE sp_UpdateAttendance(
    IN p_AttendanceId INT,
    IN p_AttendanceDate DATETIME,
    IN p_StudentId INT,
    IN p_FacultyId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_SubjectId INT,
    IN p_Status TINYINT,
    IN p_Remarks VARCHAR(500)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    UPDATE Attendances
    SET AttendanceDate = p_AttendanceDate,
        StudentId = p_StudentId,
        FacultyId = p_FacultyId,
        BoardId = p_BoardId,
        AcademicYearId = p_AcademicYearId,
        AcademicLevelId = p_AcademicLevelId,
        GroupId = p_GroupId,
        SectionId = p_SectionId,
        SubjectId = p_SubjectId,
        Status = p_Status,
        Remarks = p_Remarks,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE AttendanceId = p_AttendanceId;

    COMMIT;

    SELECT ROW_COUNT() AS AffectedRows;
END;

START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260807044604_AddAttendanceStoredProcedures', '8.0.13');

COMMIT;

START TRANSACTION;



DROP PROCEDURE IF EXISTS sp_CreateSubject;

CREATE PROCEDURE sp_CreateSubject(

    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,

    IN p_SubjectName VARCHAR(100),
    IN p_SubjectCode VARCHAR(50),
    IN p_SubjectType VARCHAR(30),

    IN p_TheoryMarks DECIMAL(10,2),
    IN p_PracticalMarks DECIMAL(10,2),
    IN p_InternalMarks DECIMAL(10,2),
    IN p_ExternalMarks DECIMAL(10,2),
    IN p_MaximumMarks DECIMAL(10,2),
    IN p_PassingMarks DECIMAL(10,2),

    IN p_Credits INT,
    IN p_Description VARCHAR(500),

    IN p_IsActive BOOLEAN

)

BEGIN

    INSERT INTO Subjects
    (
        BoardId,
        AcademicYearId,
        AcademicLevel,
        GroupId,

        SubjectName,
        SubjectCode,
        SubjectType,

        TheoryMarks,
        PracticalMarks,
        InternalMarks,
        ExternalMarks,
        MaximumMarks,
        PassingMarks,

        Credits,
        Description,

        IsActive,
        CreatedAt
    )

    VALUES
    (
        p_BoardId,
        p_AcademicYearId,
        p_AcademicLevel,
        p_GroupId,

        p_SubjectName,
        p_SubjectCode,
        p_SubjectType,

        p_TheoryMarks,
        p_PracticalMarks,
        p_InternalMarks,
        p_ExternalMarks,
        p_MaximumMarks,
        p_PassingMarks,

        p_Credits,
        p_Description,

        p_IsActive,
        NOW()
    );

    SELECT

        s.SubjectId,

        s.BoardId,
        b.BoardName,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.SubjectName,
        s.SubjectCode,
        s.SubjectType,

        s.TheoryMarks,
        s.PracticalMarks,
        s.InternalMarks,
        s.ExternalMarks,
        s.MaximumMarks,
        s.PassingMarks,

        s.Credits,
        s.Description,

        s.IsActive,

        s.CreatedAt,
        s.UpdatedAt

    FROM Subjects s

    INNER JOIN Boards b
        ON s.BoardId = b.BoardId

    INNER JOIN AcademicYears ay
        ON s.AcademicYearId = ay.AcademicYearId

    INNER JOIN Groups g
        ON s.GroupId = g.GroupId

    WHERE s.SubjectId = LAST_INSERT_ID();

END;





DROP PROCEDURE IF EXISTS sp_UpdateSubject;

CREATE PROCEDURE sp_UpdateSubject(

    IN p_SubjectId INT,

    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,

    IN p_SubjectName VARCHAR(100),
    IN p_SubjectCode VARCHAR(50),
    IN p_SubjectType VARCHAR(30),

    IN p_TheoryMarks DECIMAL(10,2),
    IN p_PracticalMarks DECIMAL(10,2),
    IN p_InternalMarks DECIMAL(10,2),
    IN p_ExternalMarks DECIMAL(10,2),
    IN p_MaximumMarks DECIMAL(10,2),
    IN p_PassingMarks DECIMAL(10,2),

    IN p_Credits INT,
    IN p_Description VARCHAR(500),

    IN p_IsActive BOOLEAN

)

BEGIN

    UPDATE Subjects

    SET

        BoardId = p_BoardId,
        AcademicYearId = p_AcademicYearId,
        AcademicLevel = p_AcademicLevel,
        GroupId = p_GroupId,

        SubjectName = p_SubjectName,
        SubjectCode = p_SubjectCode,
        SubjectType = p_SubjectType,

        TheoryMarks = p_TheoryMarks,
        PracticalMarks = p_PracticalMarks,
        InternalMarks = p_InternalMarks,
        ExternalMarks = p_ExternalMarks,
        MaximumMarks = p_MaximumMarks,
        PassingMarks = p_PassingMarks,

        Credits = p_Credits,
        Description = p_Description,

        IsActive = p_IsActive,

        UpdatedAt = NOW()

    WHERE SubjectId = p_SubjectId;

    SELECT

        s.SubjectId,

        s.BoardId,
        b.BoardName,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.SubjectName,
        s.SubjectCode,
        s.SubjectType,

        s.TheoryMarks,
        s.PracticalMarks,
        s.InternalMarks,
        s.ExternalMarks,
        s.MaximumMarks,
        s.PassingMarks,

        s.Credits,
        s.Description,

        s.IsActive,

        s.CreatedAt,
        s.UpdatedAt

    FROM Subjects s

    INNER JOIN Boards b
        ON s.BoardId = b.BoardId

    INNER JOIN AcademicYears ay
        ON s.AcademicYearId = ay.AcademicYearId

    INNER JOIN Groups g
        ON s.GroupId = g.GroupId

    WHERE s.SubjectId = p_SubjectId;

END;





DROP PROCEDURE IF EXISTS sp_DeleteSubject;

CREATE PROCEDURE sp_DeleteSubject(

    IN p_SubjectId INT

)

BEGIN

    IF EXISTS
    (
        SELECT 1
        FROM Subjects
        WHERE SubjectId = p_SubjectId
    )
    THEN

        DELETE FROM Subjects
        WHERE SubjectId = p_SubjectId;

        SELECT
            1 AS Success,
            'Subject deleted successfully.' AS Message;

    ELSE

        SELECT
            0 AS Success,
            'Subject not found.' AS Message;

    END IF;

END;





DROP PROCEDURE IF EXISTS sp_GetAllSubjects;

CREATE PROCEDURE sp_GetAllSubjects()

BEGIN

    SELECT

        s.SubjectId,

        s.BoardId,
        b.BoardName,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.SubjectName,
        s.SubjectCode,
        s.SubjectType,

        s.TheoryMarks,
        s.PracticalMarks,
        s.InternalMarks,
        s.ExternalMarks,
        s.MaximumMarks,
        s.PassingMarks,

        s.Credits,
        s.Description,

        s.IsActive,

        s.CreatedAt,
        s.UpdatedAt

    FROM Subjects s

    INNER JOIN Boards b
        ON s.BoardId = b.BoardId

    INNER JOIN AcademicYears ay
        ON s.AcademicYearId = ay.AcademicYearId

    INNER JOIN Groups g
        ON s.GroupId = g.GroupId

    ORDER BY
        b.BoardName,
        ay.AcademicYearName,
        g.GroupName,
        s.SubjectName;

END;





DROP PROCEDURE IF EXISTS sp_GetSubjectById;

CREATE PROCEDURE sp_GetSubjectById(

    IN p_SubjectId INT

)

BEGIN

    SELECT

        s.SubjectId,

        s.BoardId,
        b.BoardName,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.SubjectName,
        s.SubjectCode,
        s.SubjectType,

        s.TheoryMarks,
        s.PracticalMarks,
        s.InternalMarks,
        s.ExternalMarks,
        s.MaximumMarks,
        s.PassingMarks,

        s.Credits,
        s.Description,

        s.IsActive,

        s.CreatedAt,
        s.UpdatedAt

    FROM Subjects s

    INNER JOIN Boards b
        ON s.BoardId = b.BoardId

    INNER JOIN AcademicYears ay
        ON s.AcademicYearId = ay.AcademicYearId

    INNER JOIN Groups g
        ON s.GroupId = g.GroupId

    WHERE s.SubjectId = p_SubjectId

    LIMIT 1;

END;





DROP PROCEDURE IF EXISTS sp_GetSubjectsByGroup;

CREATE PROCEDURE sp_GetSubjectsByGroup(

    IN p_GroupId INT

)

BEGIN

    SELECT

        s.SubjectId,

        s.BoardId,
        b.BoardName,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.SubjectName,
        s.SubjectCode,
        s.SubjectType,

        s.TheoryMarks,
        s.PracticalMarks,
        s.InternalMarks,
        s.ExternalMarks,
        s.MaximumMarks,
        s.PassingMarks,

        s.Credits,
        s.Description,

        s.IsActive,

        s.CreatedAt,
        s.UpdatedAt

    FROM Subjects s

    INNER JOIN Boards b
        ON s.BoardId = b.BoardId

    INNER JOIN AcademicYears ay
        ON s.AcademicYearId = ay.AcademicYearId

    INNER JOIN Groups g
        ON s.GroupId = g.GroupId

    WHERE s.GroupId = p_GroupId
      AND s.IsActive = TRUE

    ORDER BY s.SubjectName;

END;





DROP PROCEDURE IF EXISTS sp_ChangeSubjectStatus;

CREATE PROCEDURE sp_ChangeSubjectStatus(

    IN p_SubjectId INT,
    IN p_IsActive BOOLEAN

)

BEGIN

    UPDATE Subjects

    SET

        IsActive = p_IsActive,
        UpdatedAt = NOW()

    WHERE SubjectId = p_SubjectId;

    SELECT

        s.SubjectId,

        s.BoardId,
        b.BoardName,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.SubjectName,
        s.SubjectCode,
        s.SubjectType,

        s.TheoryMarks,
        s.PracticalMarks,
        s.InternalMarks,
        s.ExternalMarks,
        s.MaximumMarks,
        s.PassingMarks,

        s.Credits,
        s.Description,

        s.IsActive,

        s.CreatedAt,
        s.UpdatedAt

    FROM Subjects s

    INNER JOIN Boards b
        ON s.BoardId = b.BoardId

    INNER JOIN AcademicYears ay
        ON s.AcademicYearId = ay.AcademicYearId

    INNER JOIN Groups g
        ON s.GroupId = g.GroupId

    WHERE s.SubjectId = p_SubjectId

    LIMIT 1;

END;



INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260807045013_AddSubjectStoredProcedures', '8.0.13');

COMMIT;

CREATE TABLE IF NOT EXISTS Attendances (
    AttendanceId INT AUTO_INCREMENT PRIMARY KEY,
    AttendanceDate DATETIME NOT NULL,
    StudentId INT NOT NULL,
    FacultyId INT NOT NULL,
    BoardId INT NOT NULL,
    AcademicYearId INT NOT NULL,
    AcademicLevelId INT NOT NULL,
    GroupId INT NOT NULL,
    SectionId INT NOT NULL,
    SubjectId INT NOT NULL,
    Status TINYINT NOT NULL,
    Remarks VARCHAR(500) NULL,
    IsActive TINYINT(1) NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME NULL
);

START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260807052309_AddAttendanceTable', '8.0.13');

COMMIT;

START TRANSACTION;


DROP PROCEDURE IF EXISTS sp_PromoteStudent;



CREATE PROCEDURE sp_PromoteStudent
(
    IN p_StudentId INT,
    IN p_NewAcademicYearId INT,
    IN p_NewClassId INT,
    IN p_Remarks VARCHAR(500)
)
BEGIN
 
    INSERT INTO PromotionHistories
    (
        StudentId,
        FromAcademicYearId,
        ToAcademicYearId,
        FromClassId,
        ToClassId,
        PromotionDate,
        PromotedBy,
        Remarks,
        IsRollback
    )
    SELECT
        StudentId,
        AcademicYearId,
        p_NewAcademicYearId,
        1,
        p_NewClassId,
        NOW(),
        'Admin',
        p_Remarks,
        0
    FROM Students
    WHERE StudentId = p_StudentId;
 
    UPDATE Students
    SET
        AcademicYearId = p_NewAcademicYearId
    WHERE StudentId = p_StudentId;
 
END;



DROP PROCEDURE IF EXISTS sp_RollbackPromotion;



CREATE PROCEDURE sp_RollbackPromotion
(
    IN p_PromotionId INT
)
BEGIN
 
    UPDATE PromotionHistories
    SET
        IsRollback = 1,
        RollbackDate = NOW(),
        RollbackBy = 'Admin'
    WHERE Id = p_PromotionId;
 
END;



DROP PROCEDURE IF EXISTS sp_GetPromotionReport;



CREATE PROCEDURE sp_GetPromotionReport()
BEGIN
 
SELECT
    (SELECT COUNT(*) FROM Students) AS TotalStudents,
 
    (
        SELECT COUNT(*)
        FROM PromotionHistories
        WHERE IsRollback = 0
    ) AS PromotedStudents,
 
    (
        SELECT COUNT(*)
        FROM PromotionHistories
        WHERE IsRollback = 1
    ) AS RollbackStudents,
 
    (
        SELECT COUNT(*)
        FROM Students
        WHERE StudentId NOT IN
        (
            SELECT StudentId
            FROM PromotionHistories
            WHERE IsRollback = 0
        )
    ) AS PendingStudents;
 
END;


INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260807052344_UpdatePromotionStoredProcedures', '8.0.13');

COMMIT;


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


START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260807055333_AddFeeTables', '8.0.13');

COMMIT;


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


START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260807060615_AddStudentAdmissionModule', '8.0.13');

COMMIT;


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


START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260807062233_AddExaminationTables', '8.0.13');

COMMIT;

START TRANSACTION;


                DROP PROCEDURE IF EXISTS sp_GetExaminationDetails;
                CREATE PROCEDURE sp_GetExaminationDetails(
                    IN p_ExaminationId INT
                )
                BEGIN
                    SELECT 
                        e.ExaminationId,
                        e.ExamName,
                        e.StartDate,
                        e.EndDate,
                        e.Status,
                        e.IsActive,
                        ay.AcademicYearName,
                        g.GroupName,
                        b.BoardName,
                        al.AcademicLevelName,
                        at.AssessmentTypeName
                    FROM Examinations e
                    LEFT JOIN AcademicYears ay ON e.AcademicYearId = ay.AcademicYearId
                    LEFT JOIN `Groups` g ON e.GroupId = g.GroupId
                    LEFT JOIN Boards b ON e.BoardId = b.BoardId
                    LEFT JOIN AcademicLevels al ON e.AcademicLevelId = al.AcademicLevelId
                    LEFT JOIN AssessmentTypes at ON e.AssessmentTypeId = at.AssessmentTypeId
                    WHERE e.ExaminationId = p_ExaminationId;
                END;
            


                DROP PROCEDURE IF EXISTS sp_GetExamSchedulesByExamination;
                CREATE PROCEDURE sp_GetExamSchedulesByExamination(
                    IN p_ExaminationId INT
                )
                BEGIN
                    SELECT 
                        es.ExamScheduleId,
                        es.ExaminationId,
                        es.ExamDate,
                        es.ExamTime,
                        es.Hall,
                        es.Invigilator,
                        s.SubjectName,
                        s.SubjectCode
                    FROM ExamSchedules es
                    INNER JOIN Subjects s ON es.SubjectId = s.SubjectId
                    WHERE es.ExaminationId = p_ExaminationId AND es.IsActive = 1
                    ORDER BY es.ExamDate ASC, es.ExamTime ASC;
                END;
            


                DROP PROCEDURE IF EXISTS sp_GenerateHallTicketsForBatch;
                CREATE PROCEDURE sp_GenerateHallTicketsForBatch(
                    IN p_ExaminationId INT,
                    IN p_BatchId INT
                )
                BEGIN
                    INSERT INTO HallTickets (ExaminationId, StudentId, BatchId, GeneratedAt)
                    SELECT 
                        p_ExaminationId,
                        u.UserId,
                        p_BatchId,
                        NOW(6)
                    FROM Users u
                    WHERE u.UserId NOT IN (
                        SELECT ht.StudentId 
                        FROM HallTickets ht 
                        WHERE ht.ExaminationId = p_ExaminationId
                    );
                END;
            


                DROP PROCEDURE IF EXISTS sp_PublishExamSchedules;
                CREATE PROCEDURE sp_PublishExamSchedules(
                    IN p_ScheduleIds TEXT
                )
                BEGIN
                    UPDATE ExamSchedules 
                    SET IsActive = 1 
                    WHERE FIND_IN_SET(ExamScheduleId, p_ScheduleIds) > 0;
                END;
            


                DROP PROCEDURE IF EXISTS sp_GetInvigilatorsBySchedule;
                CREATE PROCEDURE sp_GetInvigilatorsBySchedule(
                    IN p_ExamScheduleId INT
                )
                BEGIN
                    SELECT 
                        ia.InvigilatorAssignmentId,
                        ia.ExamScheduleId,
                        ia.InvigilatorId,
                        ia.HallNumber,
                        ia.AssignedAt,
                        u.FullName AS InvigilatorName,
                        u.Email AS InvigilatorEmail
                    FROM InvigilatorAssignments ia
                    INNER JOIN Users u ON ia.InvigilatorId = u.UserId
                    WHERE ia.ExamScheduleId = p_ExamScheduleId;
                END;
            

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260807062611_AddExaminationProcedures', '8.0.13');

COMMIT;

START TRANSACTION;


DROP PROCEDURE IF EXISTS sp_CreateAdmission;

CREATE PROCEDURE sp_CreateAdmission
(
    IN p_AdmissionNo VARCHAR(30),
    IN p_AdmissionDate DATETIME,
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME,
    IN p_BloodGroup VARCHAR(10),
    IN p_StudentPhoto VARCHAR(500),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Nationality VARCHAR(100),
    IN p_Religion VARCHAR(100),
    IN p_Category VARCHAR(100),
    IN p_FatherName VARCHAR(150),
    IN p_MotherName VARCHAR(150),
    IN p_GuardianName VARCHAR(150),
    IN p_ParentMobile VARCHAR(15),
    IN p_ParentEmail VARCHAR(150),
    IN p_Occupation VARCHAR(100),
    IN p_AnnualIncome DECIMAL(18,2),
    IN p_Address VARCHAR(500),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(10),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousBoard VARCHAR(100),
    IN p_PreviousPercentage DECIMAL(5,2),
    IN p_BirthCertificate VARCHAR(500),
    IN p_TransferCertificate VARCHAR(500),
    IN p_StudyCertificate VARCHAR(500),
    IN p_AadhaarDocument VARCHAR(500),
    IN p_CommunityCertificate VARCHAR(500),
    IN p_IncomeCertificate VARCHAR(500),
    IN p_PassportPhoto VARCHAR(500)
)
BEGIN
INSERT INTO StudentAdmissions
(
AdmissionNo,AdmissionDate,FirstName,LastName,Gender,DateOfBirth,BloodGroup,StudentPhoto,
AadhaarNumber,Nationality,Religion,Category,FatherName,MotherName,GuardianName,
ParentMobile,ParentEmail,Occupation,AnnualIncome,Address,City,District,State,Pincode,
BoardId,AcademicYearId,AcademicLevel,GroupId,SectionId,PreviousSchool,PreviousBoard,
PreviousPercentage,BirthCertificate,TransferCertificate,StudyCertificate,AadhaarDocument,
CommunityCertificate,IncomeCertificate,PassportPhoto,Status,IsVerified,IsApproved,
IsRejected,IsActive,CreatedAt)
VALUES
(
p_AdmissionNo,p_AdmissionDate,p_FirstName,p_LastName,p_Gender,p_DateOfBirth,p_BloodGroup,p_StudentPhoto,
p_AadhaarNumber,p_Nationality,p_Religion,p_Category,p_FatherName,p_MotherName,p_GuardianName,
p_ParentMobile,p_ParentEmail,p_Occupation,p_AnnualIncome,p_Address,p_City,p_District,p_State,p_Pincode,
p_BoardId,p_AcademicYearId,p_AcademicLevel,p_GroupId,p_SectionId,p_PreviousSchool,p_PreviousBoard,
p_PreviousPercentage,p_BirthCertificate,p_TransferCertificate,p_StudyCertificate,p_AadhaarDocument,
p_CommunityCertificate,p_IncomeCertificate,p_PassportPhoto,'Pending',FALSE,FALSE,FALSE,TRUE,NOW());

SELECT sa.*, b.BoardName, ay.AcademicYearName, g.GroupName, s.SectionName
FROM StudentAdmissions sa
JOIN Boards b ON sa.BoardId=b.BoardId
JOIN AcademicYears ay ON sa.AcademicYearId=ay.AcademicYearId
JOIN Groups g ON sa.GroupId=g.GroupId
JOIN Sections s ON sa.SectionId=s.SectionId
WHERE sa.AdmissionId=LAST_INSERT_ID();

END;


INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260807063054_AddStudentAdmissionStoredProcedures', '8.0.13');

COMMIT;


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


START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260807100000_SyncAllMissingTables', '8.0.13');

COMMIT;


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


START TRANSACTION;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260807110000_AddTimetableTables', '8.0.13');

COMMIT;

START TRANSACTION;

ALTER TABLE `Faculties` ADD `FacultyType` varchar(20) NOT NULL DEFAULT 'Teaching';

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260811064521_AddFacultyTypeToFaculties', '8.0.13');

COMMIT;

START TRANSACTION;


                DROP PROCEDURE IF EXISTS sp_Validate_FacultySubjectAllocation_Migration;
                DROP PROCEDURE IF EXISTS sp_Validate_FacultySubjectAllocation_Staging;
            


                DROP TABLE IF EXISTS FacultySubjectAllocations_Backup;
                CREATE TABLE FacultySubjectAllocations_Backup LIKE FacultySubjectAllocations;
                INSERT INTO FacultySubjectAllocations_Backup SELECT * FROM FacultySubjectAllocations;
            


                CREATE PROCEDURE sp_Validate_FacultySubjectAllocation_Migration()
                BEGIN
                    -- Validation 1: Verify all FacultyId values exist in Faculties table
                    IF EXISTS (
                        SELECT 1 FROM FacultySubjectAllocations fsa 
                        LEFT JOIN Faculties f ON f.Id = fsa.FacultyId 
                        WHERE f.Id IS NULL
                    ) THEN
                        SIGNAL SQLSTATE '45000' 
                        SET MESSAGE_TEXT = 'Migration Failed: Orphan FacultyId found in FacultySubjectAllocations table.';
                    END IF;

                    -- Validation 2: Verify all SubjectId values are > 0 and exist in Subjects table
                    IF EXISTS (
                        SELECT 1 FROM FacultySubjectAllocations fsa 
                        LEFT JOIN Subjects sub ON sub.SubjectId = fsa.SubjectId 
                        WHERE fsa.SubjectId IS NULL OR fsa.SubjectId <= 0 OR sub.SubjectId IS NULL
                    ) THEN
                        SIGNAL SQLSTATE '45000' 
                        SET MESSAGE_TEXT = 'Migration Failed: Invalid or missing SubjectId found in FacultySubjectAllocations table.';
                    END IF;

                    -- Validation 3: Verify no duplicate (FacultyId, SubjectId) pairs exist
                    IF EXISTS (
                        SELECT 1 FROM FacultySubjectAllocations 
                        GROUP BY FacultyId, SubjectId 
                        HAVING COUNT(*) > 1
                    ) THEN
                        SIGNAL SQLSTATE '45000' 
                        SET MESSAGE_TEXT = 'Migration Failed: Duplicate (FacultyId, SubjectId) allocation found.';
                    END IF;
                END;
            


                CALL sp_Validate_FacultySubjectAllocation_Migration();
                DROP PROCEDURE IF EXISTS sp_Validate_FacultySubjectAllocation_Migration;
            


                DROP TABLE IF EXISTS FacultySubjectAllocations_Staging;
                CREATE TABLE FacultySubjectAllocations_Staging (
                    Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    FacultyId INT NOT NULL,
                    SubjectId INT NOT NULL,
                    CreatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    UpdatedAt DATETIME(6) NULL,
                    CONSTRAINT uq_Faculty_Subject UNIQUE (FacultyId, SubjectId),
                    CONSTRAINT fk_fsa_faculty FOREIGN KEY (FacultyId) REFERENCES Faculties(Id) ON DELETE CASCADE,
                    CONSTRAINT fk_fsa_subject FOREIGN KEY (SubjectId) REFERENCES Subjects(SubjectId) ON DELETE RESTRICT
                );

                INSERT INTO FacultySubjectAllocations_Staging (Id, FacultyId, SubjectId, CreatedAt, UpdatedAt)
                SELECT 
                    Id,
                    FacultyId,
                    SubjectId,
                    CreatedAt,
                    UpdatedAt
                FROM FacultySubjectAllocations;
            


                CREATE PROCEDURE sp_Validate_FacultySubjectAllocation_Staging()
                BEGIN
                    IF (SELECT COUNT(*) FROM FacultySubjectAllocations_Staging) <> (SELECT COUNT(*) FROM FacultySubjectAllocations) THEN
                        SIGNAL SQLSTATE '45000'
                        SET MESSAGE_TEXT = 'Migration Failed: Staging row count does not match source row count.';
                    END IF;
                END;
            


                CALL sp_Validate_FacultySubjectAllocation_Staging();
                DROP PROCEDURE IF EXISTS sp_Validate_FacultySubjectAllocation_Staging;
            


                RENAME TABLE FacultySubjectAllocations TO FacultySubjectAllocations_Old,
                             FacultySubjectAllocations_Staging TO FacultySubjectAllocations;
            

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260811090033_NormalizeFacultySubjectAllocation', '8.0.13');

COMMIT;

START TRANSACTION;


SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Faculties' AND COLUMN_NAME = 'Username');
SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE `Faculties` DROP COLUMN `Username`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Faculties' AND COLUMN_NAME = 'Password');
SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE `Faculties` DROP COLUMN `Password`', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;


INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260812160000_RemoveUsernameAndPasswordFromFaculty', '8.0.13');

COMMIT;

START TRANSACTION;


                DROP PROCEDURE IF EXISTS sp_Validate_Timetable_Schema_Migration;
                DROP PROCEDURE IF EXISTS sp_Validate_Timetable_Staging;
            


                DROP TABLE IF EXISTS Timetables_Backup_Legacy;
                CREATE TABLE Timetables_Backup_Legacy LIKE Timetables;
                INSERT INTO Timetables_Backup_Legacy SELECT * FROM Timetables;
            


                CREATE PROCEDURE sp_Validate_Timetable_Schema_Migration()
                BEGIN
                    DECLARE pk_col VARCHAR(50);
                    DECLARE invalid_cnt INT DEFAULT 0;

                    -- Dynamically detect primary key column name ('TimetableId' or 'Id')
                    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Timetables' AND COLUMN_NAME = 'TimetableId') THEN
                        SET pk_col = 'TimetableId';
                    ELSE
                        SET pk_col = 'Id';
                    END IF;

                    -- Validation 1: Verify Primary Key values are numeric strings
                    SET @v_sql = CONCAT('SELECT COUNT(*) INTO @invalid_cnt FROM Timetables WHERE `', pk_col, '` REGEXP ''^[0-9]+$'' = 0');
                    PREPARE stmt FROM @v_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
                    IF @invalid_cnt > 0 THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric Primary Key found in Timetables table.';
                    END IF;

                    -- Validation 2: Verify all BoardId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE BoardId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric BoardId found in Timetables table.';
                    END IF;

                    -- Validation 3: Verify all AcademicLevelId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE AcademicLevelId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric AcademicLevelId found in Timetables table.';
                    END IF;

                    -- Validation 4: Verify all AcademicYearId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE AcademicYearId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric AcademicYearId found in Timetables table.';
                    END IF;

                    -- Validation 5: Verify all GroupId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE GroupId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric GroupId found in Timetables table.';
                    END IF;

                    -- Validation 6: Verify all SectionId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE SectionId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric SectionId found in Timetables table.';
                    END IF;

                    -- Validation 7: Verify all DayOfWeek values are numeric or valid day names
                    IF EXISTS (
                        SELECT 1 FROM Timetables 
                        WHERE DayOfWeek REGEXP '^[0-9]+$' = 0 
                          AND LOWER(TRIM(DayOfWeek)) NOT IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday','mon','tue','wed','thu','fri','sat','sun')
                    ) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Invalid DayOfWeek text value found in Timetables table.';
                    END IF;

                    -- Validation 8: Verify all PeriodId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE PeriodId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric PeriodId found in Timetables table.';
                    END IF;

                    -- Validation 9: Verify all SubjectId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE SubjectId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric SubjectId found in Timetables table.';
                    END IF;

                    -- Validation 10: Verify all FacultyId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE FacultyId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric FacultyId found in Timetables table.';
                    END IF;

                    -- Validation 11: Verify all RoomId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE RoomId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric RoomId found in Timetables table.';
                    END IF;

                    -- Validation 12: Verify no orphan SectionId values exist
                    IF EXISTS (
                        SELECT 1 FROM Timetables t
                        LEFT JOIN Sections s ON s.SectionId = CAST(t.SectionId AS SIGNED)
                        WHERE s.SectionId IS NULL
                    ) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Orphan SectionId found in Timetables table.';
                    END IF;

                    -- Validation 13: Verify no orphan SubjectId values exist
                    IF EXISTS (
                        SELECT 1 FROM Timetables t
                        LEFT JOIN Subjects sub ON sub.SubjectId = CAST(t.SubjectId AS SIGNED)
                        WHERE sub.SubjectId IS NULL
                    ) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Orphan SubjectId found in Timetables table.';
                    END IF;

                    -- Validation 14: Verify no orphan FacultyId values exist
                    IF EXISTS (
                        SELECT 1 FROM Timetables t
                        LEFT JOIN Faculties f ON f.Id = CAST(t.FacultyId AS SIGNED)
                        WHERE f.Id IS NULL
                    ) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Orphan FacultyId found in Timetables table.';
                    END IF;

                    -- Validation 15: Verify no orphan PeriodId values exist
                    IF EXISTS (
                        SELECT 1 FROM Timetables t
                        LEFT JOIN Periods p ON p.PeriodId = CAST(t.PeriodId AS SIGNED)
                        WHERE p.PeriodId IS NULL
                    ) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Orphan PeriodId found in Timetables table.';
                    END IF;

                    -- Validation 16: Verify no orphan RoomId values exist
                    IF EXISTS (
                        SELECT 1 FROM Timetables t
                        LEFT JOIN Rooms r ON r.RoomId = CAST(t.RoomId AS SIGNED)
                        WHERE r.RoomId IS NULL
                    ) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Orphan RoomId found in Timetables table.';
                    END IF;
                END;
            


                CALL sp_Validate_Timetable_Schema_Migration();
                DROP PROCEDURE IF EXISTS sp_Validate_Timetable_Schema_Migration;
            


                DROP TABLE IF EXISTS Timetables_Staging;
                CREATE TABLE Timetables_Staging (
                    Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    BoardId INT NOT NULL,
                    AcademicLevelId INT NOT NULL,
                    AcademicYearId INT NOT NULL,
                    GroupId INT NOT NULL,
                    SectionId INT NOT NULL,
                    DayOfWeek INT NOT NULL,
                    PeriodId INT NOT NULL,
                    SubjectId INT NOT NULL,
                    FacultyId INT NOT NULL,
                    RoomId INT NOT NULL,
                    IsPublished TINYINT(1) NOT NULL DEFAULT 0,
                    Remarks VARCHAR(250) NULL,
                    CreatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    UpdatedAt DATETIME(6) NULL,
                    KEY IX_Timetables_BoardId (BoardId),
                    KEY IX_Timetables_AcademicYearId (AcademicYearId),
                    KEY IX_Timetables_SectionId (SectionId),
                    KEY IX_Timetables_PeriodId (PeriodId),
                    KEY IX_Timetables_FacultyId (FacultyId),
                    KEY IX_Timetables_RoomId (RoomId),
                    CONSTRAINT fk_timetable_board FOREIGN KEY (BoardId) REFERENCES Boards(BoardId) ON DELETE RESTRICT,
                    CONSTRAINT fk_timetable_academiclevel FOREIGN KEY (AcademicLevelId) REFERENCES AcademicLevels(AcademicLevelId) ON DELETE RESTRICT,
                    CONSTRAINT fk_timetable_academicyear FOREIGN KEY (AcademicYearId) REFERENCES AcademicYears(AcademicYearId) ON DELETE RESTRICT,
                    CONSTRAINT fk_timetable_group FOREIGN KEY (GroupId) REFERENCES `Groups`(GroupId) ON DELETE RESTRICT,
                    CONSTRAINT fk_timetable_section FOREIGN KEY (SectionId) REFERENCES Sections(SectionId) ON DELETE CASCADE,
                    CONSTRAINT fk_timetable_period FOREIGN KEY (PeriodId) REFERENCES Periods(PeriodId) ON DELETE RESTRICT,
                    CONSTRAINT fk_timetable_subject FOREIGN KEY (SubjectId) REFERENCES Subjects(SubjectId) ON DELETE RESTRICT,
                    CONSTRAINT fk_timetable_faculty FOREIGN KEY (FacultyId) REFERENCES Faculties(Id) ON DELETE RESTRICT,
                    CONSTRAINT fk_timetable_room FOREIGN KEY (RoomId) REFERENCES Rooms(RoomId) ON DELETE RESTRICT
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

                -- Dynamically select primary key column ('TimetableId' or 'Id') and map DayOfWeek safely
                SET @pk_col := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Timetables' AND COLUMN_NAME = 'TimetableId') > 0, 'TimetableId', 'Id');
                SET @insert_sql := CONCAT('
                    INSERT INTO Timetables_Staging (
                        Id, BoardId, AcademicLevelId, AcademicYearId, GroupId,
                        SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId,
                        RoomId, IsPublished, Remarks, CreatedAt, UpdatedAt
                    )
                    SELECT 
                        CAST(`', @pk_col, '` AS SIGNED),
                        CAST(BoardId AS SIGNED),
                        CAST(AcademicLevelId AS SIGNED),
                        CAST(AcademicYearId AS SIGNED),
                        CAST(GroupId AS SIGNED),
                        CAST(SectionId AS SIGNED),
                        CASE LOWER(TRIM(DayOfWeek))
                            WHEN ''monday'' THEN 1
                            WHEN ''tuesday'' THEN 2
                            WHEN ''wednesday'' THEN 3
                            WHEN ''thursday'' THEN 4
                            WHEN ''friday'' THEN 5
                            WHEN ''saturday'' THEN 6
                            WHEN ''sunday'' THEN 7
                            WHEN ''mon'' THEN 1
                            WHEN ''tue'' THEN 2
                            WHEN ''wed'' THEN 3
                            WHEN ''thu'' THEN 4
                            WHEN ''fri'' THEN 5
                            WHEN ''sat'' THEN 6
                            WHEN ''sun'' THEN 7
                            ELSE CAST(DayOfWeek AS SIGNED)
                        END,
                        CAST(PeriodId AS SIGNED),
                        CAST(SubjectId AS SIGNED),
                        CAST(FacultyId AS SIGNED),
                        CAST(RoomId AS SIGNED),
                        IsPublished,
                        Remarks,
                        CreatedAt,
                        UpdatedAt
                    FROM Timetables;
                ');
                PREPARE stmt FROM @insert_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            


                CREATE PROCEDURE sp_Validate_Timetable_Staging()
                BEGIN
                    IF (SELECT COUNT(*) FROM Timetables_Staging) <> (SELECT COUNT(*) FROM Timetables) THEN
                        SIGNAL SQLSTATE '45000'
                        SET MESSAGE_TEXT = 'Migration Failed: Staging row count does not match source row count.';
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM Timetables_Staging
                        WHERE BoardId IS NULL OR AcademicLevelId IS NULL OR AcademicYearId IS NULL
                           OR GroupId IS NULL OR SectionId IS NULL OR PeriodId IS NULL
                           OR SubjectId IS NULL OR FacultyId IS NULL OR RoomId IS NULL
                           OR DayOfWeek IS NULL
                    ) THEN
                        SIGNAL SQLSTATE '45000'
                        SET MESSAGE_TEXT = 'Migration Failed: NULL values found in required staging columns.';
                    END IF;
                END;
            


                CALL sp_Validate_Timetable_Staging();
                DROP PROCEDURE IF EXISTS sp_Validate_Timetable_Staging;
            


                RENAME TABLE Timetables TO Timetables_Old_Legacy,
                             Timetables_Staging TO Timetables;

                SET @max_id := (SELECT COALESCE(MAX(Id), 0) + 1 FROM Timetables);
                SET @alter_stmt := CONCAT('ALTER TABLE Timetables AUTO_INCREMENT = ', @max_id);
                PREPARE stmt FROM @alter_stmt;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260813171000_ReconcileTimetableSchemaToInt', '8.0.13');

COMMIT;

START TRANSACTION;


                SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Timetables' AND COLUMN_NAME = 'ApprovalStatus');
                SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Timetables` ADD COLUMN `ApprovalStatus` INT NOT NULL DEFAULT 0', 'SELECT 1');
                PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                UPDATE `Timetables`
                SET `ApprovalStatus` = IF(`IsPublished` = 1, 2, 0);
            

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260813183000_AddApprovalStatusToTimetable', '8.0.13');

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS `POMELO_BEFORE_DROP_PRIMARY_KEY`;
DELIMITER //
CREATE PROCEDURE `POMELO_BEFORE_DROP_PRIMARY_KEY`(IN `SCHEMA_NAME_ARGUMENT` VARCHAR(255), IN `TABLE_NAME_ARGUMENT` VARCHAR(255))
BEGIN
	DECLARE HAS_AUTO_INCREMENT_ID TINYINT(1);
	DECLARE PRIMARY_KEY_COLUMN_NAME VARCHAR(255);
	DECLARE PRIMARY_KEY_TYPE VARCHAR(255);
	DECLARE SQL_EXP VARCHAR(1000);
	SELECT COUNT(*)
		INTO HAS_AUTO_INCREMENT_ID
		FROM `information_schema`.`COLUMNS`
		WHERE `TABLE_SCHEMA` = (SELECT IFNULL(SCHEMA_NAME_ARGUMENT, SCHEMA()))
			AND `TABLE_NAME` = TABLE_NAME_ARGUMENT
			AND `Extra` = 'auto_increment'
			AND `COLUMN_KEY` = 'PRI'
			LIMIT 1;
	IF HAS_AUTO_INCREMENT_ID THEN
		SELECT `COLUMN_TYPE`
			INTO PRIMARY_KEY_TYPE
			FROM `information_schema`.`COLUMNS`
			WHERE `TABLE_SCHEMA` = (SELECT IFNULL(SCHEMA_NAME_ARGUMENT, SCHEMA()))
				AND `TABLE_NAME` = TABLE_NAME_ARGUMENT
				AND `COLUMN_KEY` = 'PRI'
			LIMIT 1;
		SELECT `COLUMN_NAME`
			INTO PRIMARY_KEY_COLUMN_NAME
			FROM `information_schema`.`COLUMNS`
			WHERE `TABLE_SCHEMA` = (SELECT IFNULL(SCHEMA_NAME_ARGUMENT, SCHEMA()))
				AND `TABLE_NAME` = TABLE_NAME_ARGUMENT
				AND `COLUMN_KEY` = 'PRI'
			LIMIT 1;
		SET SQL_EXP = CONCAT('ALTER TABLE `', (SELECT IFNULL(SCHEMA_NAME_ARGUMENT, SCHEMA())), '`.`', TABLE_NAME_ARGUMENT, '` MODIFY COLUMN `', PRIMARY_KEY_COLUMN_NAME, '` ', PRIMARY_KEY_TYPE, ' NOT NULL;');
		SET @SQL_EXP = SQL_EXP;
		PREPARE SQL_EXP_EXECUTE FROM @SQL_EXP;
		EXECUTE SQL_EXP_EXECUTE;
		DEALLOCATE PREPARE SQL_EXP_EXECUTE;
	END IF;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `POMELO_AFTER_ADD_PRIMARY_KEY`;
DELIMITER //
CREATE PROCEDURE `POMELO_AFTER_ADD_PRIMARY_KEY`(IN `SCHEMA_NAME_ARGUMENT` VARCHAR(255), IN `TABLE_NAME_ARGUMENT` VARCHAR(255), IN `COLUMN_NAME_ARGUMENT` VARCHAR(255))
BEGIN
	DECLARE HAS_AUTO_INCREMENT_ID INT(11);
	DECLARE PRIMARY_KEY_COLUMN_NAME VARCHAR(255);
	DECLARE PRIMARY_KEY_TYPE VARCHAR(255);
	DECLARE SQL_EXP VARCHAR(1000);
	SELECT COUNT(*)
		INTO HAS_AUTO_INCREMENT_ID
		FROM `information_schema`.`COLUMNS`
		WHERE `TABLE_SCHEMA` = (SELECT IFNULL(SCHEMA_NAME_ARGUMENT, SCHEMA()))
			AND `TABLE_NAME` = TABLE_NAME_ARGUMENT
			AND `COLUMN_NAME` = COLUMN_NAME_ARGUMENT
			AND `COLUMN_TYPE` LIKE '%int%'
			AND `COLUMN_KEY` = 'PRI';
	IF HAS_AUTO_INCREMENT_ID THEN
		SELECT `COLUMN_TYPE`
			INTO PRIMARY_KEY_TYPE
			FROM `information_schema`.`COLUMNS`
			WHERE `TABLE_SCHEMA` = (SELECT IFNULL(SCHEMA_NAME_ARGUMENT, SCHEMA()))
				AND `TABLE_NAME` = TABLE_NAME_ARGUMENT
				AND `COLUMN_NAME` = COLUMN_NAME_ARGUMENT
				AND `COLUMN_TYPE` LIKE '%int%'
				AND `COLUMN_KEY` = 'PRI';
		SELECT `COLUMN_NAME`
			INTO PRIMARY_KEY_COLUMN_NAME
			FROM `information_schema`.`COLUMNS`
			WHERE `TABLE_SCHEMA` = (SELECT IFNULL(SCHEMA_NAME_ARGUMENT, SCHEMA()))
				AND `TABLE_NAME` = TABLE_NAME_ARGUMENT
				AND `COLUMN_NAME` = COLUMN_NAME_ARGUMENT
				AND `COLUMN_TYPE` LIKE '%int%'
				AND `COLUMN_KEY` = 'PRI';
		SET SQL_EXP = CONCAT('ALTER TABLE `', (SELECT IFNULL(SCHEMA_NAME_ARGUMENT, SCHEMA())), '`.`', TABLE_NAME_ARGUMENT, '` MODIFY COLUMN `', PRIMARY_KEY_COLUMN_NAME, '` ', PRIMARY_KEY_TYPE, ' NOT NULL AUTO_INCREMENT;');
		SET @SQL_EXP = SQL_EXP;
		PREPARE SQL_EXP_EXECUTE FROM @SQL_EXP;
		EXECUTE SQL_EXP_EXECUTE;
		DEALLOCATE PREPARE SQL_EXP_EXECUTE;
	END IF;
END //
DELIMITER ;

ALTER TABLE `Attendances` DROP FOREIGN KEY `FK_Attendances_AcademicLevels_AcademicLevelId`;

ALTER TABLE `Attendances` DROP FOREIGN KEY `FK_Attendances_AcademicYears_AcademicYearId`;

ALTER TABLE `Attendances` DROP FOREIGN KEY `FK_Attendances_Boards_BoardId`;

ALTER TABLE `Attendances` DROP FOREIGN KEY `FK_Attendances_Faculty_FacultyId`;

ALTER TABLE `Attendances` DROP FOREIGN KEY `FK_Attendances_Groups_GroupId`;

ALTER TABLE `Attendances` DROP FOREIGN KEY `FK_Attendances_Sections_SectionId`;

ALTER TABLE `Attendances` DROP FOREIGN KEY `FK_Attendances_Students_StudentId`;

ALTER TABLE `Attendances` DROP FOREIGN KEY `FK_Attendances_Subjects_SubjectId`;

ALTER TABLE `FacultySubjectAllocation` DROP FOREIGN KEY `FK_FacultySubjectAllocation_Faculty_FacultyId`;

ALTER TABLE `Students` DROP INDEX `IX_Students_AdmissionId`;

ALTER TABLE `Groups` DROP INDEX `IX_Groups_Board`;

ALTER TABLE `Groups` DROP INDEX `IX_Groups_Board_AcademicYearId_IsActive`;

CALL POMELO_BEFORE_DROP_PRIMARY_KEY(NULL, 'Attendances');
ALTER TABLE `Attendances` DROP PRIMARY KEY;

ALTER TABLE `Attendances` DROP INDEX `IX_Attendances_AcademicLevelId`;

ALTER TABLE `Attendances` DROP INDEX `IX_Attendances_AcademicYearId`;

ALTER TABLE `Attendances` DROP INDEX `IX_Attendances_AttendanceDate`;

ALTER TABLE `Attendances` DROP INDEX `IX_Attendances_BoardId`;

ALTER TABLE `Attendances` DROP INDEX `IX_Attendances_FacultyId`;

ALTER TABLE `Attendances` DROP INDEX `IX_Attendances_GroupId`;

ALTER TABLE `Attendances` DROP INDEX `IX_Attendances_SectionId`;

ALTER TABLE `Attendances` DROP INDEX `IX_Attendances_StudentId_SubjectId_AttendanceDate`;

CALL POMELO_BEFORE_DROP_PRIMARY_KEY(NULL, 'FacultySubjectAllocation');
ALTER TABLE `FacultySubjectAllocation` DROP PRIMARY KEY;

CALL POMELO_BEFORE_DROP_PRIMARY_KEY(NULL, 'Faculty');
ALTER TABLE `Faculty` DROP PRIMARY KEY;

ALTER TABLE `Students` DROP COLUMN `AcademicLevel`;

ALTER TABLE `Students` DROP COLUMN `Board`;

ALTER TABLE `Students` DROP COLUMN `Section`;

ALTER TABLE `Groups` DROP COLUMN `AcademicLevel`;

ALTER TABLE `Groups` DROP COLUMN `Board`;

ALTER TABLE `Attendances` DROP COLUMN `AcademicLevelId`;

ALTER TABLE `Attendances` DROP COLUMN `AcademicYearId`;

ALTER TABLE `Attendances` DROP COLUMN `AttendanceDate`;

ALTER TABLE `Attendances` DROP COLUMN `BoardId`;

ALTER TABLE `Attendances` DROP COLUMN `FacultyId`;

ALTER TABLE `Attendances` DROP COLUMN `GroupId`;

ALTER TABLE `Attendances` DROP COLUMN `SectionId`;

ALTER TABLE `FacultySubjectAllocation` DROP COLUMN `AcademicLevel`;

ALTER TABLE `FacultySubjectAllocation` DROP COLUMN `AcademicYear`;

ALTER TABLE `FacultySubjectAllocation` DROP COLUMN `Board`;

ALTER TABLE `FacultySubjectAllocation` DROP COLUMN `Group`;

ALTER TABLE `FacultySubjectAllocation` DROP COLUMN `Section`;

ALTER TABLE `FacultySubjectAllocation` DROP COLUMN `Subject`;

ALTER TABLE `Faculty` DROP COLUMN `Department`;

ALTER TABLE `Faculty` DROP COLUMN `Password`;

ALTER TABLE `Faculty` DROP COLUMN `Username`;

ALTER TABLE `Attendances` RENAME `attendances`;

ALTER TABLE `FacultySubjectAllocation` RENAME `FacultySubjectAllocations`;

ALTER TABLE `Faculty` RENAME `Faculties`;

ALTER TABLE `Students` RENAME COLUMN `AdmissionId` TO `PreviousYearOfPassing`;

ALTER TABLE `attendances` RENAME COLUMN `SubjectId` TO `AttendanceSessionId`;

ALTER TABLE `attendances` RENAME INDEX `IX_Attendances_SubjectId` TO `IX_attendances_AttendanceSessionId`;

ALTER TABLE `FacultySubjectAllocations` RENAME INDEX `IX_FacultySubjectAllocation_FacultyId` TO `IX_FacultySubjectAllocations_FacultyId`;

ALTER TABLE `Students` MODIFY COLUMN `SectionId` int NOT NULL DEFAULT 0;

ALTER TABLE `Students` MODIFY COLUMN `ScholarshipAmount` decimal(18,2) NULL;

ALTER TABLE `Students` MODIFY COLUMN `RollNo` varchar(50) CHARACTER SET utf8mb4 NOT NULL;

ALTER TABLE `Students` MODIFY COLUMN `Remarks` varchar(1000) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` MODIFY COLUMN `MobileNumber` varchar(20) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` MODIFY COLUMN `Email` varchar(150) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` MODIFY COLUMN `DateOfBirth` datetime(6) NOT NULL;

ALTER TABLE `Students` MODIFY COLUMN `BoardId` int NOT NULL DEFAULT 0;

ALTER TABLE `Students` MODIFY COLUMN `AdmissionNo` varchar(50) CHARACTER SET utf8mb4 NOT NULL;

ALTER TABLE `Students` MODIFY COLUMN `AdmissionDate` datetime(6) NOT NULL;

ALTER TABLE `Students` ADD `AadhaarDocument` varchar(500) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `AcademicLevelId` int NOT NULL DEFAULT 0;

ALTER TABLE `Students` ADD `AdmissionQuota` varchar(50) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `AnnualIncome` decimal(18,2) NULL;

ALTER TABLE `Students` ADD `BirthCertificate` varchar(500) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `CasteCertificate` varchar(500) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `Category` varchar(50) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `City` varchar(100) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `CommunityCertificate` varchar(500) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `District` varchar(100) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `FatherEmail` varchar(150) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `FatherOccupation` varchar(100) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `GuardianEmail` varchar(150) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `IncomeCertificate` varchar(500) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `IsActive` tinyint(1) NOT NULL DEFAULT FALSE;

ALTER TABLE `Students` ADD `MarksMemo` varchar(500) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `MotherEmail` varchar(150) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `MotherOccupation` varchar(100) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `Nationality` varchar(50) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `Pincode` varchar(20) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `PreviousBoard` varchar(100) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `PreviousHallTicketNumber` varchar(100) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `PreviousPercentage` decimal(5,2) NULL;

ALTER TABLE `Students` ADD `Religion` varchar(50) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `SecondLanguage` varchar(50) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `State` varchar(100) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `Status` varchar(30) CHARACTER SET utf8mb4 NOT NULL DEFAULT '';

ALTER TABLE `Students` ADD `StudyCertificate` varchar(500) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `TenthCertificate` varchar(500) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Students` ADD `TransferCertificate` varchar(500) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Sections` ADD `RoomId` int NULL;

ALTER TABLE `Groups` ADD `AcademicLevelId` int NOT NULL DEFAULT 0;

ALTER TABLE `Groups` ADD `BoardId` int NOT NULL DEFAULT 0;

ALTER TABLE `Boards` MODIFY COLUMN `RankCalculation` tinyint(1) NOT NULL;

ALTER TABLE `Boards` ADD `RowVersion` int unsigned NOT NULL DEFAULT 0;

ALTER TABLE `FacultySubjectAllocations` ADD `SubjectId` int NOT NULL DEFAULT 0;

ALTER TABLE `Faculties` ADD `DepartmentId` int NULL;

ALTER TABLE `Faculties` ADD `FacultyType` varchar(20) CHARACTER SET utf8mb4 NOT NULL DEFAULT '';

ALTER TABLE `attendances` ADD CONSTRAINT `PK_attendances` PRIMARY KEY (`AttendanceId`);
CALL POMELO_AFTER_ADD_PRIMARY_KEY(NULL, 'attendances', 'AttendanceId');

ALTER TABLE `FacultySubjectAllocations` ADD CONSTRAINT `PK_FacultySubjectAllocations` PRIMARY KEY (`Id`);
CALL POMELO_AFTER_ADD_PRIMARY_KEY(NULL, 'FacultySubjectAllocations', 'Id');

ALTER TABLE `Faculties` ADD CONSTRAINT `PK_Faculties` PRIMARY KEY (`Id`);
CALL POMELO_AFTER_ADD_PRIMARY_KEY(NULL, 'Faculties', 'Id');

CREATE TABLE `admins` (
    `id` int NOT NULL AUTO_INCREMENT,
    `Email` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `Password` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    CONSTRAINT `PK_admins` PRIMARY KEY (`id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `Assignments` (
    `AssignmentId` int NOT NULL AUTO_INCREMENT,
    `Title` longtext CHARACTER SET utf8mb4 NOT NULL,
    `AcademicYearId` int NOT NULL,
    `AcademicLevel` longtext CHARACTER SET utf8mb4 NOT NULL,
    `GroupId` int NOT NULL,
    `SubjectId` int NOT NULL,
    `FacultyId` int NULL,
    `Description` longtext CHARACTER SET utf8mb4 NULL,
    `StartDate` datetime(6) NULL,
    `DueDate` datetime(6) NOT NULL,
    `Attachment` longtext CHARACTER SET utf8mb4 NOT NULL,
    `MaximumMarks` int NOT NULL,
    `CreatedByType` longtext CHARACTER SET utf8mb4 NULL,
    CONSTRAINT `PK_Assignments` PRIMARY KEY (`AssignmentId`),
    CONSTRAINT `FK_Assignments_AcademicYears_AcademicYearId` FOREIGN KEY (`AcademicYearId`) REFERENCES `AcademicYears` (`AcademicYearId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Assignments_Faculties_FacultyId` FOREIGN KEY (`FacultyId`) REFERENCES `Faculties` (`Id`),
    CONSTRAINT `FK_Assignments_Groups_GroupId` FOREIGN KEY (`GroupId`) REFERENCES `Groups` (`GroupId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Assignments_Subjects_SubjectId` FOREIGN KEY (`SubjectId`) REFERENCES `Subjects` (`SubjectId`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `attendance_sessions` (
    `AttendanceSessionId` int NOT NULL AUTO_INCREMENT,
    `TimetableId` int NULL,
    `AttendanceDate` datetime(6) NOT NULL,
    `PeriodId` int NULL,
    `SubjectId` int NOT NULL,
    `SectionId` int NOT NULL,
    `FacultyId` int NOT NULL,
    `RoomId` int NULL,
    `AcademicYearId` int NOT NULL,
    `AcademicLevelId` int NOT NULL,
    `GroupId` int NOT NULL,
    `BoardId` int NOT NULL,
    `IsLocked` tinyint(1) NOT NULL,
    `LockedBy` int NULL,
    `LockedAt` datetime(6) NULL,
    `SubstituteFacultyId` int NULL,
    `Remarks` varchar(500) CHARACTER SET utf8mb4 NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_attendance_sessions` PRIMARY KEY (`AttendanceSessionId`),
    CONSTRAINT `FK_attendance_sessions_AcademicLevels_AcademicLevelId` FOREIGN KEY (`AcademicLevelId`) REFERENCES `AcademicLevels` (`AcademicLevelId`) ON DELETE CASCADE,
    CONSTRAINT `FK_attendance_sessions_AcademicYears_AcademicYearId` FOREIGN KEY (`AcademicYearId`) REFERENCES `AcademicYears` (`AcademicYearId`) ON DELETE CASCADE,
    CONSTRAINT `FK_attendance_sessions_Boards_BoardId` FOREIGN KEY (`BoardId`) REFERENCES `Boards` (`BoardId`) ON DELETE CASCADE,
    CONSTRAINT `FK_attendance_sessions_Groups_GroupId` FOREIGN KEY (`GroupId`) REFERENCES `Groups` (`GroupId`) ON DELETE CASCADE,
    CONSTRAINT `FK_attendance_sessions_Sections_SectionId` FOREIGN KEY (`SectionId`) REFERENCES `Sections` (`SectionId`) ON DELETE CASCADE,
    CONSTRAINT `FK_attendance_sessions_Subjects_SubjectId` FOREIGN KEY (`SubjectId`) REFERENCES `Subjects` (`SubjectId`) ON DELETE CASCADE,
    CONSTRAINT `FK_attendance_sessions_Users_LockedBy` FOREIGN KEY (`LockedBy`) REFERENCES `Users` (`UserId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `AuditLogs` (
    `AuditLogId` bigint NOT NULL AUTO_INCREMENT,
    `UserName` varchar(150) CHARACTER SET utf8mb4 NULL,
    `Action` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `EntityName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `EntityId` int NULL,
    `Description` varchar(1000) CHARACTER SET utf8mb4 NULL,
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT `PK_AuditLogs` PRIMARY KEY (`AuditLogId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `BreakTypes` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Name` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_BreakTypes` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `Certificates` (
    `CertificateId` int NOT NULL AUTO_INCREMENT,
    `CertificateNumber` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
    `StudentId` int NOT NULL,
    `AdmissionNo` varchar(30) CHARACTER SET utf8mb4 NOT NULL,
    `StudentName` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `AcademicLevel` varchar(100) CHARACTER SET utf8mb4 NULL,
    `AcademicYear` varchar(50) CHARACTER SET utf8mb4 NULL,
    `CertificateType` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Purpose` varchar(250) CHARACTER SET utf8mb4 NOT NULL,
    `Remarks` varchar(1000) CHARACTER SET utf8mb4 NULL,
    `Status` varchar(30) CHARACTER SET utf8mb4 NOT NULL,
    `GeneratedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ReviewedAt` datetime(6) NULL,
    `ApprovedAt` datetime(6) NULL,
    `IssuedAt` datetime(6) NULL,
    `IssuedBy` varchar(150) CHARACTER SET utf8mb4 NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT TRUE,
    CONSTRAINT `PK_Certificates` PRIMARY KEY (`CertificateId`),
    CONSTRAINT `FK_Certificates_Students_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `Students` (`StudentId`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE TABLE `Departments` (
    `DepartmentId` int NOT NULL AUTO_INCREMENT,
    `DepartmentName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `DepartmentCode` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Departments` PRIMARY KEY (`DepartmentId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `Examinations` (
    `ExamId` int NOT NULL AUTO_INCREMENT,
    `ExamName` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `BoardId` int NOT NULL,
    `AcademicYearId` int NOT NULL,
    `AcademicLevelId` int NOT NULL,
    `GroupId` int NOT NULL,
    `AssessmentTypeId` int NOT NULL,
    `StartDate` date NOT NULL,
    `EndDate` date NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    `Status` longtext CHARACTER SET utf8mb4 NOT NULL,
    CONSTRAINT `PK_Examinations` PRIMARY KEY (`ExamId`),
    CONSTRAINT `FK_Examinations_AcademicLevels_AcademicLevelId` FOREIGN KEY (`AcademicLevelId`) REFERENCES `AcademicLevels` (`AcademicLevelId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Examinations_AcademicYears_AcademicYearId` FOREIGN KEY (`AcademicYearId`) REFERENCES `AcademicYears` (`AcademicYearId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Examinations_AssessmentTypes_AssessmentTypeId` FOREIGN KEY (`AssessmentTypeId`) REFERENCES `AssessmentTypes` (`AssessmentTypeId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Examinations_Boards_BoardId` FOREIGN KEY (`BoardId`) REFERENCES `Boards` (`BoardId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Examinations_Groups_GroupId` FOREIGN KEY (`GroupId`) REFERENCES `Groups` (`GroupId`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `FeeStructures` (
    `FeeStructureId` int NOT NULL AUTO_INCREMENT,
    `BoardId` int NOT NULL,
    `AcademicYearId` int NOT NULL,
    `AcademicLevelId` int NOT NULL,
    `GroupId` int NOT NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT TRUE,
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_FeeStructures` PRIMARY KEY (`FeeStructureId`),
    CONSTRAINT `FK_FeeStructures_AcademicLevels_AcademicLevelId` FOREIGN KEY (`AcademicLevelId`) REFERENCES `AcademicLevels` (`AcademicLevelId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_FeeStructures_AcademicYears_AcademicYearId` FOREIGN KEY (`AcademicYearId`) REFERENCES `AcademicYears` (`AcademicYearId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_FeeStructures_Boards_BoardId` FOREIGN KEY (`BoardId`) REFERENCES `Boards` (`BoardId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_FeeStructures_Groups_GroupId` FOREIGN KEY (`GroupId`) REFERENCES `Groups` (`GroupId`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE TABLE `FeeTypes` (
    `FeeTypeId` int NOT NULL AUTO_INCREMENT,
    `FeeTypeCode` varchar(30) CHARACTER SET utf8mb4 NOT NULL,
    `FeeTypeName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Description` varchar(500) CHARACTER SET utf8mb4 NULL,
    `IsMandatory` tinyint(1) NOT NULL DEFAULT FALSE,
    `IsActive` tinyint(1) NOT NULL DEFAULT TRUE,
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_FeeTypes` PRIMARY KEY (`FeeTypeId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `PeriodStructures` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Name` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `DayStartTime` time(6) NOT NULL,
    `PeriodDurationMinutes` int NOT NULL,
    `TotalTeachingPeriods` int NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_PeriodStructures` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `Rooms` (
    `RoomId` int NOT NULL AUTO_INCREMENT,
    `RoomNumber` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `BuildingName` varchar(100) CHARACTER SET utf8mb4 NULL,
    `Floor` int NULL,
    `Capacity` int NOT NULL,
    `RoomType` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Rooms` PRIMARY KEY (`RoomId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `StudentAdmissions` (
    `AdmissionId` int NOT NULL AUTO_INCREMENT,
    `AdmissionNo` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `AdmissionDate` datetime(6) NOT NULL,
    `AdmissionQuota` varchar(50) CHARACTER SET utf8mb4 NULL,
    `FirstName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `LastName` varchar(100) CHARACTER SET utf8mb4 NULL,
    `Gender` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `DateOfBirth` datetime(6) NOT NULL,
    `BloodGroup` varchar(10) CHARACTER SET utf8mb4 NULL,
    `StudentPhoto` varchar(500) CHARACTER SET utf8mb4 NULL,
    `StudentEmail` varchar(150) CHARACTER SET utf8mb4 NULL,
    `StudentMobileNumber` varchar(20) CHARACTER SET utf8mb4 NULL,
    `AadhaarNumber` varchar(20) CHARACTER SET utf8mb4 NULL,
    `Nationality` varchar(50) CHARACTER SET utf8mb4 NULL,
    `Religion` varchar(50) CHARACTER SET utf8mb4 NULL,
    `Category` varchar(50) CHARACTER SET utf8mb4 NULL,
    `FatherName` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `FatherOccupation` varchar(100) CHARACTER SET utf8mb4 NULL,
    `FatherMobile` varchar(20) CHARACTER SET utf8mb4 NULL,
    `FatherEmail` varchar(150) CHARACTER SET utf8mb4 NULL,
    `MotherName` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `MotherOccupation` varchar(100) CHARACTER SET utf8mb4 NULL,
    `MotherMobile` varchar(20) CHARACTER SET utf8mb4 NULL,
    `MotherEmail` varchar(150) CHARACTER SET utf8mb4 NULL,
    `GuardianName` varchar(150) CHARACTER SET utf8mb4 NULL,
    `GuardianMobile` varchar(20) CHARACTER SET utf8mb4 NULL,
    `GuardianEmail` varchar(150) CHARACTER SET utf8mb4 NULL,
    `AnnualIncome` decimal(65,30) NULL,
    `Address` varchar(1000) CHARACTER SET utf8mb4 NULL,
    `City` varchar(100) CHARACTER SET utf8mb4 NULL,
    `District` varchar(100) CHARACTER SET utf8mb4 NULL,
    `State` varchar(100) CHARACTER SET utf8mb4 NULL,
    `Pincode` varchar(20) CHARACTER SET utf8mb4 NULL,
    `BoardId` int NOT NULL,
    `AcademicYearId` int NOT NULL,
    `AcademicLevelId` int NOT NULL,
    `GroupId` int NOT NULL,
    `SectionId` int NOT NULL,
    `PreviousSchool` varchar(200) CHARACTER SET utf8mb4 NULL,
    `PreviousBoard` varchar(100) CHARACTER SET utf8mb4 NULL,
    `PreviousPercentage` decimal(65,30) NULL,
    `PreviousYearOfPassing` int NULL,
    `MarksMemo` varchar(500) CHARACTER SET utf8mb4 NULL,
    `SecondLanguage` varchar(50) CHARACTER SET utf8mb4 NULL,
    `AdmissionType` varchar(50) CHARACTER SET utf8mb4 NULL,
    `Medium` varchar(50) CHARACTER SET utf8mb4 NULL,
    `ScholarshipStatus` varchar(50) CHARACTER SET utf8mb4 NULL,
    `RollNo` varchar(50) CHARACTER SET utf8mb4 NULL,
    `BirthCertificate` varchar(500) CHARACTER SET utf8mb4 NULL,
    `TransferCertificate` varchar(500) CHARACTER SET utf8mb4 NULL,
    `StudyCertificate` varchar(500) CHARACTER SET utf8mb4 NULL,
    `AadhaarDocument` varchar(500) CHARACTER SET utf8mb4 NULL,
    `CommunityCertificate` varchar(500) CHARACTER SET utf8mb4 NULL,
    `IncomeCertificate` varchar(500) CHARACTER SET utf8mb4 NULL,
    `CasteCertificate` varchar(500) CHARACTER SET utf8mb4 NULL,
    `TenthCertificate` varchar(500) CHARACTER SET utf8mb4 NULL,
    `Status` varchar(30) CHARACTER SET utf8mb4 NOT NULL,
    `IsVerified` tinyint(1) NOT NULL,
    `IsApproved` tinyint(1) NOT NULL,
    `IsRejected` tinyint(1) NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    `Remarks` varchar(1000) CHARACTER SET utf8mb4 NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_StudentAdmissions` PRIMARY KEY (`AdmissionId`),
    CONSTRAINT `FK_StudentAdmissions_AcademicLevels_AcademicLevelId` FOREIGN KEY (`AcademicLevelId`) REFERENCES `AcademicLevels` (`AcademicLevelId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_StudentAdmissions_AcademicYears_AcademicYearId` FOREIGN KEY (`AcademicYearId`) REFERENCES `AcademicYears` (`AcademicYearId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_StudentAdmissions_Boards_BoardId` FOREIGN KEY (`BoardId`) REFERENCES `Boards` (`BoardId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_StudentAdmissions_Groups_GroupId` FOREIGN KEY (`GroupId`) REFERENCES `Groups` (`GroupId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_StudentAdmissions_Sections_SectionId` FOREIGN KEY (`SectionId`) REFERENCES `Sections` (`SectionId`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE TABLE `StudentFees` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `StudentId` int NOT NULL,
    `DueAmount` decimal(65,30) NOT NULL,
    CONSTRAINT `PK_StudentFees` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `StudyMaterials` (
    `StudyMaterialId` int NOT NULL AUTO_INCREMENT,
    `Title` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
    `Subject` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Faculty` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `FilePath` varchar(500) CHARACTER SET utf8mb4 NOT NULL,
    `UploadedAt` datetime(6) NOT NULL,
    CONSTRAINT `PK_StudyMaterials` PRIMARY KEY (`StudyMaterialId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `AssignmentSubmissions` (
    `SubmissionId` int NOT NULL AUTO_INCREMENT,
    `AssignmentId` int NOT NULL,
    `StudentId` int NOT NULL,
    `StudentName` varchar(150) CHARACTER SET utf8mb4 NULL,
    `RollNo` varchar(50) CHARACTER SET utf8mb4 NULL,
    `GroupId` int NULL,
    `SectionId` int NULL,
    `SubjectId` int NULL,
    `Title` varchar(200) CHARACTER SET utf8mb4 NULL,
    `FileUrl` varchar(500) CHARACTER SET utf8mb4 NULL,
    `Description` varchar(1000) CHARACTER SET utf8mb4 NULL,
    `SubmissionStatus` varchar(50) CHARACTER SET utf8mb4 NULL,
    `Status` varchar(50) CHARACTER SET utf8mb4 NULL,
    `MarksObtained` decimal(65,30) NULL,
    `Feedback` varchar(500) CHARACTER SET utf8mb4 NULL,
    `SubmissionDate` datetime(6) NOT NULL,
    `CreatedAt` datetime(6) NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_AssignmentSubmissions` PRIMARY KEY (`SubmissionId`),
    CONSTRAINT `FK_AssignmentSubmissions_Assignments_AssignmentId` FOREIGN KEY (`AssignmentId`) REFERENCES `Assignments` (`AssignmentId`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `ExamSchedules` (
    `ExamScheduleId` int NOT NULL AUTO_INCREMENT,
    `ExaminationId` int NOT NULL,
    `SubjectId` int NOT NULL,
    `ExamDate` date NOT NULL,
    `ExamTime` time(6) NOT NULL,
    `Hall` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Invigilator` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    CONSTRAINT `PK_ExamSchedules` PRIMARY KEY (`ExamScheduleId`),
    CONSTRAINT `FK_ExamSchedules_Examinations_ExaminationId` FOREIGN KEY (`ExaminationId`) REFERENCES `Examinations` (`ExamId`) ON DELETE CASCADE,
    CONSTRAINT `FK_ExamSchedules_Subjects_SubjectId` FOREIGN KEY (`SubjectId`) REFERENCES `Subjects` (`SubjectId`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `HallTickets` (
    `HallTicketId` int NOT NULL AUTO_INCREMENT,
    `ExaminationId` int NOT NULL,
    `StudentId` int NOT NULL,
    `BatchId` int NOT NULL,
    `GeneratedAt` datetime(6) NOT NULL,
    CONSTRAINT `PK_HallTickets` PRIMARY KEY (`HallTicketId`),
    CONSTRAINT `FK_HallTickets_Examinations_ExaminationId` FOREIGN KEY (`ExaminationId`) REFERENCES `Examinations` (`ExamId`) ON DELETE CASCADE,
    CONSTRAINT `FK_HallTickets_Users_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `Users` (`UserId`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `Marks` (
    `MarkId` int NOT NULL AUTO_INCREMENT,
    `Board` longtext CHARACTER SET utf8mb4 NULL,
    `BoardId` int NULL,
    `AcademicYearId` int NOT NULL,
    `AcademicLevel` longtext CHARACTER SET utf8mb4 NULL,
    `AcademicLevelId` int NULL,
    `GroupId` int NOT NULL,
    `SectionId` int NOT NULL,
    `ExaminationId` int NOT NULL,
    `SubjectId` int NOT NULL,
    `StudentId` int NOT NULL,
    `RollNo` longtext CHARACTER SET utf8mb4 NULL,
    `StudentName` longtext CHARACTER SET utf8mb4 NULL,
    `FacultyId` int NULL,
    `InternalMarks` int NOT NULL,
    `PracticalMarks` int NOT NULL,
    `TheoryMarks` int NOT NULL,
    `TotalMarks` int NOT NULL,
    `PassingMarks` int NOT NULL,
    `IsAbsent` tinyint(1) NOT NULL,
    `Remarks` varchar(250) CHARACTER SET utf8mb4 NULL,
    `IsVerified` tinyint(1) NOT NULL,
    `IsPublished` tinyint(1) NOT NULL,
    `Status` int NOT NULL,
    `IsLocked` tinyint(1) NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    `VerifiedBy` varchar(100) CHARACTER SET utf8mb4 NULL,
    `VerifiedAt` datetime(6) NULL,
    `ApprovedBy` int NULL,
    `ApprovedAt` datetime(6) NULL,
    `PublishedAt` datetime(6) NULL,
    CONSTRAINT `PK_Marks` PRIMARY KEY (`MarkId`),
    CONSTRAINT `FK_Marks_AcademicLevels_AcademicLevelId` FOREIGN KEY (`AcademicLevelId`) REFERENCES `AcademicLevels` (`AcademicLevelId`),
    CONSTRAINT `FK_Marks_AcademicYears_AcademicYearId` FOREIGN KEY (`AcademicYearId`) REFERENCES `AcademicYears` (`AcademicYearId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Marks_Boards_BoardId` FOREIGN KEY (`BoardId`) REFERENCES `Boards` (`BoardId`),
    CONSTRAINT `FK_Marks_Examinations_ExaminationId` FOREIGN KEY (`ExaminationId`) REFERENCES `Examinations` (`ExamId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Marks_Faculties_FacultyId` FOREIGN KEY (`FacultyId`) REFERENCES `Faculties` (`Id`),
    CONSTRAINT `FK_Marks_Groups_GroupId` FOREIGN KEY (`GroupId`) REFERENCES `Groups` (`GroupId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Marks_Sections_SectionId` FOREIGN KEY (`SectionId`) REFERENCES `Sections` (`SectionId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Marks_Students_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `Students` (`StudentId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Marks_Subjects_SubjectId` FOREIGN KEY (`SubjectId`) REFERENCES `Subjects` (`SubjectId`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `Results` (
    `ResultId` int NOT NULL AUTO_INCREMENT,
    `StudentId` int NOT NULL,
    `BoardId` int NOT NULL,
    `AcademicYearId` int NOT NULL,
    `AcademicLevelId` int NOT NULL,
    `GroupId` int NOT NULL,
    `ExamId` int NOT NULL,
    `SubjectId` int NOT NULL,
    `InternalMarks` decimal(5,2) NOT NULL,
    `PracticalMarks` decimal(5,2) NOT NULL,
    `ExternalMarks` decimal(5,2) NOT NULL,
    `TotalMarks` decimal(5,2) NOT NULL,
    `Grade` varchar(10) CHARACTER SET utf8mb4 NOT NULL,
    `ResultStatus` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `Rank` int NULL,
    `PublishedDate` datetime(6) NULL,
    `IsPublished` tinyint(1) NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Results` PRIMARY KEY (`ResultId`),
    CONSTRAINT `FK_Results_AcademicLevels_AcademicLevelId` FOREIGN KEY (`AcademicLevelId`) REFERENCES `AcademicLevels` (`AcademicLevelId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Results_AcademicYears_AcademicYearId` FOREIGN KEY (`AcademicYearId`) REFERENCES `AcademicYears` (`AcademicYearId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Results_Boards_BoardId` FOREIGN KEY (`BoardId`) REFERENCES `Boards` (`BoardId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Results_Examinations_ExamId` FOREIGN KEY (`ExamId`) REFERENCES `Examinations` (`ExamId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Results_Groups_GroupId` FOREIGN KEY (`GroupId`) REFERENCES `Groups` (`GroupId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Results_Students_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `Students` (`StudentId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Results_Subjects_SubjectId` FOREIGN KEY (`SubjectId`) REFERENCES `Subjects` (`SubjectId`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `FeeStructureItems` (
    `FeeStructureItemId` int NOT NULL AUTO_INCREMENT,
    `FeeStructureId` int NOT NULL,
    `FeeTypeId` int NOT NULL,
    `Amount` decimal(10,2) NOT NULL,
    `DueDate` datetime(6) NULL,
    `IsMandatory` tinyint(1) NOT NULL DEFAULT FALSE,
    `IsActive` tinyint(1) NOT NULL DEFAULT TRUE,
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_FeeStructureItems` PRIMARY KEY (`FeeStructureItemId`),
    CONSTRAINT `FK_FeeStructureItems_FeeStructures_FeeStructureId` FOREIGN KEY (`FeeStructureId`) REFERENCES `FeeStructures` (`FeeStructureId`) ON DELETE CASCADE,
    CONSTRAINT `FK_FeeStructureItems_FeeTypes_FeeTypeId` FOREIGN KEY (`FeeTypeId`) REFERENCES `FeeTypes` (`FeeTypeId`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE TABLE `Periods` (
    `PeriodId` int NOT NULL AUTO_INCREMENT,
    `PeriodStructureId` int NULL,
    `PeriodName` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `StartTime` time(6) NOT NULL,
    `EndTime` time(6) NOT NULL,
    `DisplayOrder` int NOT NULL,
    `IsBreak` tinyint(1) NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Periods` PRIMARY KEY (`PeriodId`),
    CONSTRAINT `FK_Periods_PeriodStructures_PeriodStructureId` FOREIGN KEY (`PeriodStructureId`) REFERENCES `PeriodStructures` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `PeriodStructureAssignments` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `PeriodStructureId` int NOT NULL,
    `BoardId` int NOT NULL,
    `AcademicLevelId` int NOT NULL,
    `AcademicYearId` int NOT NULL,
    `GroupId` int NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_PeriodStructureAssignments` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_PeriodStructureAssignments_AcademicLevels_AcademicLevelId` FOREIGN KEY (`AcademicLevelId`) REFERENCES `AcademicLevels` (`AcademicLevelId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_PeriodStructureAssignments_AcademicYears_AcademicYearId` FOREIGN KEY (`AcademicYearId`) REFERENCES `AcademicYears` (`AcademicYearId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_PeriodStructureAssignments_Boards_BoardId` FOREIGN KEY (`BoardId`) REFERENCES `Boards` (`BoardId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_PeriodStructureAssignments_Groups_GroupId` FOREIGN KEY (`GroupId`) REFERENCES `Groups` (`GroupId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_PeriodStructureAssignments_PeriodStructures_PeriodStructureId` FOREIGN KEY (`PeriodStructureId`) REFERENCES `PeriodStructures` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `PeriodStructureItems` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `PeriodStructureId` int NOT NULL,
    `SequenceOrder` int NOT NULL,
    `ItemType` varchar(30) CHARACTER SET utf8mb4 NOT NULL,
    `PeriodNumber` int NULL,
    `BreakTypeId` int NULL,
    `DurationMinutes` int NOT NULL,
    `Name` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    CONSTRAINT `PK_PeriodStructureItems` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_PeriodStructureItems_BreakTypes_BreakTypeId` FOREIGN KEY (`BreakTypeId`) REFERENCES `BreakTypes` (`Id`) ON DELETE SET NULL,
    CONSTRAINT `FK_PeriodStructureItems_PeriodStructures_PeriodStructureId` FOREIGN KEY (`PeriodStructureId`) REFERENCES `PeriodStructures` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `InvigilatorAssignments` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `ExamScheduleId` int NOT NULL,
    `InvigilatorId` int NOT NULL,
    `HallNumber` longtext CHARACTER SET utf8mb4 NOT NULL,
    `AssignedAt` datetime(6) NOT NULL,
    CONSTRAINT `PK_InvigilatorAssignments` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_InvigilatorAssignments_ExamSchedules_ExamScheduleId` FOREIGN KEY (`ExamScheduleId`) REFERENCES `ExamSchedules` (`ExamScheduleId`) ON DELETE CASCADE,
    CONSTRAINT `FK_InvigilatorAssignments_Users_InvigilatorId` FOREIGN KEY (`InvigilatorId`) REFERENCES `Users` (`UserId`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `Revaluations` (
    `RevaluationId` int NOT NULL AUTO_INCREMENT,
    `ResultId` int NOT NULL,
    `StudentId` int NOT NULL,
    `SubjectId` int NOT NULL,
    `Reason` varchar(500) CHARACTER SET utf8mb4 NOT NULL,
    `OldMarks` decimal(5,2) NOT NULL,
    `NewMarks` decimal(5,2) NULL,
    `FeePaid` tinyint(1) NOT NULL,
    `RequestedDate` datetime(6) NOT NULL,
    `ReviewedBy` int NULL,
    `ReviewedDate` datetime(6) NULL,
    `Status` varchar(30) CHARACTER SET utf8mb4 NOT NULL,
    `Remarks` varchar(500) CHARACTER SET utf8mb4 NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Revaluations` PRIMARY KEY (`RevaluationId`),
    CONSTRAINT `FK_Revaluations_Results_ResultId` FOREIGN KEY (`ResultId`) REFERENCES `Results` (`ResultId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Revaluations_Students_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `Students` (`StudentId`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `Timetables` (
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
    `IsPublished` tinyint(1) NOT NULL,
    `ApprovalStatus` int NOT NULL,
    `Remarks` varchar(250) CHARACTER SET utf8mb4 NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Timetables` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Timetables_AcademicLevels_AcademicLevelId` FOREIGN KEY (`AcademicLevelId`) REFERENCES `AcademicLevels` (`AcademicLevelId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Timetables_AcademicYears_AcademicYearId` FOREIGN KEY (`AcademicYearId`) REFERENCES `AcademicYears` (`AcademicYearId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Timetables_Boards_BoardId` FOREIGN KEY (`BoardId`) REFERENCES `Boards` (`BoardId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Timetables_Faculties_FacultyId` FOREIGN KEY (`FacultyId`) REFERENCES `Faculties` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_Timetables_Groups_GroupId` FOREIGN KEY (`GroupId`) REFERENCES `Groups` (`GroupId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Timetables_Periods_PeriodId` FOREIGN KEY (`PeriodId`) REFERENCES `Periods` (`PeriodId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Timetables_Rooms_RoomId` FOREIGN KEY (`RoomId`) REFERENCES `Rooms` (`RoomId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Timetables_Sections_SectionId` FOREIGN KEY (`SectionId`) REFERENCES `Sections` (`SectionId`) ON DELETE CASCADE,
    CONSTRAINT `FK_Timetables_Subjects_SubjectId` FOREIGN KEY (`SubjectId`) REFERENCES `Subjects` (`SubjectId`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE INDEX `IX_Students_AcademicLevelId` ON `Students` (`AcademicLevelId`);

CREATE INDEX `IX_Students_AcademicYearId` ON `Students` (`AcademicYearId`);

CREATE INDEX `IX_Students_GroupId` ON `Students` (`GroupId`);

CREATE INDEX `IX_Sections_AcademicYearId` ON `Sections` (`AcademicYearId`);

CREATE INDEX `IX_Sections_RoomId` ON `Sections` (`RoomId`);

CREATE INDEX `IX_Groups_AcademicLevelId` ON `Groups` (`AcademicLevelId`);

CREATE INDEX `IX_Groups_BoardId` ON `Groups` (`BoardId`);

CREATE INDEX `IX_Groups_BoardId_AcademicYearId_AcademicLevelId_IsActive` ON `Groups` (`BoardId`, `AcademicYearId`, `AcademicLevelId`, `IsActive`);

CREATE UNIQUE INDEX `UX_Attendances_Student_Session` ON `attendances` (`StudentId`, `AttendanceSessionId`);

CREATE INDEX `IX_FacultySubjectAllocations_SubjectId` ON `FacultySubjectAllocations` (`SubjectId`);

CREATE INDEX `IX_Assignments_AcademicYearId` ON `Assignments` (`AcademicYearId`);

CREATE INDEX `IX_Assignments_FacultyId` ON `Assignments` (`FacultyId`);

CREATE INDEX `IX_Assignments_GroupId` ON `Assignments` (`GroupId`);

CREATE INDEX `IX_Assignments_SubjectId` ON `Assignments` (`SubjectId`);

CREATE INDEX `IX_AssignmentSubmissions_AssignmentId` ON `AssignmentSubmissions` (`AssignmentId`);

CREATE INDEX `IX_attendance_sessions_AcademicLevelId` ON `attendance_sessions` (`AcademicLevelId`);

CREATE INDEX `IX_attendance_sessions_AcademicYearId` ON `attendance_sessions` (`AcademicYearId`);

CREATE INDEX `IX_attendance_sessions_BoardId` ON `attendance_sessions` (`BoardId`);

CREATE INDEX `IX_attendance_sessions_GroupId` ON `attendance_sessions` (`GroupId`);

CREATE INDEX `IX_attendance_sessions_LockedBy` ON `attendance_sessions` (`LockedBy`);

CREATE INDEX `IX_attendance_sessions_SectionId` ON `attendance_sessions` (`SectionId`);

CREATE INDEX `IX_attendance_sessions_SubjectId` ON `attendance_sessions` (`SubjectId`);

CREATE INDEX `IX_AuditLogs_CreatedAt` ON `AuditLogs` (`CreatedAt`);

CREATE INDEX `IX_AuditLogs_EntityName_EntityId` ON `AuditLogs` (`EntityName`, `EntityId`);

CREATE UNIQUE INDEX `IX_BreakTypes_Name` ON `BreakTypes` (`Name`);

CREATE UNIQUE INDEX `IX_Certificates_CertificateNumber` ON `Certificates` (`CertificateNumber`);

CREATE INDEX `IX_Certificates_Status` ON `Certificates` (`Status`);

CREATE INDEX `IX_Certificates_StudentId` ON `Certificates` (`StudentId`);

CREATE INDEX `IX_Examinations_AcademicLevelId` ON `Examinations` (`AcademicLevelId`);

CREATE INDEX `IX_Examinations_AcademicYearId` ON `Examinations` (`AcademicYearId`);

CREATE INDEX `IX_Examinations_AssessmentTypeId` ON `Examinations` (`AssessmentTypeId`);

CREATE INDEX `IX_Examinations_BoardId` ON `Examinations` (`BoardId`);

CREATE INDEX `IX_Examinations_GroupId` ON `Examinations` (`GroupId`);

CREATE INDEX `IX_ExamSchedules_ExaminationId` ON `ExamSchedules` (`ExaminationId`);

CREATE INDEX `IX_ExamSchedules_SubjectId` ON `ExamSchedules` (`SubjectId`);

CREATE UNIQUE INDEX `IX_FeeStructureItems_FeeStructureId_FeeTypeId` ON `FeeStructureItems` (`FeeStructureId`, `FeeTypeId`);

CREATE INDEX `IX_FeeStructureItems_FeeTypeId` ON `FeeStructureItems` (`FeeTypeId`);

CREATE INDEX `IX_FeeStructures_AcademicLevelId` ON `FeeStructures` (`AcademicLevelId`);

CREATE INDEX `IX_FeeStructures_AcademicYearId` ON `FeeStructures` (`AcademicYearId`);

CREATE UNIQUE INDEX `IX_FeeStructures_BoardId_AcademicYearId_AcademicLevelId_GroupId` ON `FeeStructures` (`BoardId`, `AcademicYearId`, `AcademicLevelId`, `GroupId`);

CREATE INDEX `IX_FeeStructures_GroupId` ON `FeeStructures` (`GroupId`);

CREATE UNIQUE INDEX `IX_FeeTypes_FeeTypeCode` ON `FeeTypes` (`FeeTypeCode`);

CREATE UNIQUE INDEX `IX_FeeTypes_FeeTypeName` ON `FeeTypes` (`FeeTypeName`);

CREATE INDEX `IX_HallTickets_ExaminationId` ON `HallTickets` (`ExaminationId`);

CREATE INDEX `IX_HallTickets_StudentId` ON `HallTickets` (`StudentId`);

CREATE INDEX `IX_InvigilatorAssignments_ExamScheduleId` ON `InvigilatorAssignments` (`ExamScheduleId`);

CREATE INDEX `IX_InvigilatorAssignments_InvigilatorId` ON `InvigilatorAssignments` (`InvigilatorId`);

CREATE INDEX `IX_Marks_AcademicLevelId` ON `Marks` (`AcademicLevelId`);

CREATE INDEX `IX_Marks_AcademicYearId` ON `Marks` (`AcademicYearId`);

CREATE INDEX `IX_Marks_BoardId` ON `Marks` (`BoardId`);

CREATE INDEX `IX_Marks_ExaminationId` ON `Marks` (`ExaminationId`);

CREATE INDEX `IX_Marks_FacultyId` ON `Marks` (`FacultyId`);

CREATE INDEX `IX_Marks_GroupId` ON `Marks` (`GroupId`);

CREATE INDEX `IX_Marks_SectionId` ON `Marks` (`SectionId`);

CREATE INDEX `IX_Marks_StudentId` ON `Marks` (`StudentId`);

CREATE INDEX `IX_Marks_SubjectId` ON `Marks` (`SubjectId`);

CREATE INDEX `IX_Periods_PeriodStructureId` ON `Periods` (`PeriodStructureId`);

CREATE INDEX `IX_PeriodStructureAssignments_AcademicLevelId` ON `PeriodStructureAssignments` (`AcademicLevelId`);

CREATE INDEX `IX_PeriodStructureAssignments_AcademicYearId` ON `PeriodStructureAssignments` (`AcademicYearId`);

CREATE INDEX `IX_PeriodStructureAssignments_BoardId` ON `PeriodStructureAssignments` (`BoardId`);

CREATE INDEX `IX_PeriodStructureAssignments_GroupId` ON `PeriodStructureAssignments` (`GroupId`);

CREATE INDEX `IX_PeriodStructureAssignments_PeriodStructureId` ON `PeriodStructureAssignments` (`PeriodStructureId`);

CREATE INDEX `IX_PeriodStructureItems_BreakTypeId` ON `PeriodStructureItems` (`BreakTypeId`);

CREATE INDEX `IX_PeriodStructureItems_PeriodStructureId` ON `PeriodStructureItems` (`PeriodStructureId`);

CREATE INDEX `IX_Results_AcademicLevelId` ON `Results` (`AcademicLevelId`);

CREATE INDEX `IX_Results_AcademicYearId` ON `Results` (`AcademicYearId`);

CREATE INDEX `IX_Results_BoardId` ON `Results` (`BoardId`);

CREATE INDEX `IX_Results_ExamId` ON `Results` (`ExamId`);

CREATE INDEX `IX_Results_GroupId` ON `Results` (`GroupId`);

CREATE INDEX `IX_Results_StudentId` ON `Results` (`StudentId`);

CREATE INDEX `IX_Results_SubjectId` ON `Results` (`SubjectId`);

CREATE INDEX `IX_Revaluations_ResultId` ON `Revaluations` (`ResultId`);

CREATE INDEX `IX_Revaluations_StudentId` ON `Revaluations` (`StudentId`);

CREATE INDEX `IX_StudentAdmissions_AcademicLevelId` ON `StudentAdmissions` (`AcademicLevelId`);

CREATE INDEX `IX_StudentAdmissions_AcademicYearId` ON `StudentAdmissions` (`AcademicYearId`);

CREATE INDEX `IX_StudentAdmissions_BoardId` ON `StudentAdmissions` (`BoardId`);

CREATE INDEX `IX_StudentAdmissions_GroupId` ON `StudentAdmissions` (`GroupId`);

CREATE INDEX `IX_StudentAdmissions_SectionId` ON `StudentAdmissions` (`SectionId`);

CREATE INDEX `IX_Timetables_AcademicLevelId` ON `Timetables` (`AcademicLevelId`);

CREATE INDEX `IX_Timetables_AcademicYearId` ON `Timetables` (`AcademicYearId`);

CREATE INDEX `IX_Timetables_BoardId` ON `Timetables` (`BoardId`);

CREATE INDEX `IX_Timetables_FacultyId` ON `Timetables` (`FacultyId`);

CREATE INDEX `IX_Timetables_GroupId` ON `Timetables` (`GroupId`);

CREATE INDEX `IX_Timetables_PeriodId` ON `Timetables` (`PeriodId`);

CREATE INDEX `IX_Timetables_RoomId` ON `Timetables` (`RoomId`);

CREATE INDEX `IX_Timetables_SectionId` ON `Timetables` (`SectionId`);

CREATE INDEX `IX_Timetables_SubjectId` ON `Timetables` (`SubjectId`);

ALTER TABLE `attendances` ADD CONSTRAINT `FK_attendances_Students_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `Students` (`StudentId`) ON DELETE RESTRICT;

ALTER TABLE `attendances` ADD CONSTRAINT `FK_attendances_attendance_sessions_AttendanceSessionId` FOREIGN KEY (`AttendanceSessionId`) REFERENCES `attendance_sessions` (`AttendanceSessionId`) ON DELETE CASCADE;

ALTER TABLE `FacultySubjectAllocations` ADD CONSTRAINT `FK_FacultySubjectAllocations_Faculties_FacultyId` FOREIGN KEY (`FacultyId`) REFERENCES `Faculties` (`Id`) ON DELETE CASCADE;

ALTER TABLE `FacultySubjectAllocations` ADD CONSTRAINT `FK_FacultySubjectAllocations_Subjects_SubjectId` FOREIGN KEY (`SubjectId`) REFERENCES `Subjects` (`SubjectId`) ON DELETE CASCADE;

ALTER TABLE `Groups` ADD CONSTRAINT `FK_Groups_AcademicLevels_AcademicLevelId` FOREIGN KEY (`AcademicLevelId`) REFERENCES `AcademicLevels` (`AcademicLevelId`) ON DELETE RESTRICT;

ALTER TABLE `Groups` ADD CONSTRAINT `FK_Groups_AcademicYears_AcademicYearId` FOREIGN KEY (`AcademicYearId`) REFERENCES `AcademicYears` (`AcademicYearId`) ON DELETE RESTRICT;

ALTER TABLE `Groups` ADD CONSTRAINT `FK_Groups_Boards_BoardId` FOREIGN KEY (`BoardId`) REFERENCES `Boards` (`BoardId`) ON DELETE RESTRICT;

ALTER TABLE `Sections` ADD CONSTRAINT `FK_Sections_Rooms_RoomId` FOREIGN KEY (`RoomId`) REFERENCES `Rooms` (`RoomId`);

ALTER TABLE `Students` ADD CONSTRAINT `FK_Students_AcademicLevels_AcademicLevelId` FOREIGN KEY (`AcademicLevelId`) REFERENCES `AcademicLevels` (`AcademicLevelId`) ON DELETE CASCADE;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260818122634_AddPeriodStructureAndBreakTypes', '8.0.13');

DROP PROCEDURE `POMELO_BEFORE_DROP_PRIMARY_KEY`;

DROP PROCEDURE `POMELO_AFTER_ADD_PRIMARY_KEY`;

COMMIT;

START TRANSACTION;

CREATE TABLE `TimetableBackups` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `BoardId` int NOT NULL,
    `AcademicLevelId` int NOT NULL,
    `AcademicYearId` int NOT NULL,
    `GroupId` int NOT NULL,
    `SectionId` int NOT NULL,
    `ArchivedAt` datetime(6) NOT NULL,
    `ArchivedBy` varchar(100) CHARACTER SET utf8mb4 NULL,
    `ArchiveReason` varchar(250) CHARACTER SET utf8mb4 NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_TimetableBackups` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_TimetableBackups_AcademicLevels_AcademicLevelId` FOREIGN KEY (`AcademicLevelId`) REFERENCES `AcademicLevels` (`AcademicLevelId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackups_AcademicYears_AcademicYearId` FOREIGN KEY (`AcademicYearId`) REFERENCES `AcademicYears` (`AcademicYearId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackups_Boards_BoardId` FOREIGN KEY (`BoardId`) REFERENCES `Boards` (`BoardId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackups_Groups_GroupId` FOREIGN KEY (`GroupId`) REFERENCES `Groups` (`GroupId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackups_Sections_SectionId` FOREIGN KEY (`SectionId`) REFERENCES `Sections` (`SectionId`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE TABLE `TimetableBackupSlots` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `TimetableBackupId` int NOT NULL,
    `OriginalTimetableId` int NULL,
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
    `IsPublished` tinyint(1) NOT NULL,
    `ApprovalStatus` int NOT NULL,
    `Remarks` varchar(250) CHARACTER SET utf8mb4 NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_TimetableBackupSlots` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_TimetableBackupSlots_AcademicLevels_AcademicLevelId` FOREIGN KEY (`AcademicLevelId`) REFERENCES `AcademicLevels` (`AcademicLevelId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackupSlots_AcademicYears_AcademicYearId` FOREIGN KEY (`AcademicYearId`) REFERENCES `AcademicYears` (`AcademicYearId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackupSlots_Boards_BoardId` FOREIGN KEY (`BoardId`) REFERENCES `Boards` (`BoardId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackupSlots_Faculties_FacultyId` FOREIGN KEY (`FacultyId`) REFERENCES `Faculties` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackupSlots_Groups_GroupId` FOREIGN KEY (`GroupId`) REFERENCES `Groups` (`GroupId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackupSlots_Periods_PeriodId` FOREIGN KEY (`PeriodId`) REFERENCES `Periods` (`PeriodId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackupSlots_Rooms_RoomId` FOREIGN KEY (`RoomId`) REFERENCES `Rooms` (`RoomId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackupSlots_Sections_SectionId` FOREIGN KEY (`SectionId`) REFERENCES `Sections` (`SectionId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackupSlots_Subjects_SubjectId` FOREIGN KEY (`SubjectId`) REFERENCES `Subjects` (`SubjectId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackupSlots_TimetableBackups_TimetableBackupId` FOREIGN KEY (`TimetableBackupId`) REFERENCES `TimetableBackups` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE INDEX `IX_TimetableBackups_AcademicLevelId` ON `TimetableBackups` (`AcademicLevelId`);

CREATE INDEX `IX_TimetableBackups_AcademicYearId` ON `TimetableBackups` (`AcademicYearId`);

CREATE UNIQUE INDEX `IX_TimetableBackups_BoardId_AcademicLevelId_AcademicYearId_Grou~` ON `TimetableBackups` (`BoardId`, `AcademicLevelId`, `AcademicYearId`, `GroupId`, `SectionId`);

CREATE INDEX `IX_TimetableBackups_GroupId` ON `TimetableBackups` (`GroupId`);

CREATE INDEX `IX_TimetableBackups_SectionId` ON `TimetableBackups` (`SectionId`);

CREATE INDEX `IX_TimetableBackupSlots_AcademicLevelId` ON `TimetableBackupSlots` (`AcademicLevelId`);

CREATE INDEX `IX_TimetableBackupSlots_AcademicYearId` ON `TimetableBackupSlots` (`AcademicYearId`);

CREATE INDEX `IX_TimetableBackupSlots_BoardId` ON `TimetableBackupSlots` (`BoardId`);

CREATE INDEX `IX_TimetableBackupSlots_FacultyId` ON `TimetableBackupSlots` (`FacultyId`);

CREATE INDEX `IX_TimetableBackupSlots_GroupId` ON `TimetableBackupSlots` (`GroupId`);

CREATE INDEX `IX_TimetableBackupSlots_PeriodId` ON `TimetableBackupSlots` (`PeriodId`);

CREATE INDEX `IX_TimetableBackupSlots_RoomId` ON `TimetableBackupSlots` (`RoomId`);

CREATE INDEX `IX_TimetableBackupSlots_SectionId` ON `TimetableBackupSlots` (`SectionId`);

CREATE INDEX `IX_TimetableBackupSlots_SubjectId` ON `TimetableBackupSlots` (`SubjectId`);

CREATE INDEX `IX_TimetableBackupSlots_TimetableBackupId` ON `TimetableBackupSlots` (`TimetableBackupId`);

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260819110259_AddTimetableBackupSnapshot', '8.0.13');

COMMIT;

START TRANSACTION;

ALTER TABLE `Faculties` ADD `DesignationId` int NULL;

CREATE TABLE `Designations` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Name` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Designations` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE INDEX `IX_Faculties_DesignationId` ON `Faculties` (`DesignationId`);

CREATE UNIQUE INDEX `IX_Designations_Name` ON `Designations` (`Name`);

ALTER TABLE `Faculties` ADD CONSTRAINT `FK_Faculties_Designations_DesignationId` FOREIGN KEY (`DesignationId`) REFERENCES `Designations` (`Id`) ON DELETE RESTRICT;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260819122458_AddDesignationMasterAndFacultyFilter', '8.0.13');

COMMIT;

START TRANSACTION;

ALTER TABLE `Subjects` DROP FOREIGN KEY `FK_Subjects_AcademicYears_AcademicYearId`;

ALTER TABLE `Subjects` DROP INDEX `IX_Subjects_AcademicYearId`;

ALTER TABLE `Subjects` DROP INDEX `IX_Subjects_SubjectCode`;

ALTER TABLE `Subjects` DROP COLUMN `AcademicLevel`;

ALTER TABLE `Subjects` DROP COLUMN `AcademicYearId`;

ALTER TABLE `Subjects` DROP COLUMN `Board`;

ALTER TABLE `Subjects` DROP COLUMN `Group`;

ALTER TABLE `AssignmentSubmissions` DROP COLUMN `StudentName`;

ALTER TABLE `Subjects` MODIFY COLUMN `GroupId` int NOT NULL DEFAULT 0;

ALTER TABLE `Subjects` MODIFY COLUMN `BoardId` int NOT NULL DEFAULT 0;

ALTER TABLE `Subjects` ADD `AcademicLevelId` int NOT NULL DEFAULT 0;

ALTER TABLE `Assignments` ADD `IsPublished` tinyint(1) NOT NULL DEFAULT FALSE;

ALTER TABLE `Assignments` ADD `PublishedAt` datetime(6) NULL;

CREATE INDEX `IX_Subjects_AcademicLevelId` ON `Subjects` (`AcademicLevelId`);

CREATE UNIQUE INDEX `UX_Subjects_Context_Code` ON `Subjects` (`BoardId`, `GroupId`, `AcademicLevelId`, `SubjectCode`);

ALTER TABLE `Subjects` ADD CONSTRAINT `FK_Subjects_AcademicLevels_AcademicLevelId` FOREIGN KEY (`AcademicLevelId`) REFERENCES `AcademicLevels` (`AcademicLevelId`) ON DELETE RESTRICT;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260820101130_RefactorSubjectManagementContext', '8.0.13');

COMMIT;

START TRANSACTION;

ALTER TABLE `Subjects` DROP FOREIGN KEY `FK_Subjects_AcademicLevels_AcademicLevelId`;

ALTER TABLE `Subjects` DROP INDEX `IX_Subjects_AcademicLevelId`;

ALTER TABLE `Subjects` DROP INDEX `UX_Subjects_Context_Code`;

ALTER TABLE `Subjects` DROP COLUMN `AcademicLevelId`;

ALTER TABLE `Sections` RENAME COLUMN `ClassTeacherId` TO `InchargeId`;

ALTER TABLE `Rooms` RENAME COLUMN `BuildingName` TO `RoomName`;

ALTER TABLE `Subjects` ADD `AcademicLevelNavigationAcademicLevelId` int NULL;

ALTER TABLE `Sections` ADD `Programme` varchar(100) CHARACTER SET utf8mb4 NOT NULL DEFAULT '';

ALTER TABLE `Rooms` MODIFY COLUMN `Floor` varchar(50) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Rooms` ADD `BlockName` varchar(100) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `Rooms` ADD `RoomCode` varchar(50) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `AcademicYears` MODIFY COLUMN `AdmissionStartDate` date NULL;

ALTER TABLE `AcademicYears` MODIFY COLUMN `AdmissionEndDate` date NULL;

ALTER TABLE `AcademicYears` ADD `Description` varchar(500) CHARACTER SET utf8mb4 NULL;

CREATE TABLE `Programs` (
    `ProgramId` int NOT NULL AUTO_INCREMENT,
    `ProgramName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT TRUE,
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_Programs` PRIMARY KEY (`ProgramId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `GroupPrograms` (
    `GroupProgramId` int NOT NULL AUTO_INCREMENT,
    `GroupId` int NOT NULL,
    `ProgramId` int NOT NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_GroupPrograms` PRIMARY KEY (`GroupProgramId`),
    CONSTRAINT `FK_GroupPrograms_Groups_GroupId` FOREIGN KEY (`GroupId`) REFERENCES `Groups` (`GroupId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_GroupPrograms_Programs_ProgramId` FOREIGN KEY (`ProgramId`) REFERENCES `Programs` (`ProgramId`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE INDEX `IX_Subjects_AcademicLevelNavigationAcademicLevelId` ON `Subjects` (`AcademicLevelNavigationAcademicLevelId`);

CREATE UNIQUE INDEX `IX_Subjects_SubjectCode` ON `Subjects` (`SubjectCode`);

CREATE UNIQUE INDEX `IX_GroupPrograms_GroupId_ProgramId` ON `GroupPrograms` (`GroupId`, `ProgramId`);

CREATE INDEX `IX_GroupPrograms_ProgramId` ON `GroupPrograms` (`ProgramId`);

CREATE UNIQUE INDEX `IX_Programs_ProgramName` ON `Programs` (`ProgramName`);

ALTER TABLE `Subjects` ADD CONSTRAINT `FK_Subjects_AcademicLevels_AcademicLevelNavigationAcademicLevel~` FOREIGN KEY (`AcademicLevelNavigationAcademicLevelId`) REFERENCES `AcademicLevels` (`AcademicLevelId`);

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260824092709_Phase8_StudentManagementRefactor', '8.0.13');

COMMIT;

START TRANSACTION;

ALTER TABLE `Attendances` ADD `Session` tinyint unsigned NULL;

ALTER TABLE `Attendances` ADD `ModifiedByUserId` int NULL;

ALTER TABLE `Attendances` ADD `ModifiedAt` datetime(6) NULL;

CREATE TABLE `StaffLeaveRequests` (
    `StaffLeaveRequestId` int NOT NULL AUTO_INCREMENT,
    `FacultyId` int NOT NULL,
    `LeaveType` tinyint unsigned NOT NULL,
    `StartDate` date NOT NULL,
    `EndDate` date NOT NULL,
    `Reason` varchar(1000) CHARACTER SET utf8mb4 NULL,
    `Status` tinyint unsigned NOT NULL,
    `DepartmentId` int NULL,
    `AcademicYearId` int NULL,
    `ApprovedByUserId` int NULL,
    `ApprovedAt` datetime(6) NULL,
    `RejectionReason` varchar(500) CHARACTER SET utf8mb4 NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT TRUE,
    `CreatedByUserId` int NULL,
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_StaffLeaveRequests` PRIMARY KEY (`StaffLeaveRequestId`),
    CONSTRAINT `FK_StaffLeaveRequests_AcademicYears_AcademicYearId` FOREIGN KEY (`AcademicYearId`) REFERENCES `AcademicYears` (`AcademicYearId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_StaffLeaveRequests_Departments_DepartmentId` FOREIGN KEY (`DepartmentId`) REFERENCES `Departments` (`DepartmentId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_StaffLeaveRequests_Staff_FacultyId` FOREIGN KEY (`FacultyId`) REFERENCES `Staff` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_StaffLeaveRequests_Users_ApprovedByUserId` FOREIGN KEY (`ApprovedByUserId`) REFERENCES `Users` (`UserId`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE TABLE `AttendanceAuditHistory` (
    `AuditId` bigint NOT NULL AUTO_INCREMENT,
    `EntityType` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `EntityId` int NOT NULL,
    `StudentId` int NULL,
    `FacultyId` int NULL,
    `AttendanceDate` datetime(6) NOT NULL,
    `OldStatus` tinyint unsigned NULL,
    `NewStatus` tinyint unsigned NOT NULL,
    `Action` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `Description` varchar(1000) CHARACTER SET utf8mb4 NULL,
    `ModifiedByUserId` int NULL,
    `ModifiedByUserName` varchar(150) CHARACTER SET utf8mb4 NULL,
    `IpAddress` varchar(45) CHARACTER SET utf8mb4 NULL,
    `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `PK_AttendanceAuditHistory` PRIMARY KEY (`AuditId`),
    CONSTRAINT `FK_AttendanceAuditHistory_Users_ModifiedByUserId` FOREIGN KEY (`ModifiedByUserId`) REFERENCES `Users` (`UserId`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE INDEX `IX_AttendanceAuditHistory_AttendanceDate` ON `AttendanceAuditHistory` (`AttendanceDate`);

CREATE INDEX `IX_AttendanceAuditHistory_EntityType_EntityId` ON `AttendanceAuditHistory` (`EntityType`, `EntityId`);

CREATE INDEX `IX_AttendanceAuditHistory_FacultyId` ON `AttendanceAuditHistory` (`FacultyId`);

CREATE INDEX `IX_AttendanceAuditHistory_ModifiedByUserId` ON `AttendanceAuditHistory` (`ModifiedByUserId`);

CREATE INDEX `IX_AttendanceAuditHistory_StudentId` ON `AttendanceAuditHistory` (`StudentId`);

CREATE INDEX `IX_StaffLeaveRequests_AcademicYearId` ON `StaffLeaveRequests` (`AcademicYearId`);

CREATE INDEX `IX_StaffLeaveRequests_DepartmentId` ON `StaffLeaveRequests` (`DepartmentId`);

CREATE INDEX `IX_StaffLeaveRequests_Faculty_DateRange` ON `StaffLeaveRequests` (`FacultyId`, `StartDate`, `EndDate`);

CREATE INDEX `IX_StaffLeaveRequests_FacultyId` ON `StaffLeaveRequests` (`FacultyId`);

CREATE INDEX `IX_StaffLeaveRequests_Status` ON `StaffLeaveRequests` (`Status`);

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260902043133_Phase2AttendanceCore', '8.0.13');

COMMIT;

