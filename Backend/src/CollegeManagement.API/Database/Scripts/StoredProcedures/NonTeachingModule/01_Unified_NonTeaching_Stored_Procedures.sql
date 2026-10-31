-- ============================================================================
-- CMS_INTER: UNIFIED STORED PROCEDURES & TABLES FOR NON-TEACHING STAFF MODULE
-- Module: Non-Teaching Staff (Tasks, Support Tickets, Department Registers, Profile)
-- Compliant with 100% Stored Procedure & Dapper Architecture
-- ============================================================================

-- 1. Table: StaffTasks
CREATE TABLE IF NOT EXISTS `StaffTasks` (
    `TaskId` INT AUTO_INCREMENT PRIMARY KEY,
    `StaffId` INT NOT NULL,
    `CampusId` INT NULL DEFAULT 1,
    `Title` VARCHAR(255) NOT NULL,
    `Description` TEXT NULL,
    `Category` VARCHAR(100) NOT NULL DEFAULT 'Office Administration',
    `Priority` VARCHAR(50) NOT NULL DEFAULT 'Medium',
    `DueDate` DATE NULL,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `AssignedBy` VARCHAR(255) NULL DEFAULT 'Self / Personal Reminder',
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `IX_StaffTasks_Staff_Status` (`StaffId`, `Status`),
    INDEX `IX_StaffTasks_CampusId` (`CampusId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: StaffSupportTickets
CREATE TABLE IF NOT EXISTS `StaffSupportTickets` (
    `TicketId` INT AUTO_INCREMENT PRIMARY KEY,
    `StaffId` INT NOT NULL,
    `CampusId` INT NULL DEFAULT 1,
    `Category` VARCHAR(100) NOT NULL,
    `Subject` VARCHAR(255) NOT NULL,
    `Description` TEXT NOT NULL,
    `Priority` VARCHAR(50) NOT NULL DEFAULT 'Medium',
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Open',
    `Response` TEXT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `IX_StaffSupportTickets_Staff_Status` (`StaffId`, `Status`),
    INDEX `IX_StaffSupportTickets_CampusId` (`CampusId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: DepartmentRegisters
CREATE TABLE IF NOT EXISTS `DepartmentRegisters` (
    `RegisterId` INT AUTO_INCREMENT PRIMARY KEY,
    `CampusId` INT NULL DEFAULT 1,
    `DepartmentCode` VARCHAR(50) NOT NULL,
    `ReferenceCode` VARCHAR(50) NOT NULL,
    `Title` VARCHAR(255) NOT NULL,
    `Party` VARCHAR(255) NULL,
    `LogTime` VARCHAR(50) NULL,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Completed',
    `CreatedByUserId` INT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `IX_DepartmentRegisters_Dept_Campus` (`DepartmentCode`, `CampusId`),
    INDEX `IX_DepartmentRegisters_CreatedAt` (`CreatedAt` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- PROCEDURE 1: sp_GetDepartmentRecords
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetDepartmentRecords`;
DELIMITER //
CREATE PROCEDURE `sp_GetDepartmentRecords`(
    IN p_CampusId INT,
    IN p_DepartmentCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT 
        `RegisterId`,
        `ReferenceCode` AS `Id`,
        `Title`,
        `Party`,
        `LogTime` AS `Time`,
        `Status`,
        `CreatedAt`
    FROM `DepartmentRegisters`
    WHERE `DepartmentCode` = p_DepartmentCode COLLATE utf8mb4_unicode_ci
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR `CampusId` = p_CampusId OR `CampusId` IS NULL)
    ORDER BY `RegisterId` DESC
    LIMIT 100;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------
-- PROCEDURE 2: sp_CreateDepartmentRecord
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CreateDepartmentRecord`;
DELIMITER //
CREATE PROCEDURE `sp_CreateDepartmentRecord`(
    IN p_CampusId INT,
    IN p_DepartmentCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_ReferenceCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Title VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Party VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_LogTime VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CreatedByUserId INT
)
BEGIN
    INSERT INTO `DepartmentRegisters` (
        `CampusId`,
        `DepartmentCode`,
        `ReferenceCode`,
        `Title`,
        `Party`,
        `LogTime`,
        `Status`,
        `CreatedByUserId`,
        `CreatedAt`
    ) VALUES (
        p_CampusId,
        p_DepartmentCode,
        p_ReferenceCode,
        p_Title,
        p_Party,
        p_LogTime,
        p_Status,
        p_CreatedByUserId,
        NOW()
    );

    SELECT LAST_INSERT_ID() AS `RegisterId`;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------
-- PROCEDURE 3: sp_GetStaffTasks
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStaffTasks`;
DELIMITER //
CREATE PROCEDURE `sp_GetStaffTasks`(
    IN p_StaffId INT
)
BEGIN
    SELECT 
        `TaskId` AS `id`,
        `Title` AS `title`,
        `Description` AS `description`,
        `Category` AS `category`,
        `Priority` AS `priority`,
        DATE_FORMAT(`DueDate`, '%Y-%m-%d') AS `dueDate`,
        `Status` AS `status`,
        `AssignedBy` AS `assignedBy`,
        DATE_FORMAT(`CreatedAt`, '%Y-%m-%d') AS `assignedDate`
    FROM `StaffTasks`
    WHERE `StaffId` = p_StaffId
    ORDER BY `TaskId` DESC;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------
-- PROCEDURE 4: sp_CreateStaffTask
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CreateStaffTask`;
DELIMITER //
CREATE PROCEDURE `sp_CreateStaffTask`(
    IN p_StaffId INT,
    IN p_CampusId INT,
    IN p_Title VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Category VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Priority VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_DueDate DATE,
    IN p_AssignedBy VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    INSERT INTO `StaffTasks` (
        `StaffId`,
        `CampusId`,
        `Title`,
        `Description`,
        `Category`,
        `Priority`,
        `DueDate`,
        `Status`,
        `AssignedBy`,
        `CreatedAt`,
        `UpdatedAt`
    ) VALUES (
        p_StaffId,
        p_CampusId,
        p_Title,
        p_Description,
        IFNULL(p_Category, 'Office Administration'),
        IFNULL(p_Priority, 'Medium'),
        p_DueDate,
        'Pending',
        IFNULL(p_AssignedBy, 'Self / Personal Reminder'),
        NOW(),
        NOW()
    );

    SELECT 
        `TaskId` AS `id`,
        `Title` AS `title`,
        `Description` AS `description`,
        `Category` AS `category`,
        `Priority` AS `priority`,
        DATE_FORMAT(`DueDate`, '%Y-%m-%d') AS `dueDate`,
        `Status` AS `status`,
        `AssignedBy` AS `assignedBy`,
        DATE_FORMAT(`CreatedAt`, '%Y-%m-%d') AS `assignedDate`
    FROM `StaffTasks`
    WHERE `TaskId` = LAST_INSERT_ID();
END //
DELIMITER ;

-- ----------------------------------------------------------------------------
-- PROCEDURE 5: sp_UpdateStaffTaskStatus
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateStaffTaskStatus`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateStaffTaskStatus`(
    IN p_TaskId INT,
    IN p_StaffId INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    UPDATE `StaffTasks`
    SET `Status` = p_Status,
        `UpdatedAt` = NOW()
    WHERE `TaskId` = p_TaskId
      AND (p_StaffId <= 0 OR `StaffId` = p_StaffId);

    SELECT ROW_COUNT() AS `AffectedRows`;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------
-- PROCEDURE 6: sp_GetStaffSupportTickets
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStaffSupportTickets`;
DELIMITER //
CREATE PROCEDURE `sp_GetStaffSupportTickets`(
    IN p_StaffId INT
)
BEGIN
    SELECT 
        `TicketId` AS `id`,
        `Category` AS `category`,
        `Subject` AS `subject`,
        `Description` AS `description`,
        `Priority` AS `priority`,
        `Status` AS `status`,
        `Response` AS `response`,
        DATE_FORMAT(`CreatedAt`, '%Y-%m-%d') AS `createdAt`
    FROM `StaffSupportTickets`
    WHERE `StaffId` = p_StaffId
    ORDER BY `TicketId` DESC;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------
-- PROCEDURE 7: sp_CreateStaffSupportTicket
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CreateStaffSupportTicket`;
DELIMITER //
CREATE PROCEDURE `sp_CreateStaffSupportTicket`(
    IN p_StaffId INT,
    IN p_CampusId INT,
    IN p_Category VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Subject VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Priority VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    INSERT INTO `StaffSupportTickets` (
        `StaffId`,
        `CampusId`,
        `Category`,
        `Subject`,
        `Description`,
        `Priority`,
        `Status`,
        `CreatedAt`,
        `UpdatedAt`
    ) VALUES (
        p_StaffId,
        p_CampusId,
        p_Category,
        p_Subject,
        p_Description,
        IFNULL(p_Priority, 'Medium'),
        'Open',
        NOW(),
        NOW()
    );

    SELECT 
        `TicketId` AS `id`,
        `Category` AS `category`,
        `Subject` AS `subject`,
        `Description` AS `description`,
        `Priority` AS `priority`,
        `Status` AS `status`,
        `Response` AS `response`,
        DATE_FORMAT(`CreatedAt`, '%Y-%m-%d') AS `createdAt`
    FROM `StaffSupportTickets`
    WHERE `TicketId` = LAST_INSERT_ID();
END //
DELIMITER ;

-- ----------------------------------------------------------------------------
-- PROCEDURE 8: sp_UpdateStaffContact
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateStaffContact`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateStaffContact`(
    IN p_StaffId INT,
    IN p_Mobile VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_EmergencyContact VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Address VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    UPDATE `Staffs`
    SET `Mobile` = IF(p_Mobile IS NOT NULL AND p_Mobile != '', p_Mobile, `Mobile`),
        `AlternateMobile` = IF(p_EmergencyContact IS NOT NULL AND p_EmergencyContact != '', p_EmergencyContact, `AlternateMobile`),
        `CurrentAddress` = IF(p_Address IS NOT NULL AND p_Address != '', p_Address, `CurrentAddress`),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_StaffId
      AND `IsDeleted` = 0;

    SELECT ROW_COUNT() AS `AffectedRows`;
END //
DELIMITER ;
