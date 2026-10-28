-- =============================================================================
-- DATABASE SCHEMA SCRIPT: CREATE ALL MISSING TABLES IF NOT EXISTS
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

-- 1. Periods Table
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

-- 2. Rooms Table
CREATE TABLE IF NOT EXISTS `Rooms` (
    `RoomId` INT NOT NULL AUTO_INCREMENT,
    `RoomCode` VARCHAR(30) NOT NULL,
    `RoomName` VARCHAR(100) NOT NULL,
    `Capacity` INT NOT NULL DEFAULT 60,
    `RoomType` VARCHAR(50) NOT NULL DEFAULT 'Classroom',
    `Building` VARCHAR(100) NULL,
    `Floor` VARCHAR(50) NULL,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`RoomId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Timetables Table
CREATE TABLE IF NOT EXISTS `Timetables` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `BoardId` INT NOT NULL,
    `AcademicLevelId` INT NOT NULL,
    `AcademicYearId` INT NOT NULL,
    `GroupId` INT NOT NULL,
    `SectionId` INT NOT NULL,
    `DayOfWeek` INT NOT NULL,
    `PeriodId` INT NOT NULL,
    `SubjectId` INT NOT NULL,
    `FacultyId` INT NOT NULL,
    `RoomId` INT NOT NULL,
    `IsPublished` TINYINT(1) NOT NULL DEFAULT 0,
    `Remarks` VARCHAR(250) NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_Timetables_BoardId` (`BoardId`),
    KEY `IX_Timetables_AcademicYearId` (`AcademicYearId`),
    KEY `IX_Timetables_SectionId` (`SectionId`),
    KEY `IX_Timetables_PeriodId` (`PeriodId`),
    KEY `IX_Timetables_FacultyId` (`FacultyId`),
    KEY `IX_Timetables_RoomId` (`RoomId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
