-- Promotion Module - Full contract database objects
-- MySQL 8.0+
-- The application repository executes the promotion operations directly.
-- This script provisions the required promotion history columns and final-year clearance table.

CREATE TABLE IF NOT EXISTS PromotionHistories
(
    PromotionHistoryId INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    PromotionBatchId VARCHAR(50) NULL,
    StudentId INT NOT NULL,
    FromAcademicYearId INT NOT NULL,
    ToAcademicYearId INT NOT NULL,
    FromBoardId INT NULL,
    ToBoardId INT NULL,
    FromAcademicLevel VARCHAR(50) NOT NULL,
    ToAcademicLevel VARCHAR(50) NOT NULL,
    FromGroupId INT NOT NULL,
    ToGroupId INT NOT NULL,
    FromSection VARCHAR(50) NOT NULL,
    ToSection VARCHAR(50) NOT NULL,
    FromMedium VARCHAR(50) NULL,
    ToMedium VARCHAR(50) NULL,
    PromotionDate DATETIME NOT NULL,
    Status VARCHAR(30) NOT NULL DEFAULT 'Promoted',
    IsRolledBack TINYINT(1) NOT NULL DEFAULT 0,
    RolledBackAt DATETIME NULL,
    Remarks VARCHAR(500) NULL,
    RollbackRemarks VARCHAR(500) NULL,
    PromotedBy VARCHAR(150) NULL,
    CreatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY IX_PromotionHistories_StudentId (StudentId),
    KEY IX_PromotionHistories_BatchId (PromotionBatchId),
    KEY IX_PromotionHistories_FromAcademicYearId (FromAcademicYearId),
    KEY IX_PromotionHistories_ToAcademicYearId (ToAcademicYearId),
    KEY IX_PromotionHistories_Status (Status),
    KEY IX_PromotionHistories_IsRolledBack (IsRolledBack)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='PromotionHistories' AND COLUMN_NAME='PromotionBatchId')=0,
'ALTER TABLE PromotionHistories ADD COLUMN PromotionBatchId VARCHAR(50) NULL AFTER PromotionHistoryId','SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='PromotionHistories' AND COLUMN_NAME='FromBoardId')=0,
'ALTER TABLE PromotionHistories ADD COLUMN FromBoardId INT NULL AFTER ToAcademicYearId','SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='PromotionHistories' AND COLUMN_NAME='ToBoardId')=0,
'ALTER TABLE PromotionHistories ADD COLUMN ToBoardId INT NULL AFTER FromBoardId','SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='PromotionHistories' AND COLUMN_NAME='PromotedBy')=0,
'ALTER TABLE PromotionHistories ADD COLUMN PromotedBy VARCHAR(150) NULL AFTER RollbackRemarks','SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

CREATE TABLE IF NOT EXISTS StudentDisciplinaryClearances
(
    StudentDisciplinaryClearanceId INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    StudentId INT NOT NULL,
    IsCleared TINYINT(1) NOT NULL DEFAULT 0,
    ClearedBy VARCHAR(150) NULL,
    ClearedAt DATETIME NULL,
    Remarks VARCHAR(500) NULL,
    CreatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UpdatedAt DATETIME(6) NULL,
    UNIQUE KEY UX_StudentDisciplinaryClearance_StudentId(StudentId),
    KEY IX_StudentDisciplinaryClearance_IsCleared(IsCleared)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- NOTE: No Results/Attendance/Backlog rule is applied for normal 1st Year -> 2nd Year progression.
-- For a 2nd Year source student, final eligibility is: fee cleared + disciplinary cleared + all published results pass.
