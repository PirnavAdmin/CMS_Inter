-- ====================================================================================
-- Examination Module Schema Update Script (Safe / Non-Destructive)
-- Target Database: CollegeManagement (MySQL 8.0+)
-- Date: 2026-09-14
-- Description: 
--   1. Modifies ExamSchedules to make SubjectId nullable (for Objective/Pattern exams).
--   2. Adds PatternName, ScheduleMode, GroupId, and PassPercentage columns to ExamSchedules.
--   3. Creates ExaminationScheduleHalls (multi-hall room allocations per schedule slot).
--   4. Creates ScheduleInvigilators (multi-invigilator faculty per room).
-- ====================================================================================

SET @dbname = DATABASE();

-- 1. Modify ExamSchedules.SubjectId to allow NULL (Essential for Objective/Pattern exams like JEE Main, NEET)
ALTER TABLE `ExamSchedules` 
    MODIFY COLUMN `SubjectId` INT NULL;

-- 2. Add PatternName column if missing
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'ExamSchedules'
      AND COLUMN_NAME = 'PatternName'
  ) > 0,
  'SELECT 1 /* PatternName already exists */',
  'ALTER TABLE `ExamSchedules` ADD COLUMN `PatternName` VARCHAR(100) NULL AFTER `SubjectId`;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Add ScheduleMode column if missing
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'ExamSchedules'
      AND COLUMN_NAME = 'ScheduleMode'
  ) > 0,
  'SELECT 1 /* ScheduleMode already exists */',
  'ALTER TABLE `ExamSchedules` ADD COLUMN `ScheduleMode` VARCHAR(30) NOT NULL DEFAULT \'SUBJECT_WISE\' AFTER `PatternName`;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Add GroupId column if missing
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'ExamSchedules'
      AND COLUMN_NAME = 'GroupId'
  ) > 0,
  'SELECT 1 /* GroupId already exists */',
  'ALTER TABLE `ExamSchedules` ADD COLUMN `GroupId` INT NULL AFTER `ExamId`;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Add PassPercentage column if missing
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'ExamSchedules'
      AND COLUMN_NAME = 'PassPercentage'
  ) > 0,
  'SELECT 1 /* PassPercentage already exists */',
  'ALTER TABLE `ExamSchedules` ADD COLUMN `PassPercentage` DECIMAL(5,2) NOT NULL DEFAULT 35.00 AFTER `PassingMarks`;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. Create ExaminationScheduleHalls table
CREATE TABLE IF NOT EXISTS `ExaminationScheduleHalls` (
    `ScheduleHallId` INT NOT NULL AUTO_INCREMENT,
    `ScheduleId` INT NOT NULL,
    `HallId` INT NOT NULL,
    `CandidateCount` INT NOT NULL DEFAULT 0,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT `PK_ExaminationScheduleHalls` PRIMARY KEY (`ScheduleHallId`),
    CONSTRAINT `FK_ExaminationScheduleHalls_ExamSchedules` FOREIGN KEY (`ScheduleId`) REFERENCES `ExamSchedules` (`ScheduleId`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

-- 7. Create ScheduleInvigilators table
CREATE TABLE IF NOT EXISTS `ScheduleInvigilators` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `ScheduleHallId` INT NOT NULL,
    `FacultyId` INT NOT NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT `PK_ScheduleInvigilators` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_ScheduleInvigilators_Halls` FOREIGN KEY (`ScheduleHallId`) REFERENCES `ExaminationScheduleHalls` (`ScheduleHallId`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;
