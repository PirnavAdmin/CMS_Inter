-- ====================================================================================================
-- Migration 020: Public Enquiries Management & Landing Page Contact Configuration
-- Safe, idempotent migration script for CollegeManagement (MySQL 8.0 / Aiven).
-- ====================================================================================================

-- 1. Create Enquiries Table
CREATE TABLE IF NOT EXISTS `Enquiries` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `CampusId` INT NULL,
    `FullName` VARCHAR(150) NOT NULL,
    `Email` VARCHAR(150) NOT NULL,
    `Mobile` VARCHAR(30) NOT NULL,
    `EnquiryType` VARCHAR(100) NOT NULL DEFAULT 'General Enquiry',
    `Subject` VARCHAR(255) NULL,
    `Message` TEXT NOT NULL,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'New', -- 'New', 'In Progress', 'Contacted', 'Resolved', 'Closed'
    `Priority` VARCHAR(30) NOT NULL DEFAULT 'Medium',
    `AssignedToStaffId` INT NULL,
    `AssignedToStaffName` VARCHAR(150) NULL,
    `HandledByStaffId` INT NULL,
    `HandledByStaffName` VARCHAR(150) NULL,
    `ResponseNotes` TEXT NULL,
    `ContactMethodUsed` VARCHAR(50) NULL, -- 'Phone', 'Email', 'In-Person', 'WhatsApp'
    `ContactedAt` DATETIME NULL,
    `ResolvedAt` DATETIME NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`Id`),
    KEY `IX_Enquiries_CampusId` (`CampusId`),
    KEY `IX_Enquiries_Status` (`Status`),
    KEY `IX_Enquiries_CreatedAt` (`CreatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create LandingContactConfig Table
CREATE TABLE IF NOT EXISTS `LandingContactConfig` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `CampusId` INT NULL UNIQUE,
    `CollegeName` VARCHAR(200) NOT NULL DEFAULT 'Pirnav College',
    `ContactAddress` VARCHAR(500) NOT NULL DEFAULT 'Vijayawada, Andhra Pradesh',
    `ContactEmail` VARCHAR(150) NOT NULL DEFAULT 'support@pirnavcollege.com',
    `ContactPhone` VARCHAR(50) NOT NULL DEFAULT '+91 9398649798',
    `OfficeHours` VARCHAR(200) NOT NULL DEFAULT 'Monday – Saturday: 9:00 AM – 5:00 PM',
    `SupportHelpline` VARCHAR(50) NULL DEFAULT '+91 9398649798',
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `UpdatedByUserId` INT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_LandingContactConfig_CampusId` (`CampusId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Default Landing Config if empty
INSERT INTO `LandingContactConfig` (`CampusId`, `CollegeName`, `ContactAddress`, `ContactEmail`, `ContactPhone`, `OfficeHours`, `SupportHelpline`)
SELECT NULL, 'Pirnav College', 'Vijayawada, Andhra Pradesh', 'support@pirnavcollege.com', '+91 9398649798', 'Monday – Saturday: 9:00 AM – 5:00 PM', '+91 9398649798'
WHERE NOT EXISTS (SELECT 1 FROM `LandingContactConfig` WHERE `CampusId` IS NULL);
