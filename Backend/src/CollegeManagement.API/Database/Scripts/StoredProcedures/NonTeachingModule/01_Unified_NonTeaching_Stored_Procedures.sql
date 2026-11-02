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


-- ----------------------------------------------------------------------------
-- PROCEDURE 9: sp_GetStaffLeaveHistory
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStaffLeaveHistory`;
DELIMITER //
CREATE PROCEDURE `sp_GetStaffLeaveHistory`(
    IN p_StaffId INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_AcademicYearId INT DEFAULT 0;

    SELECT AcademicYearId INTO v_AcademicYearId
    FROM `AcademicYears`
    WHERE IsActive = 1
    ORDER BY AcademicYearId DESC
    LIMIT 1;

    -- Result Set 1: Staff Header & Balances
    SELECT 
        s.Id AS StaffId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(s.EmployeeId, CONCAT('NTS', LPAD(s.Id, 3, '0'))) AS StaffCode,
        COALESCE(d.DepartmentName, 'Administration') AS Department,
        CASE 
            WHEN LOWER(COALESCE(s.StaffType, '')) LIKE '%non%' THEN 'Non-Teaching Staff'
            ELSE 'Teaching Staff'
        END AS StaffType,
        COALESCE(req.TotalRequests, 0) AS TotalRequests,
        COALESCE(req.Approved, 0) AS Approved,
        COALESCE(req.Pending, 0) AS Pending,
        COALESCE(req.Rejected, 0) AS Rejected,
        COALESCE(bal.TotalLeaves, 0.00) AS TotalBalance,
        COALESCE(bal.Used, 0.00) AS UsedBalance,
        COALESCE(bal.Remaining, 0.00) AS RemainingBalance
    FROM `Staffs` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN (
        SELECT 
            StaffId,
            COUNT(1) AS TotalRequests,
            SUM(CASE WHEN Status = 2 THEN 1 ELSE 0 END) AS Approved,
            SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END) AS Pending,
            SUM(CASE WHEN Status = 3 THEN 1 ELSE 0 END) AS Rejected
        FROM `StaffLeaveRequests`
        WHERE StaffId = p_StaffId AND IsActive = 1
          AND (v_AcademicYearId = 0 OR AcademicYearId = v_AcademicYearId)
        GROUP BY StaffId
    ) req ON req.StaffId = s.Id
    LEFT JOIN (
        SELECT 
            StaffId,
            SUM(TotalDays) AS TotalLeaves,
            SUM(UsedDays) AS Used,
            SUM(RemainingDays) AS Remaining
        FROM `StaffLeaveBalances`
        WHERE StaffId = p_StaffId
          AND (v_AcademicYearId = 0 OR AcademicYearId = v_AcademicYearId)
        GROUP BY StaffId
    ) bal ON bal.StaffId = s.Id
    WHERE s.Id = p_StaffId
      AND s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
    LIMIT 1;

    -- Result Set 2: Historical Requests
    SELECT 
        slr.StaffLeaveRequestId,
        slr.StaffId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(d.DepartmentName, 'Administration') AS Department,
        CASE 
            WHEN LOWER(COALESCE(s.StaffType, '')) LIKE '%non%' THEN 'Non-Teaching Staff'
            ELSE 'Teaching Staff'
        END AS StaffType,
        slr.LeaveType,
        slr.LeaveCategoryId,
        COALESCE(lc.CategoryName, 
            CASE slr.LeaveType
                WHEN 1 THEN 'Casual Leave'
                WHEN 2 THEN 'Sick Leave'
                WHEN 3 THEN 'Earned Leave'
                WHEN 4 THEN 'Maternity Leave'
                ELSE 'Other'
            END
        ) AS LeaveCategoryName,
        slr.StartDate,
        slr.EndDate,
        CAST((DATEDIFF(slr.EndDate, slr.StartDate) + 1) AS DECIMAL(5,2)) AS TotalDays,
        slr.Reason,
        slr.Status,
        slr.RejectionReason,
        slr.ApprovedByUserId,
        u.FullName AS ApprovedByUserName,
        slr.ApprovedAt,
        slr.CreatedAt
    FROM `StaffLeaveRequests` slr
    INNER JOIN `Staffs` s ON slr.StaffId = s.Id
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId OR slr.DepartmentId = d.DepartmentId
    LEFT JOIN `LeaveCategories` lc ON slr.LeaveCategoryId = lc.LeaveCategoryId
    LEFT JOIN `Users` u ON slr.ApprovedByUserId = u.UserId
    WHERE slr.StaffId = p_StaffId
      AND slr.IsActive = 1
      AND (v_AcademicYearId = 0 OR slr.AcademicYearId = v_AcademicYearId)
    ORDER BY slr.CreatedAt DESC;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------
-- PROCEDURE 10: sp_GetStaffLeaveHistorySummary
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStaffLeaveHistorySummary`;
DELIMITER //
CREATE PROCEDURE `sp_GetStaffLeaveHistorySummary`(
    IN p_CampusId INT,
    IN p_DepartmentId INT,
    IN p_StaffType VARCHAR(50)
)
BEGIN
    DECLARE v_AcademicYearId INT DEFAULT 0;

    SELECT AcademicYearId INTO v_AcademicYearId
    FROM `AcademicYears`
    WHERE IsActive = 1
    ORDER BY AcademicYearId DESC
    LIMIT 1;

    SELECT 
        s.Id AS StaffId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(s.EmployeeId, CONCAT('NTS', LPAD(s.Id, 3, '0'))) AS StaffCode,
        COALESCE(d.DepartmentName, 'Administration') AS Department,
        CASE 
            WHEN LOWER(COALESCE(s.StaffType, '')) LIKE '%non%' THEN 'Non-Teaching Staff'
            ELSE 'Teaching Staff'
        END AS StaffType,
        COALESCE(req.TotalRequests, 0) AS TotalRequests,
        COALESCE(bal.TotalLeaves, 0.00) AS TotalLeaves,
        COALESCE(bal.Used, 0.00) AS Used,
        COALESCE(bal.Remaining, 0.00) AS Remaining,
        COALESCE(req.Approved, 0) AS Approved,
        COALESCE(req.Pending, 0) AS Pending,
        COALESCE(req.Rejected, 0) AS Rejected
    FROM `Staffs` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN (
        SELECT 
            StaffId,
            COUNT(1) AS TotalRequests,
            SUM(CASE WHEN Status = 2 THEN 1 ELSE 0 END) AS Approved,
            SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END) AS Pending,
            SUM(CASE WHEN Status = 3 THEN 1 ELSE 0 END) AS Rejected
        FROM `StaffLeaveRequests`
        WHERE IsActive = 1
          AND (v_AcademicYearId = 0 OR AcademicYearId = v_AcademicYearId)
        GROUP BY StaffId
    ) req ON req.StaffId = s.Id
    LEFT JOIN (
        SELECT 
            StaffId,
            SUM(TotalDays) AS TotalLeaves,
            SUM(UsedDays) AS Used,
            SUM(RemainingDays) AS Remaining
        FROM `StaffLeaveBalances`
        WHERE (v_AcademicYearId = 0 OR AcademicYearId = v_AcademicYearId)
        GROUP BY StaffId
    ) bal ON bal.StaffId = s.Id
    WHERE s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR s.DepartmentId = p_DepartmentId)
      AND (
          p_StaffType IS NULL OR p_StaffType = '' 
          OR (p_StaffType = 'Teaching' AND (s.StaffType IS NULL OR LOWER(s.StaffType) LIKE '%teach%' AND LOWER(s.StaffType) NOT LIKE '%non%'))
          OR (p_StaffType = 'Non-Teaching' AND LOWER(s.StaffType) LIKE '%non%')
      )
    ORDER BY s.FirstName ASC;
END //
DELIMITER ;


-- ----------------------------------------------------------------------------
-- PROCEDURE 11: sp_GetStaffLeaveRequests
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStaffLeaveRequests`;
DELIMITER //
CREATE PROCEDURE `sp_GetStaffLeaveRequests`(
    IN p_CampusId INT,
    IN p_StaffId INT,
    IN p_DepartmentId INT,
    IN p_Status INT
)
BEGIN
    SELECT 
        slr.StaffLeaveRequestId,
        slr.StaffId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(d.DepartmentName, 'Administration') AS Department,
        CASE 
            WHEN LOWER(COALESCE(s.StaffType, '')) LIKE '%non%' THEN 'Non-Teaching Staff'
            ELSE 'Teaching Staff'
        END AS StaffType,
        slr.LeaveType,
        slr.LeaveCategoryId,
        COALESCE(lc.CategoryName, 
            CASE slr.LeaveType
                WHEN 1 THEN 'Casual Leave'
                WHEN 2 THEN 'Sick Leave'
                WHEN 3 THEN 'Earned Leave'
                WHEN 4 THEN 'Maternity Leave'
                ELSE 'Other'
            END
        ) AS LeaveCategoryName,
        slr.StartDate,
        slr.EndDate,
        CAST((DATEDIFF(slr.EndDate, slr.StartDate) + 1) AS DECIMAL(5,2)) AS TotalDays,
        slr.Reason,
        slr.Status,
        slr.RejectionReason,
        slr.ApprovedByUserId,
        u.FullName AS ApprovedByUserName,
        slr.ApprovedAt,
        slr.CreatedAt
    FROM `StaffLeaveRequests` slr
    INNER JOIN `Staffs` s ON slr.StaffId = s.Id
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId OR slr.DepartmentId = d.DepartmentId
    LEFT JOIN `LeaveCategories` lc ON slr.LeaveCategoryId = lc.LeaveCategoryId
    LEFT JOIN `Users` u ON slr.ApprovedByUserId = u.UserId
    WHERE slr.IsActive = 1
      AND s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
      AND (p_StaffId IS NULL OR p_StaffId <= 0 OR slr.StaffId = p_StaffId)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR slr.DepartmentId = p_DepartmentId OR s.DepartmentId = p_DepartmentId)
      AND (p_Status IS NULL OR p_Status <= 0 OR slr.Status = p_Status)
    ORDER BY slr.CreatedAt DESC;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------
-- PROCEDURE 12: sp_GetStaffLeaveDetails
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStaffLeaveDetails`;
DELIMITER //
CREATE PROCEDURE `sp_GetStaffLeaveDetails`(
    IN p_StaffLeaveRequestId INT
)
BEGIN
    SELECT 
        slr.StaffLeaveRequestId,
        slr.StaffId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(s.EmployeeId, CONCAT('FAC', LPAD(s.Id, 3, '0'))) AS StaffCode,
        COALESCE(d.DepartmentName, 'Administration') AS Department,
        CASE 
            WHEN LOWER(COALESCE(s.StaffType, '')) LIKE '%non%' THEN 'Non-Teaching Staff'
            ELSE 'Teaching Staff'
        END AS StaffType,
        slr.LeaveType,
        slr.LeaveCategoryId,
        COALESCE(lc.CategoryName, 
            CASE slr.LeaveType
                WHEN 1 THEN 'Casual Leave'
                WHEN 2 THEN 'Sick Leave'
                WHEN 3 THEN 'Earned Leave'
                WHEN 4 THEN 'Maternity Leave'
                ELSE 'Other'
            END
        ) AS LeaveCategoryName,
        slr.StartDate,
        slr.EndDate,
        CAST((DATEDIFF(slr.EndDate, slr.StartDate) + 1) AS DECIMAL(5,2)) AS TotalDays,
        slr.Reason,
        slr.Status,
        slr.RejectionReason,
        slr.ApprovedByUserId,
        u.FullName AS ApprovedByUserName,
        slr.ApprovedAt,
        slr.CreatedAt,
        COALESCE(slb.TotalDays, 0.00) AS TotalBalance,
        COALESCE(slb.UsedDays, 0.00) AS UsedBalance,
        COALESCE(slb.RemainingDays, 0.00) AS RemainingBalance
    FROM `StaffLeaveRequests` slr
    INNER JOIN `Staffs` s ON slr.StaffId = s.Id
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId OR slr.DepartmentId = d.DepartmentId
    LEFT JOIN `LeaveCategories` lc ON slr.LeaveCategoryId = lc.LeaveCategoryId
    LEFT JOIN `Users` u ON slr.ApprovedByUserId = u.UserId
    LEFT JOIN `StaffLeaveBalances` slb ON slb.StaffId = slr.StaffId
                                      AND (
                                          (slr.LeaveCategoryId IS NOT NULL AND slb.LeaveCategoryId = slr.LeaveCategoryId)
                                          OR slb.LeaveType = slr.LeaveType
                                      )
                                      AND (slr.AcademicYearId IS NULL OR slb.AcademicYearId = slr.AcademicYearId)
    WHERE slr.StaffLeaveRequestId = p_StaffLeaveRequestId
    LIMIT 1;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------
-- PROCEDURE 13: sp_CreateStaffLeaveRequest
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CreateStaffLeaveRequest`;
DELIMITER //
CREATE PROCEDURE `sp_CreateStaffLeaveRequest`(
    IN p_StaffId INT,
    IN p_LeaveType TINYINT,
    IN p_LeaveCategoryId INT,
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_Reason VARCHAR(1000),
    IN p_DepartmentId INT,
    IN p_AcademicYearId INT,
    IN p_UserId INT
)
BEGIN
    DECLARE v_StaffId INT;
    DECLARE v_DepartmentId INT;
    DECLARE v_AcademicYearId INT;
    DECLARE v_LeaveCategoryId INT;
    DECLARE v_UserId INT;
    DECLARE v_RequestedDays DECIMAL(5,2);
    DECLARE v_RemainingDays DECIMAL(5,2);
    DECLARE v_NewId INT DEFAULT 0;

    -- Calculate requested duration
    SET v_RequestedDays = CAST((DATEDIFF(p_EndDate, p_StartDate) + 1) AS DECIMAL(5,2));

    -- Defensive Staff resolution
    SELECT Id, DepartmentId INTO v_StaffId, v_DepartmentId
    FROM `Staffs`
    WHERE Id = p_StaffId AND IsDeleted = 0
    LIMIT 1;

    IF v_StaffId IS NULL THEN
        SELECT Id, DepartmentId INTO v_StaffId, v_DepartmentId
        FROM `Staffs`
        WHERE IsDeleted = 0
        LIMIT 1;
    END IF;

    -- Defensive Department resolution
    IF p_DepartmentId IS NOT NULL AND p_DepartmentId > 0 THEN
        IF EXISTS (SELECT 1 FROM `Departments` WHERE DepartmentId = p_DepartmentId) THEN
            SET v_DepartmentId = p_DepartmentId;
        END IF;
    END IF;

    -- Defensive AcademicYear resolution
    IF p_AcademicYearId IS NOT NULL AND p_AcademicYearId > 0 THEN
        SELECT AcademicYearId INTO v_AcademicYearId
        FROM `AcademicYears`
        WHERE AcademicYearId = p_AcademicYearId
        LIMIT 1;
    END IF;

    IF v_AcademicYearId IS NULL THEN
        SELECT AcademicYearId INTO v_AcademicYearId
        FROM `AcademicYears`
        WHERE IsActive = 1
        ORDER BY AcademicYearId DESC
        LIMIT 1;
    END IF;

    -- Defensive LeaveCategory resolution
    IF p_LeaveCategoryId IS NOT NULL AND p_LeaveCategoryId > 0 THEN
        SELECT LeaveCategoryId INTO v_LeaveCategoryId
        FROM `LeaveCategories`
        WHERE LeaveCategoryId = p_LeaveCategoryId AND IsActive = 1
        LIMIT 1;
    END IF;

    -- Defensive User resolution
    IF p_UserId IS NOT NULL AND p_UserId > 0 THEN
        SELECT UserId INTO v_UserId
        FROM `Users`
        WHERE UserId = p_UserId
        LIMIT 1;
    END IF;

    -- Check Leave Balance if tracked
    SELECT RemainingDays INTO v_RemainingDays
    FROM `StaffLeaveBalances`
    WHERE StaffId = v_StaffId
      AND ((v_LeaveCategoryId IS NOT NULL AND LeaveCategoryId = v_LeaveCategoryId) OR LeaveType = p_LeaveType)
      AND (v_AcademicYearId IS NULL OR AcademicYearId = v_AcademicYearId)
    LIMIT 1;

    IF v_RemainingDays IS NOT NULL AND v_RemainingDays < v_RequestedDays THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient leave balance for the requested duration.';
    END IF;

    -- Insert Pending Leave Request
    INSERT INTO `StaffLeaveRequests` (
        StaffId, LeaveType, LeaveCategoryId, StartDate, EndDate, Reason,
        DepartmentId, AcademicYearId, Status, ApprovedByUserId, ApprovedAt,
        RejectionReason, IsActive, CreatedByUserId, CreatedAt
    ) VALUES (
        v_StaffId, p_LeaveType, v_LeaveCategoryId, p_StartDate, p_EndDate, p_Reason,
        v_DepartmentId, v_AcademicYearId, 1, NULL, NULL,
        NULL, 1, v_UserId, UTC_TIMESTAMP()
    );

    SET v_NewId = LAST_INSERT_ID();

    -- Return full created record
    CALL sp_GetStaffLeaveDetails(v_NewId);
END //
DELIMITER ;

-- ----------------------------------------------------------------------------
-- PROCEDURE 14: sp_ActionStaffLeaveRequest
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ActionStaffLeaveRequest`;
DELIMITER //
CREATE PROCEDURE `sp_ActionStaffLeaveRequest`(
    IN p_StaffLeaveRequestId INT,
    IN p_Status TINYINT,
    IN p_RejectionReason VARCHAR(500),
    IN p_UserId INT
)
BEGIN
    DECLARE v_StaffId INT;
    DECLARE v_OldStatus TINYINT;
    DECLARE v_StartDate DATE;
    DECLARE v_EndDate DATE;
    DECLARE v_Reason VARCHAR(1000);
    DECLARE v_LeaveType TINYINT;
    DECLARE v_LeaveCategoryId INT;
    DECLARE v_AcademicYearId INT;
    DECLARE v_CampusId INT DEFAULT 1;
    DECLARE v_DepartmentId INT;
    DECLARE v_StaffType TINYINT DEFAULT 1;
    DECLARE v_StaffTypeStr VARCHAR(50);
    DECLARE v_UserName VARCHAR(150) DEFAULT 'Admin';
    DECLARE v_RequestedDays DECIMAL(5,2);
    DECLARE v_CurDate DATE;
    DECLARE v_IsHoliday INT DEFAULT 0;
    DECLARE v_SessionId INT DEFAULT 0;
    DECLARE v_AttId INT DEFAULT 0;
    DECLARE v_OldAttStatus TINYINT DEFAULT NULL;

    -- Load existing leave request
    SELECT 
        slr.StaffId, slr.Status, slr.StartDate, slr.EndDate, slr.Reason,
        slr.LeaveType, slr.LeaveCategoryId, slr.AcademicYearId,
        COALESCE(s.CampusId, 1), s.DepartmentId, s.StaffType
    INTO 
        v_StaffId, v_OldStatus, v_StartDate, v_EndDate, v_Reason,
        v_LeaveType, v_LeaveCategoryId, v_AcademicYearId,
        v_CampusId, v_DepartmentId, v_StaffTypeStr
    FROM `StaffLeaveRequests` slr
    INNER JOIN `Staffs` s ON slr.StaffId = s.Id
    WHERE slr.StaffLeaveRequestId = p_StaffLeaveRequestId
    LIMIT 1;

    IF v_StaffId IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Leave request not found.';
    END IF;

    -- Resolve StaffType TINYINT
    IF LOWER(COALESCE(v_StaffTypeStr, '')) LIKE '%non%' THEN
        SET v_StaffType = 2;
    ELSE
        SET v_StaffType = 1;
    END IF;

    -- Calculate requested duration
    SET v_RequestedDays = CAST((DATEDIFF(v_EndDate, v_StartDate) + 1) AS DECIMAL(5,2));

    -- Resolve user name
    IF p_UserId IS NOT NULL AND p_UserId > 0 THEN
        SELECT FullName INTO v_UserName FROM `Users` WHERE UserId = p_UserId LIMIT 1;
    END IF;

    -- Case 1: REJECTION / REVOCATION (Status = 3)
    IF p_Status = 3 THEN
        UPDATE `StaffLeaveRequests`
        SET Status = 3,
            RejectionReason = p_RejectionReason,
            ApprovedByUserId = p_UserId,
            ApprovedAt = UTC_TIMESTAMP(),
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StaffLeaveRequestId = p_StaffLeaveRequestId;

        -- Audit entry for rejection
        INSERT INTO `AttendanceAuditHistories` (
            EntityType, EntityId, FacultyId, StudentId, AttendanceDate,
            Session, OldStatus, NewStatus, Action, ModifiedByUserId,
            ModifiedByUserName, CreatedAt, Description
        ) VALUES (
            'Staff', p_StaffLeaveRequestId, v_StaffId, NULL, v_StartDate,
            0, NULL, 0, 'REJECT', p_UserId,
            v_UserName, UTC_TIMESTAMP(), CONCAT('Leave Rejected: ', COALESCE(p_RejectionReason, ''))
        );

        -- Revert leave balance if this request was previously Approved
        IF v_OldStatus = 2 THEN
            UPDATE `StaffLeaveBalances`
            SET UsedDays = GREATEST(0, UsedDays - v_RequestedDays),
                RemainingDays = GREATEST(0, TotalDays - GREATEST(0, UsedDays - v_RequestedDays)),
                UpdatedAt = UTC_TIMESTAMP()
            WHERE StaffId = v_StaffId
              AND ((v_LeaveCategoryId IS NOT NULL AND LeaveCategoryId = v_LeaveCategoryId) OR LeaveType = v_LeaveType)
              AND (v_AcademicYearId IS NULL OR AcademicYearId = v_AcademicYearId);
        END IF;

    -- Case 2: APPROVAL (Status = 2)
    ELSEIF p_Status = 2 THEN
        UPDATE `StaffLeaveRequests`
        SET Status = 2,
            RejectionReason = NULL,
            ApprovedByUserId = p_UserId,
            ApprovedAt = UTC_TIMESTAMP(),
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StaffLeaveRequestId = p_StaffLeaveRequestId;

        -- Adjust leave balance if not previously approved
        IF v_OldStatus <> 2 THEN
            UPDATE `StaffLeaveBalances`
            SET UsedDays = UsedDays + v_RequestedDays,
                RemainingDays = GREATEST(0, RemainingDays - v_RequestedDays),
                UpdatedAt = UTC_TIMESTAMP()
            WHERE StaffId = v_StaffId
              AND ((v_LeaveCategoryId IS NOT NULL AND LeaveCategoryId = v_LeaveCategoryId) OR LeaveType = v_LeaveType)
              AND (v_AcademicYearId IS NULL OR AcademicYearId = v_AcademicYearId);
        END IF;

        -- Audit entry for approval
        INSERT INTO `AttendanceAuditHistories` (
            EntityType, EntityId, FacultyId, StudentId, AttendanceDate,
            Session, OldStatus, NewStatus, Action, ModifiedByUserId,
            ModifiedByUserName, CreatedAt, Description
        ) VALUES (
            'Staff', p_StaffLeaveRequestId, v_StaffId, NULL, v_StartDate,
            0, NULL, 2, 'APPROVE', p_UserId,
            v_UserName, UTC_TIMESTAMP(), CONCAT('Leave Approved: ', COALESCE(v_Reason, ''))
        );

        -- Synchronize daily staff attendance across leave date range
        SET v_CurDate = v_StartDate;
        WHILE v_CurDate <= v_EndDate DO
            -- Check Sunday or Holiday
            IF DAYOFWEEK(v_CurDate) <> 1 THEN
                -- Insert or update StaffAttendances as 'On Leave' (Status = 3)
                SELECT StaffAttendanceId INTO v_AttId
                FROM `StaffAttendances`
                WHERE StaffId = v_StaffId AND AttendanceDate = v_CurDate
                LIMIT 1;

                IF v_AttId > 0 THEN
                    UPDATE `StaffAttendances`
                    SET AttendanceStatus = 3,
                        Remarks = CONCAT('On Approved Leave: ', COALESCE(v_Reason, '')),
                        UpdatedAt = UTC_TIMESTAMP()
                    WHERE StaffAttendanceId = v_AttId;
                ELSE
                    INSERT INTO `StaffAttendances` (
                        CampusId, StaffId, StaffType, DepartmentId,
                        AttendanceDate, AttendanceStatus, InTime, OutTime,
                        ShiftCode, Remarks, CreatedByUserId, CreatedAt
                    ) VALUES (
                        v_CampusId, v_StaffId, v_StaffType, v_DepartmentId,
                        v_CurDate, 3, NULL, NULL,
                        'GEN', CONCAT('On Approved Leave: ', COALESCE(v_Reason, '')),
                        p_UserId, UTC_TIMESTAMP()
                    );
                END IF;
            END IF;
            SET v_CurDate = DATE_ADD(v_CurDate, INTERVAL 1 DAY);
        END WHILE;

    END IF;

    -- Return updated leave details
    CALL sp_GetStaffLeaveDetails(p_StaffLeaveRequestId);
END //
DELIMITER ;
