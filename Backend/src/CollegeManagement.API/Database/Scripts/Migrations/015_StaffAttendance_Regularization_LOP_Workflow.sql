-- ====================================================================================================
-- Migration 015: Staff Attendance, Missed Checkout, LOP Policy & Regularization Workflow
-- Safe, idempotent migration script aligned with live CollegeManagement MySQL schema.
-- ====================================================================================================

-- 1. Extend StaffAttendances (preserve existing columns and data)
ALTER TABLE `StaffAttendances`
    ADD COLUMN IF NOT EXISTS `IsMissedCheckoutResolved` TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `UpdatedByUserId` INT NULL,
    ADD COLUMN IF NOT EXISTS `UpdatedByRole` VARCHAR(50) NULL;

-- 2. Extend StaffAttendanceRegularizations (mandatory request metadata & audit trail)
ALTER TABLE `StaffAttendanceRegularizations`
    ADD COLUMN IF NOT EXISTS `StaffAttendanceId` INT NULL,
    ADD COLUMN IF NOT EXISTS `RequestType` VARCHAR(50) NOT NULL DEFAULT 'Late Attendance',
    ADD COLUMN IF NOT EXISTS `OriginalAttendanceStatus` VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS `OriginalStatusCode` TINYINT NULL,
    ADD COLUMN IF NOT EXISTS `OriginalInTime` TIME(6) NULL,
    ADD COLUMN IF NOT EXISTS `OriginalOutTime` TIME(6) NULL,
    ADD COLUMN IF NOT EXISTS `ReviewedByAdminName` VARCHAR(150) NULL;

-- Indexes & Foreign Keys on StaffAttendanceRegularizations
CREATE INDEX IF NOT EXISTS `IX_StaffAttReg_StaffId_Date_Status` ON `StaffAttendanceRegularizations` (`StaffId`, `AttendanceDate`, `Status`);
CREATE INDEX IF NOT EXISTS `IX_StaffAttReg_StaffAttendanceId` ON `StaffAttendanceRegularizations` (`StaffAttendanceId`);
CREATE INDEX IF NOT EXISTS `IX_StaffAttReg_ReviewedByUserId` ON `StaffAttendanceRegularizations` (`ReviewedByUserId`);

ALTER TABLE `StaffAttendanceRegularizations`
    ADD CONSTRAINT `FK_StaffAttReg_Staff` FOREIGN KEY (`StaffId`) REFERENCES `Staff`(`Id`) ON DELETE CASCADE,
    ADD CONSTRAINT `FK_StaffAttReg_StaffAttendance` FOREIGN KEY (`StaffAttendanceId`) REFERENCES `StaffAttendances`(`StaffAttendanceId`) ON DELETE SET NULL,
    ADD CONSTRAINT `FK_StaffAttReg_ReviewedByUser` FOREIGN KEY (`ReviewedByUserId`) REFERENCES `Users`(`UserId`) ON DELETE SET NULL;

-- 3. Extend LopPolicies with Missed Checkout LOP rules
ALTER TABLE `LopPolicies`
    ADD COLUMN IF NOT EXISTS `MissedCheckoutLopEnabled` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS `AllowedMissedCheckouts` INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `MissedCheckoutsPerPenalty` INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS `MissedCheckoutPenaltyDays` DECIMAL(3,1) NOT NULL DEFAULT 0.5;
