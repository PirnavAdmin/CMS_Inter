USE `u819242402_CLM_System`;

-- Departments
ALTER TABLE `Departments` ADD COLUMN `CampusId` INT NULL;
ALTER TABLE `Departments` ADD CONSTRAINT `FK_Departments_Campuses` FOREIGN KEY (`CampusId`) REFERENCES `Campuses` (`CampusId`) ON DELETE SET NULL;

-- Designations
ALTER TABLE `Designations` ADD COLUMN `CampusId` INT NULL;
ALTER TABLE `Designations` ADD CONSTRAINT `FK_Designations_Campuses` FOREIGN KEY (`CampusId`) REFERENCES `Campuses` (`CampusId`) ON DELETE SET NULL;

-- NumberSeries
ALTER TABLE `NumberSeries` ADD COLUMN `CampusId` INT NULL;
ALTER TABLE `NumberSeries` ADD CONSTRAINT `FK_NumberSeries_Campuses` FOREIGN KEY (`CampusId`) REFERENCES `Campuses` (`CampusId`) ON DELETE SET NULL;

-- templates
ALTER TABLE `templates` ADD COLUMN `CampusId` INT NULL;
ALTER TABLE `templates` ADD CONSTRAINT `FK_templates_Campuses` FOREIGN KEY (`CampusId`) REFERENCES `Campuses` (`CampusId`) ON DELETE SET NULL;
