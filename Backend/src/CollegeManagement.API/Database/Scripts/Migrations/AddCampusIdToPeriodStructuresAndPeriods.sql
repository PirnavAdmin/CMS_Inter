-- =============================================================================
-- MIGRATION SCRIPT: ADD CampusId TO PeriodStructures, Periods & Assignments
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

-- -----------------------------------------------------------------------------
-- 1. PeriodStructures Table Migration
-- -----------------------------------------------------------------------------
ALTER TABLE `PeriodStructures` 
ADD COLUMN `CampusId` INT(11) NULL AFTER `Id`;

ALTER TABLE `PeriodStructures` 
ADD INDEX `IX_PeriodStructures_CampusId` (`CampusId`);

ALTER TABLE `PeriodStructures` 
ADD CONSTRAINT `FK_PeriodStructures_Campuses` 
FOREIGN KEY (`CampusId`) REFERENCES `Campuses` (`CampusId`) ON DELETE SET NULL;

-- Backfill existing records to default Campus 1
UPDATE `PeriodStructures` 
SET `CampusId` = 1 
WHERE `CampusId` IS NULL;


-- -----------------------------------------------------------------------------
-- 2. Periods Table Migration
-- -----------------------------------------------------------------------------
ALTER TABLE `Periods` 
ADD COLUMN `CampusId` INT(11) NULL AFTER `PeriodId`;

ALTER TABLE `Periods` 
ADD INDEX `IX_Periods_CampusId` (`CampusId`);

ALTER TABLE `Periods` 
ADD CONSTRAINT `FK_Periods_Campuses` 
FOREIGN KEY (`CampusId`) REFERENCES `Campuses` (`CampusId`) ON DELETE SET NULL;

-- Backfill existing records from parent PeriodStructure or default 1
UPDATE `Periods` p
LEFT JOIN `PeriodStructures` ps ON p.PeriodStructureId = ps.Id
SET p.CampusId = COALESCE(ps.CampusId, 1)
WHERE p.CampusId IS NULL;


-- -----------------------------------------------------------------------------
-- 3. PeriodStructureAssignments Table Migration
-- -----------------------------------------------------------------------------
ALTER TABLE `PeriodStructureAssignments` 
ADD COLUMN `CampusId` INT(11) NULL AFTER `Id`;

ALTER TABLE `PeriodStructureAssignments` 
ADD INDEX `IX_PeriodStructureAssignments_CampusId` (`CampusId`);

ALTER TABLE `PeriodStructureAssignments` 
ADD CONSTRAINT `FK_PeriodStructureAssignments_Campuses` 
FOREIGN KEY (`CampusId`) REFERENCES `Campuses` (`CampusId`) ON DELETE SET NULL;

-- Backfill existing assignments from parent PeriodStructure or default 1
UPDATE `PeriodStructureAssignments` psa
LEFT JOIN `PeriodStructures` ps ON psa.PeriodStructureId = ps.Id
SET psa.CampusId = COALESCE(ps.CampusId, 1)
WHERE psa.CampusId IS NULL;
